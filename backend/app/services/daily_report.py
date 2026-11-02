"""每日报告 v2（2026-11-01 用户拍板）：固定顺序 分数 → 原因 → 建议 → 给员工的话。

- 只用两行总览开头；其余每人一段，只讲该员工自己的事实。
- 分数带分项拆解；有待复核项时标“暂定”，质量分尚未定型。
- 原因只写具体项名（漏做 / 复核没过 / 迟了），不写“态度”这类空话。
- 给员工的话只给该员工本人看的内容：只有他自己的事实，绝不写别人的
  分数，也不写减班决定（减班只在经理侧的建议里）。
- 给员工的话默认英文，附中文对照给经理参考。
"""
from sqlalchemy.orm import Session

from ..models import Employee
from .scoring import _pick_title, rolling_score_14, score_for_day, suggestion_for_score


def _employee_message(name: str, s: dict, sug: dict) -> tuple[str, str]:
    """返回 (英文, 中文对照)。模板固定，不编具体分数以外的事实。
    项名按语言分别切分，不把 "English || 中文" 原样塞进一句话里。"""
    missed = [_pick_title(m, "en") for m in s.get("missed", [])]
    failed = [_pick_title(m, "en") for m in s.get("failed", [])]
    missed_zh = [_pick_title(m, "zh") for m in s.get("missed", [])]
    failed_zh = [_pick_title(m, "zh") for m in s.get("failed", [])]
    if s.get("not_assigned"):
        return (f"Hi {name}, you had no sidework assigned today — nothing to report. Thank you!",
                f"{name}，你好，今天没有分给你 sidework，不用汇报，辛苦了。")
    if not missed and not failed:
        en = f"Great work today, {name} — you completed all your sidework on time. Thank you!"
        zh = f"{name}，你好，今天的 sidework 全部按时完成了，做得很好，辛苦了。"
    elif sug.get("suggestion") == "minus_half_day":
        bits = []
        if missed:
            bits.append("missed: " + ", ".join(missed))
        if failed:
            bits.append("did not pass review: " + ", ".join(failed))
        en = (f"Hi {name}, today a few items need attention — {'; '.join(bits)}. "
              "Let's go over them together tomorrow so nothing is missed. Thank you for your work today.")
        zh_bits = []
        if missed_zh:
            zh_bits.append("漏做：" + "、".join(missed_zh))
        if failed_zh:
            zh_bits.append("复核没过：" + "、".join(failed_zh))
        zh = (f"{name}，你好，今天有几项需要注意——{'；'.join(zh_bits)}。"
              "明天我们一起过一遍，确保不再漏。今天辛苦了。")
    else:
        bits = []
        if missed:
            bits.append("missed: " + ", ".join(missed))
        if failed:
            bits.append("did not pass review: " + ", ".join(failed))
        en = (f"Hi {name}, today a few items were {'; '.join(bits)}. "
              "Please double-check the checklist tomorrow so nothing is missed. Thank you!")
        zh_bits = []
        if missed_zh:
            zh_bits.append("漏做：" + "、".join(missed_zh))
        if failed_zh:
            zh_bits.append("复核没过：" + "、".join(failed_zh))
        zh = (f"{name}，你好，今天有几项{'；'.join(zh_bits)}，"
              "明天请对照清单再检查一遍，不要漏。今天辛苦了。")
    return en, zh


