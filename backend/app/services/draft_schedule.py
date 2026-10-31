"""AI 起草排班（规则版解析器 + LLM 预留口子）。

现在没有接任何付费 AI 也能跑：按“员工 + 星期几 + 班次”拆一句话需求，
每条生成一个带理由的草稿条目。以后接 LLM 时，只需把 parse_requirement
换成 LLM 输出同样结构的 entries，审批关口（批准才生成 Schedule 草稿、
发布仍需经理点 Publish Week）保持不变。
"""
import datetime
import re

WEEKDAYS_EN = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
               "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
WEEKDAYS_ZH = {"周一": 0, "周二": 1, "周三": 2, "周四": 3, "周五": 4, "周六": 5, "周日": 6, "周天": 6}


def _find_weekdays(seg: str) -> list[int]:
    days = []
    low = seg.lower()
    for name, idx in WEEKDAYS_EN.items():
        if re.search(r"\b" + name + r"\b", low) and idx not in days:
            days.append(idx)
    for name, idx in WEEKDAYS_ZH.items():
        if name in seg and idx not in days:
            days.append(idx)
    return sorted(days)


def _find_shift(seg: str, templates) -> object:
    low = seg.lower()
    for t in templates:
        base = t.name.split(" || ")[0].strip().lower()
        if base and base in low:
            return t
    # 班次只叫名字（如 Lunch shift）：要求里只写 Lunch / Dinner 也要能认出来。
    for t in templates:
        base = t.name.split(" || ")[0].strip().lower()
        first = base.split()[0] if base else ""
        if first and re.search(r"\b" + re.escape(first) + r"\b", low):
            return t
    if "打烊" in seg or "收尾" in seg or "closing" in low:
        for t in templates:
            if "closing" in t.name.lower():
                return t
    if "午" in seg:
        for t in templates:
            if "lunch" in t.name.lower():
                return t
    if "晚" in seg or "dinner" in low:
        for t in templates:
            if "dinner" in t.name.lower():
                return t
    return None


def parse_requirement(db, requirement: str, week_start: datetime.date, lang: str = "en") -> dict:
    from ..models import Employee, ShiftTemplate

    zh = lang == "zh"
    employees = db.query(Employee).filter(Employee.is_manager == False, Employee.is_active == True).all()  # noqa: E712
    templates = db.query(ShiftTemplate).all()
    entries, warnings = [], []
    segments = [s.strip() for s in re.split(r"[,，;；\n]", requirement or "") if s.strip()]
    if not segments:
        warnings.append("没有读到任何要求，请写员工 + 星期几 + 班次，例如：Anna 周三 Dinner" if zh else
                        "No requirement found. Write employee + weekday + shift, e.g. Anna Wednesday Dinner")
        return {"entries": entries, "warnings": warnings}
    for seg in segments:
        emp = next((e for e in employees if e.name.lower() in seg.lower()), None)
        days = _find_weekdays(seg)
        shift = _find_shift(seg, templates)
        if not emp:
            warnings.append(f"没认出员工：{seg}" if zh else f"Employee not recognised: {seg}")
            continue
        if not days:
            warnings.append(f"{emp.name}：没写星期几，跳过：{seg}" if zh else f"{emp.name}: no weekday, skipped: {seg}")
            continue
        if not shift:
            warnings.append(f"{emp.name}：没写班次，跳过：{seg}" if zh else f"{emp.name}: no shift, skipped: {seg}")
            continue
        for d in days:
            date = week_start + datetime.timedelta(days=d)
            shift_name = shift.name.split(" || ")[1] if (zh and " || " in shift.name) else shift.name.split(" || ")[0]
            reason = f"按你的要求：{seg}" if zh else f"From your requirement: {seg}"
            entries.append({"employee_id": emp.id, "employee_name": emp.name,
                            "shift_template_id": shift.id, "shift": shift_name,
                            "date": str(date), "reason": reason})
    return {"entries": entries, "warnings": warnings}
