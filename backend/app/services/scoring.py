"""表现分：完成率 40% + 经理复核通过率 40% + 准时率 20%。

这是排班模块与 Sidework 模块唯一的交点：只读分数，不改排班。
"""
from sqlalchemy.orm import Session

from ..models import SideworkAssignment, SideworkRecord, SideworkTemplate


def score_for_day(db: Session, employee_id: int, day) -> dict:
    """当日分数。分母规则（2026-11-01 用户拍板修）：
    - 当天没有任何分配：分母 = 全部在用清单（老行为）。
    - 当天有人被分配：分母 = 只算分给该员工的项；当天没被分配的员工
      不计分（score=None、not_assigned=True），绝不按 0 分或按全清单算。
    """
    all_active = db.query(SideworkTemplate).filter(SideworkTemplate.is_active == True).all()  # noqa: E712
    any_assignments = db.query(SideworkAssignment).filter(SideworkAssignment.date == day).first() is not None
    if any_assignments:
        assigned_ids = {a.template_id for a in db.query(SideworkAssignment).filter(
            SideworkAssignment.employee_id == employee_id, SideworkAssignment.date == day).all()}
        if not assigned_ids:
            return {
                "total": 0, "done": 0, "completion": None, "quality": None, "ontime": None,
                "score": None, "late": 0, "reviewed": 0, "passed": 0, "missed": [],
                "failed": [], "late_items": [], "pending_review": 0, "provisional": False,
                "assigned_mode": True, "not_assigned": True,
            }
        templates = [t for t in all_active if t.id in assigned_ids]
    else:
        templates = all_active
    total = len(templates)
    tpl_ids = {t.id for t in templates}
    records = [r for r in db.query(SideworkRecord).filter(
        SideworkRecord.employee_id == employee_id, SideworkRecord.date == day
    ).all() if r.template_id in tpl_ids]
    by_template = {r.template_id: r for r in records}
    title_by_id = {t.id: t.title for t in templates}
    done = sum(1 for r in records if r.status == "done")
    reviewed = [r for r in records if r.review]
    passed = sum(1 for r in reviewed if r.review == "pass")
    late = sum(1 for r in records if r.late)
    completion = (done / total * 100) if total else 0
    quality = (passed / len(reviewed) * 100) if reviewed else 100
    ontime = ((total - late) / total * 100) if total else 100
    score = completion * 0.4 + quality * 0.4 + ontime * 0.2
    missed = [t.title for t in templates if by_template.get(t.id) is None or by_template[t.id].status != "done"]
    failed = [title_by_id[r.template_id] for r in records if r.review == "fail"]
    late_items = [title_by_id[r.template_id] for r in records if r.late]
    pending_review = sum(1 for r in records if r.status == "done" and not r.review)
    return {
        "total": total, "done": done, "completion": round(completion, 1),
        "quality": round(quality, 1), "ontime": round(ontime, 1),
        "score": round(score, 1), "late": late,
        "reviewed": len(reviewed), "passed": passed, "missed": missed,
        "failed": failed, "late_items": late_items, "pending_review": pending_review,
        "provisional": pending_review > 0,
        "assigned_mode": any_assignments, "not_assigned": False,
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


def suggestion_for_score(score: float | None, done: int = 0, reviewed: int = 0, lang: str = "en") -> dict:
    zh = lang == "zh"
    if score is None:
        return {"suggestion": "keep", "label": "今日未分配，不计分" if zh else "Not assigned today, not scored"}
    if done == 0 and reviewed == 0:
        return {"suggestion": "keep", "label": "暂无记录，正常排班" if zh else "No record yet, keep schedule"}
    if score < 70:
        return {"suggestion": "minus_half_day", "label": "建议减半天（少一个班次），经理终审" if zh else "Reduce by half day (one fewer shift), manager approval"}
    if score < 84:
        return {"suggestion": "talk", "label": "提醒谈话，本周先不减班" if zh else "Talk first, no reduction this week"}
    return {"suggestion": "keep", "label": "正常排班" if zh else "Keep schedule"}
