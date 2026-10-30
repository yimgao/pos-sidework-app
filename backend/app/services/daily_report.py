"""每日报告（规则版）：先按模板拼文字，视觉判照片是第二步，只标存疑。"""
from sqlalchemy.orm import Session

from ..models import Employee
from .scoring import score_for_day, suggestion_for_score


def build_daily_report(db: Session, day) -> dict:
    employees = db.query(Employee).filter(
        Employee.is_manager == False, Employee.is_active == True  # noqa: E712
    ).all()
    lines = [f"Sidework Daily Report Sidework 日报 - {day}", ""]
    total = done = 0
    per_employee = []
    for emp in employees:
        s = score_for_day(db, emp.id, day)
        total += s["total"]; done += s["done"]
        sug = suggestion_for_score(s["score"], done=s["done"], reviewed=s["reviewed"])
        per_employee.append({"employee_id": emp.id, "name": emp.name, **s, **sug})
        lines.append(
            f"- {emp.name}: {s['score']} points 分，Completed 完成 {s['done']}/{s['total']} items 项，"
            f"Approved 复核通过 {s['passed']}/{s['reviewed']} items 项。{sug['label']}"
        )
    rate = round(done / total * 100) if total else 0
    lines.insert(2, f"Today's overview 今日总览：Completion rate 完成率 {rate}% ({done}/{total} items 项)")
    missed = []
    for item in per_employee:
        missed.extend(item["missed"])
    lines.append("")
    lines.append("Missed items 漏做项：" + ("、".join(missed) if missed else "None 无"))
    lines.append("说明：演示/规则版报告；正式版每天打烊后自动生成并可发邮件给经理，分数按两周滚动分算。")
    return {"date": str(day), "summary_text": "\n".join(lines), "employees": per_employee}
