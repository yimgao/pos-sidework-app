"""通知：只由现有数据实时算出来，不存通知表、不编假数据。

来源（全部是真实记录）：
- 待复核：已完成、未复核的 sidework 记录（聚合一条）；
- 排班冲突：同一员工同一天、未取消的班次时间重叠（end_time "closing" 按 23:00 算）；
- 新 AI 建议：今天有分数、且建议不是"正常排班"的员工（score_for_day + suggestion_for_score）；
- 今日完成：今天已完成任务的员工（按人聚合一条）。
没有打卡数据，所以永远不会出现 "clocked in" 这类通知。
经理/owner 看全店；员工只看自己的。
"""
import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Employee, Schedule, ShiftTemplate, SideworkRecord
from ..services.scoring import score_for_day, suggestion_for_score

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

STR = {
    "en": {
        "review": "Tasks awaiting review",
        "review_body": "{n} completed task(s) waiting for manager review",
        "conflict": "Shift conflict detected",
        "conflict_body": "{name} is scheduled for overlapping hours on {date}",
        "suggestion": "New AI suggestion",
        "suggestion_body": "{name}: {label}",
        "complete": "Checklist complete",
        "complete_body": "{name} finished {n} task(s) today",
    },
    "zh": {
        "review": "有任务待复核",
        "review_body": "{n} 项已完成、等经理复核",
        "conflict": "发现排班冲突",
        "conflict_body": "{name} 在 {date} 有时间重叠的班次",
        "suggestion": "新的 AI 建议",
        "suggestion_body": "{name}：{label}",
        "complete": "清单已完成",
        "complete_body": "{name} 今天完成了 {n} 项",
    },
}


def _to_minutes(t: str) -> int:
    if not t or t == "closing":
        return 23 * 60
    try:
        h, m = t.split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return 23 * 60


@router.get("")
def notifications(lang: str = Query("en"), db: Session = Depends(get_db),
                  user: Employee = Depends(get_current_user)):
    s = STR.get(lang, STR["en"])
    today = datetime.date.today()
    is_mgr = bool(user.is_manager or user.is_owner)
    items = []

    def _mine(emp_id: int) -> bool:
        return is_mgr or emp_id == user.id

    # 1. 待复核（聚合一条，时间取最近一次完成时间）
    pending = db.query(SideworkRecord).filter(
        SideworkRecord.status == "done", SideworkRecord.review.is_(None)).all()
    pending = [r for r in pending if _mine(r.employee_id)]
    if pending:
        latest = max((r.completed_at for r in pending if r.completed_at), default=None)
        items.append({"id": "pending-review", "kind": "review",
                      "title": s["review"], "body": s["review_body"].format(n=len(pending)),
                      "time": latest.isoformat() if latest else ""})

    # 2. 排班冲突：未来 7 天内，同一人同一天两个未取消班次时间重叠
    tpl = {t.id: t for t in db.query(ShiftTemplate).all()}
    scheds = db.query(Schedule).filter(
        Schedule.date >= today, Schedule.date <= today + datetime.timedelta(days=6),
        Schedule.status != "cancelled").all()
    by_key: dict = {}
    for sc in scheds:
        if not _mine(sc.employee_id):
            continue
        by_key.setdefault((sc.employee_id, sc.date), []).append(sc)
    for (emp_id, day), rows in sorted(by_key.items()):
        rows = sorted(rows, key=lambda r: _to_minutes(tpl[r.shift_template_id].start_time))
        for i in range(len(rows)):
            for j in range(i + 1, len(rows)):
                a, b = tpl[rows[i].shift_template_id], tpl[rows[j].shift_template_id]
                if _to_minutes(a.start_time) < _to_minutes(b.end_time) and \
                        _to_minutes(b.start_time) < _to_minutes(a.end_time):
                    emp = db.query(Employee).filter(Employee.id == emp_id).first()
                    items.append({"id": f"conflict-{emp_id}-{day}", "kind": "conflict",
                                  "title": s["conflict"],
                                  "body": s["conflict_body"].format(
                                      name=emp.name if emp else "", date=str(day)),
                                  "time": ""})
                    break
            else:
                continue
            break

    # 3. 新 AI 建议 + 4. 今日完成（都按今天算）
    staff = db.query(Employee).filter(Employee.is_manager == False, Employee.is_owner == False).all()  # noqa: E712
    for emp in staff:
        if not _mine(emp.id):
            continue
        sc = score_for_day(db, emp.id, today)
        if sc.get("score") is not None:
            sug = suggestion_for_score(sc["score"], sc["done"], sc["reviewed"], lang)
            if sug["suggestion"] != "keep":
                items.append({"id": f"suggestion-{emp.id}-{today}", "kind": "suggestion",
                              "title": s["suggestion"],
                              "body": s["suggestion_body"].format(name=emp.name, label=sug["label"]),
                              "time": ""})
        done_today = db.query(SideworkRecord).filter(
            SideworkRecord.employee_id == emp.id, SideworkRecord.date == today,
            SideworkRecord.status == "done").all()
        if done_today:
            latest = max((r.completed_at for r in done_today if r.completed_at), default=None)
            items.append({"id": f"complete-{emp.id}-{today}", "kind": "complete",
                          "title": s["complete"],
                          "body": s["complete_body"].format(name=emp.name, n=len(done_today)),
                          "time": latest.isoformat() if latest else ""})
    # 有时间的在前（新的在前），没时间的在后；最多 20 条
    items.sort(key=lambda x: x["time"] or "", reverse=True)
    return items[:20]
