"""个人 AI 报告：员工做完上传后，经理/owner 看到的单人报告。

没配 AI key 时是规则版：做了哪些、没做哪些、哪里要提升；
配了 key 时同一份结构可再交给 AI 写一句话点评（本版先出规则版，
文字点评走 daily_report 的同一模型，不阻塞主流程）。
"""
import datetime

from sqlalchemy.orm import Session

from ..models import Employee, SideworkRecord, SideworkTemplate
from .scoring import _pick_title, rolling_score_14, score_for_day


def build_person_report(db: Session, employee_id: int, day, lang: str = "en") -> dict:
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        return {"error": "员工不存在"}
    zh = lang == "zh"
    s = score_for_day(db, employee_id, day)
    rolling = rolling_score_14(db, employee_id, day)
    done_titles, missed_titles = [], []
    recs = db.query(SideworkRecord).filter(
        SideworkRecord.employee_id == employee_id, SideworkRecord.date == day).all()
    by_tpl = {r.template_id: r for r in recs}
    templates = db.query(SideworkTemplate).filter(SideworkTemplate.is_active == True).all()  # noqa: E712
    for t in templates:
        r = by_tpl.get(t.id)
        name = _pick_title(t.title, lang)
        if r and r.status == "done":
            done_titles.append(name)
        elif not s.get("not_assigned"):
            missed_titles.append(name)
    improvements = []
    if s.get("failed"):
        improvements.append(("复核打回的项要重做：" if zh else "Failed items need redo: ") + "、".join(_pick_title(x, lang) for x in s["failed"]))
    if s.get("late_items"):
        improvements.append(("迟交的项下次提前做：" if zh else "Late items — start earlier next time: ") + "、".join(_pick_title(x, lang) for x in s["late_items"]))
    if missed_titles:
        improvements.append(("漏做的项：" if zh else "Missed items: ") + "、".join(missed_titles))
    if not improvements:
        improvements.append("全部完成，继续保持。" if lang == "zh" else "All done — keep it up.")
    zh = lang == "zh"
    return {
        "employee_id": emp.id, "name": emp.name, "date": str(day),
        "score": s.get("score"), "provisional": s.get("provisional", False),
        "not_assigned": s.get("not_assigned", False),
        "done": done_titles, "missed": missed_titles,
        "failed": [_pick_title(x, lang) for x in s.get("failed", [])],
        "late_items": [_pick_title(x, lang) for x in s.get("late_items", [])],
        "rolling_score": rolling.get("rolling_score"),
        "improvements": improvements,
        "summary": (f"{emp.name} 今天完成 {s.get('done', 0)}/{s.get('total', 0)} 项，"
                    f"分数 {s.get('score')} 分。" if zh else
                    f"{emp.name} completed {s.get('done', 0)}/{s.get('total', 0)} items today, "
                    f"score {s.get('score')}."),
    }
