"""表现分：完成率 40% + 经理复核通过率 40% + 准时率 20%。

这是排班模块与 Sidework 模块唯一的交点：只读分数，不改排班。
"""
from sqlalchemy.orm import Session

from ..models import SideworkRecord, SideworkTemplate


def score_for_day(db: Session, employee_id: int, day) -> dict:
    templates = db.query(SideworkTemplate).all()
    total = len(templates)
    records = db.query(SideworkRecord).filter(
        SideworkRecord.employee_id == employee_id, SideworkRecord.date == day
    ).all()
    by_template = {r.template_id: r for r in records}
    done = sum(1 for r in records if r.status == "done")
    reviewed = [r for r in records if r.review]
    passed = sum(1 for r in reviewed if r.review == "pass")
    late = sum(1 for r in records if r.late)
    completion = (done / total * 100) if total else 0
    quality = (passed / len(reviewed) * 100) if reviewed else 100
    ontime = ((total - late) / total * 100) if total else 100
    score = completion * 0.4 + quality * 0.4 + ontime * 0.2
    missed = [t.title for t in templates if by_template.get(t.id) is None]
    return {
        "total": total, "done": done, "completion": round(completion, 1),
        "quality": round(quality, 1), "ontime": round(ontime, 1),
        "score": round(score, 1), "late": late,
        "reviewed": len(reviewed), "passed": passed, "missed": missed,
    }


def suggestion_for_score(score: float, done: int = 0, reviewed: int = 0) -> dict:
    if done == 0 and reviewed == 0:
        return {"suggestion": "keep", "label": "No record yet, keep schedule 暂无记录，正常排班"}
    if score < 70:
        return {"suggestion": "minus_half_day", "label": "Reduce by half day (one fewer shift), manager approval 建议减半天（少一个班次），经理终审"}
    if score < 84:
        return {"suggestion": "talk", "label": "Talk first, no reduction this week 提醒谈话，本周先不减班"}
    return {"suggestion": "keep", "label": "Keep schedule 正常排班"}