def build_daily_report(db: Session, day, lang: str = "en") -> dict:
    zh = lang == "zh"
    employees = db.query(Employee).filter(
        Employee.is_manager == False, Employee.is_active == True  # noqa: E712
    ).all()
    per_employee = []
    total = done = pending_review = 0
    for emp in employees:
        s = score_for_day(db, emp.id, day)
        sug = suggestion_for_score(s["score"], done=s["done"], reviewed=s["reviewed"], lang=lang)
        reasons = []
        if s.get("not_assigned"):
            reasons.append("今日未分配 sidework" if zh else "No sidework assigned today")
        else:
            if s["missed"]:
                reasons.append(("漏做：" + "、".join(_pick_title(m, lang) for m in s["missed"])) if zh else
                               ("Missed: " + ", ".join(_pick_title(m, lang) for m in s["missed"])))
            if s["failed"]:
                reasons.append(("复核没过：" + "、".join(_pick_title(m, lang) for m in s["failed"])) if zh else
                               ("Failed review: " + ", ".join(_pick_title(m, lang) for m in s["failed"])))
            if s["late_items"]:
                reasons.append(("迟交：" + "、".join(_pick_title(m, lang) for m in s["late_items"])) if zh else
                               ("Late: " + ", ".join(_pick_title(m, lang) for m in s["late_items"])))
            if not reasons:
                reasons.append("全部按时完成" if zh else "All completed on time")
            if s["pending_review"]:
                reasons.append((f"待复核 {s['pending_review']} 项，分数暂定") if zh else
                               (f"{s['pending_review']} item(s) pending review, score provisional"))
        msg_en, msg_zh = _employee_message(emp.name, s, sug)
        r = rolling_score_14(db, emp.id, day)
        roll = ("暂无 14 天记录" if r["no_record"] else
                f"14 天滚动 {r['rolling_score']} 分（{r['days_with_records']} 天有记录）") if zh else \
               ("No 14-day record" if r["no_record"] else
                f"14-day rolling {r['rolling_score']} points ({r['days_with_records']} days with records)")
        per_employee.append({
            "employee_id": emp.id, "name": emp.name, **s,
            "reasons": reasons, "rolling_text": roll,
            "employee_message_en": msg_en, "employee_message_zh": msg_zh, **sug,
        })
        if not s.get("not_assigned"):
            total += s["total"]; done += s["done"]; pending_review += s["pending_review"]

    rate = round(done / total * 100) if total else 0
    lines = [
        f"Sidework 日报 - {day}" if zh else f"Sidework Daily Report - {day}",
        (f"今日总览：完成率 {rate}%（{done}/{total} 项），待复核 {pending_review} 项" if zh else
         f"Today's overview: Completion rate {rate}% ({done}/{total} items), {pending_review} item(s) pending review"),
        "",
    ]
    for item in per_employee:
        if item.get("not_assigned"):
            lines.append(f"- {item['name']}：今日未分配，不计分" if zh else
                         f"- {item['name']}: Not assigned today, not scored")
            lines.append(f"  给员工的话：{item['employee_message_zh']}" if zh else f"  Message to employee: {item['employee_message_en']}")
            continue
        prov = "（暂定）" if item["provisional"] else ""
        if zh:
            lines.append(f"- {item['name']}：{item['score']} 分{prov}（完成 {item['completion']}%×40% + 复核通过 {item['quality']}%×40% + 准时 {item['ontime']}%×20%，"
                         f"完成 {item['done']}/{item['total']} 项，复核通过 {item['passed']}/{item['reviewed']} 项；{item['rolling_text']}）")
        else:
            lines.append(f"- {item['name']}: {item['score']} points{' (provisional)' if item['provisional'] else ''} "
                         f"(Completion {item['completion']}%×40% + Approval {item['quality']}%×40% + On-time {item['ontime']}%×20%, "
                         f"Completed {item['done']}/{item['total']} items, Approved {item['passed']}/{item['reviewed']} items; {item['rolling_text']})")
        lines.append(f"  原因：{'；'.join(item['reasons'])}" if zh else f"  Why: {'; '.join(item['reasons'])}")
        lines.append(f"  建议：{item['label']}" if zh else f"  Suggestion: {item['label']}")
        lines.append(f"  给员工的话：{item['employee_message_zh']}" if zh else f"  Message to employee: {item['employee_message_en']}")
        other = item['employee_message_en'] if zh else item['employee_message_zh']
        lines.append(f"  （对照：{other}）" if zh else f"  (Reference: {other})")
    return {"date": str(day), "summary_text": "\n".join(lines), "employees": per_employee}
