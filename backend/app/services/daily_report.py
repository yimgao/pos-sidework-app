"""每日报告（规则版）：先按模板拼文字，视觉判照片是第二步，只标存疑。"""
from sqlalchemy.orm import Session

from ..models import Employee
from .scoring import _pick_title, score_for_day, suggestion_for_score


def build_daily_report(db: Session, day, lang: str = "en") -> dict:
    zh = lang == "zh"
    employees = db.query(Employee).filter(
        Employee.is_manager == False, Employee.is_active == True  # noqa: E712
    ).all()
    lines = [f"Sidework 日报 - {day}" if zh else f"Sidework Daily Report - {day}", ""]
    total = done = 0
    per_employee = []
    for emp in employees:
        s = score_for_day(db, emp.id, day)
        total += s["total"]; done += s["done"]
        sug = suggestion_for_score(s["score"], done=s["done"], reviewed=s["reviewed"], lang=lang)
        per_employee.append({"employee_id": emp.id, "name": emp.name, **s, **sug})
        if zh:
            lines.append(f"- {emp.name}：{s['score']} 分，完成 {s['done']}/{s['total']} 项，复核通过 {s['passed']}/{s['reviewed']} 项。{sug['label']}")
        else:
            lines.append(f"- {emp.name}: {s['score']} points, Completed {s['done']}/{s['total']} items, Approved {s['passed']}/{s['reviewed']} items. {sug['label']}")
    rate = round(done / total * 100) if total else 0
    lines.insert(2, f"今日总览：完成率 {rate}%（{done}/{total} 项）" if zh else f"Today's overview: Completion rate {rate}% ({done}/{total} items)")
    missed = []
    for item in per_employee:
        missed.extend(_pick_title(m, lang) for m in item["missed"])
    lines.append("")
    lines.append(("漏做项：" + ("、".join(missed) if missed else "无")) if zh else ("Missed items: " + (", ".join(missed) if missed else "None")))
    lines.append("说明：演示/规则版报告；正式版每天打烊后自动生成并可发邮件给经理，分数按两周滚动分算。" if zh else "Note: demo / rule-based report; the full version generates automatically after closing and can be emailed to the manager, using a 14-day rolling score.")
    return {"date": str(day), "summary_text": "\n".join(lines), "employees": per_employee}
