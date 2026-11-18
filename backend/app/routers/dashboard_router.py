"""Owner / 经理 Dashboard：一屏看全店。"""
import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_manager
from ..database import get_db
from ..models import Employee, SideworkRecord, SideworkTemplate
from ..services.daily_report import build_daily_report
from ..services.email_report import send_daily_report
from ..services.person_report import build_person_report
from ..services.scoring import rolling_score_14, score_for_day, suggestion_for_score
from ..services.sms import send_sms
from .settings_router import get_setting

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
SEGMENTS = ["opening", "midday", "evening"]


@router.get("")
def dashboard(date: datetime.date | None = None, lang: str = "en",
              db: Session = Depends(get_db), user: Employee = Depends(require_manager)):
    day = date or datetime.date.today()
    staff = db.query(Employee).filter(Employee.is_manager == False, Employee.is_owner == False,
                                      Employee.is_active == True).all()  # noqa: E712
    people, total_done, total_items, late_n, pending_n, low_n = [], 0, 0, 0, 0, 0
    for e in staff:
        s = score_for_day(db, e.id, day)
        r = rolling_score_14(db, e.id, day)
        if s.get("not_assigned"):
            people.append({"id": e.id, "name": e.name, "role": e.role, "not_assigned": True,
                           "score": None, "done": 0, "total": 0, "late": 0,
                           "rolling": r.get("rolling_score")})
            continue
        total_done += s["done"]; total_items += s["total"]
        late_n += s["late"]; pending_n += s["pending_review"]
        if s["score"] is not None and s["score"] < 70:
            low_n += 1
        people.append({"id": e.id, "name": e.name, "role": e.role, "not_assigned": False,
                       "score": s["score"], "done": s["done"], "total": s["total"],
                       "late": s["late"], "pending_review": s["pending_review"],
                       "provisional": s["provisional"], "rolling": r.get("rolling_score"),
                       "suggestion": suggestion_for_score(s["score"], s["done"], s["reviewed"], lang)["label"]})
    by_segment = {}
    for seg in SEGMENTS:
        tpl = db.query(SideworkTemplate).filter(SideworkTemplate.is_active == True,  # noqa: E712
                                                SideworkTemplate.segment == seg).all()
        ids = {t.id for t in tpl}
        done = db.query(SideworkRecord).filter(SideworkRecord.date == day,
                                               SideworkRecord.status == "done",
                                               SideworkRecord.template_id.in_(ids)).count() if ids else 0
        by_segment[seg] = {"total": len(ids), "done": done,
                           "rate": round(done / len(ids) * 100, 1) if ids else None}
    timeline = []
    for rec in db.query(SideworkRecord).filter(SideworkRecord.date == day,
                                               SideworkRecord.status == "done").order_by(
            SideworkRecord.completed_at).all():
        emp = db.query(Employee).filter(Employee.id == rec.employee_id).first()
        tpl = db.query(SideworkTemplate).filter(SideworkTemplate.id == rec.template_id).first()
        timeline.append({"employee": emp.name if emp else "", "title": tpl.title if tpl else "",
                         "at": rec.completed_at.isoformat() if rec.completed_at else "",
                         "late": bool(rec.late)})
    scored = [p for p in people if p.get("score") is not None]
    leaderboard = sorted(scored, key=lambda p: (p.get("rolling") or p["score"]), reverse=True)
    watchlist = [p for p in scored if p["score"] < 70]
    manager_sees_reports = user.is_owner or get_setting(db, "manager_can_see_person_reports") == "true"
    person_reports = []
    if manager_sees_reports:
        for e in staff:
            person_reports.append(build_person_report(db, e.id, day, lang))
    return {
        "date": str(day), "manager_sees_person_reports": manager_sees_reports,
        "overview": {"completion": round(total_done / total_items * 100, 1) if total_items else None,
                     "done": total_done, "total": total_items, "late": late_n,
                     "pending_review": pending_n, "low_count": low_n,
                     "staff_count": len(staff)},
        "people": people, "by_segment": by_segment, "timeline": timeline,
        "leaderboard": [{"name": p["name"], "score": p.get("rolling") or p["score"]} for p in leaderboard[:3]],
        "watchlist": [{"name": p["name"], "score": p["score"]} for p in watchlist],
        "person_reports": person_reports,
    }


@router.post("/send-report")
def send_report(date: datetime.date | None = None, lang: str = "en",
                db: Session = Depends(get_db), user: Employee = Depends(require_manager)):
    day = date or datetime.date.today()
    data = build_daily_report(db, day, lang=lang)
    email = send_daily_report(data["summary_text"], str(day), lang=lang)
    sms = send_sms(data["summary_text"][:400])
    return {"date": str(day), "email": email, "sms": sms,
            "note": "邮件+短信都发了；没配的渠道只返回预览，不报错"}
