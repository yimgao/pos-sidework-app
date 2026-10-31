"""表现分：完成率 40% + 经理复核通过率 40% + 准时率 20%。

这是排班模块与 Sidework 模块唯一的交点：只读分数，不改排班。
"""
from sqlalchemy.orm import Session

from ..models import SideworkRecord, SideworkTemplate


def score_for_day(db: Session, employee_id: int, day) -> dict:
    templates = db.query(SideworkTemplate).filter(SideworkTemplate.is_active == True).all()  # noqa: E712
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


def rolling_score_14(db: Session, employee_id: int, end_day) -> dict:
    """14-day rolling score: mean of daily scores on days with any record.

    Days with no record at all are excluded (a day off is not a zero), so a
    new employee is never dragged down by days they were not scheduled.
    Returns no_record=True when the window has no records at all.
    """
    import datetime

    days = []
    for i in range(13, -1, -1):
        day = end_day - datetime.timedelta(days=i)
        s = score_for_day(db, employee_id, day)
        if s["done"] > 0 or s["reviewed"] > 0:
            days.append(s)
    if not days:
        return {"rolling_score": None, "days_with_records": 0, "no_record": True,
                "done": 0, "total": 0, "completion": None, "quality": None, "ontime": None}
    n = len(days)
    return {
        "rolling_score": round(sum(d["score"] for d in days) / n, 1),
        "days_with_records": n, "no_record": False,
        "done": sum(d["done"] for d in days), "total": sum(d["total"] for d in days),
        "completion": round(sum(d["completion"] for d in days) / n, 1),
        "quality": round(sum(d["quality"] for d in days) / n, 1),
        "ontime": round(sum(d["ontime"] for d in days) / n, 1),
    }


def _pick_title(title: str, lang: str) -> str:
    parts = str(title).split(" || ")
    if len(parts) == 2:
        return parts[1] if lang == "zh" else parts[0]
    return title


def suggestion_for_score(score: float, done: int = 0, reviewed: int = 0, lang: str = "en") -> dict:
    zh = lang == "zh"
    if done == 0 and reviewed == 0:
        return {"suggestion": "keep", "label": "暂无记录，正常排班" if zh else "No record yet, keep schedule"}
    if score < 70:
        return {"suggestion": "minus_half_day", "label": "建议减半天（少一个班次），经理终审" if zh else "Reduce by half day (one fewer shift), manager approval"}
    if score < 84:
        return {"suggestion": "talk", "label": "提醒谈话，本周先不减班" if zh else "Talk first, no reduction this week"}
    return {"suggestion": "keep", "label": "正常排班" if zh else "Keep schedule"}
