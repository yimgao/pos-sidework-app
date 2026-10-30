"""排班模块：独立路由。只读分数给建议，不由 Sidework 直接改排班。"""
import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_manager
from ..database import get_db
from ..models import Employee, Schedule, ShiftTemplate
from ..services.scoring import score_for_day, suggestion_for_score

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


class ScheduleIn(BaseModel):
    employee_id: int
    shift_template_id: int
    date: datetime.date


@router.get("/templates")
def templates(db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    return [{"id": t.id, "name": t.name, "start_time": t.start_time, "end_time": t.end_time, "role": t.role}
            for t in db.query(ShiftTemplate).all()]


@router.get("")
def list_schedule(week_start: datetime.date, db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    end = week_start + datetime.timedelta(days=7)
    q = db.query(Schedule).filter(Schedule.date >= week_start, Schedule.date < end)
    if not user.is_manager:
        q = q.filter(Schedule.employee_id == user.id, Schedule.status == "published")
    out = []
    for s in q.all():
        tpl = db.query(ShiftTemplate).filter(ShiftTemplate.id == s.shift_template_id).first()
        emp = db.query(Employee).filter(Employee.id == s.employee_id).first()
        out.append({"id": s.id, "employee_id": s.employee_id, "employee_name": emp.name if emp else "",
                    "shift": tpl.name if tpl else "", "date": str(s.date), "status": s.status})
    return out


@router.post("")
def create_schedule(body: ScheduleIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    s = Schedule(employee_id=body.employee_id, shift_template_id=body.shift_template_id, date=body.date, status="draft")
    db.add(s); db.commit(); db.refresh(s)
    return {"id": s.id, "status": s.status}


@router.post("/publish")
def publish(week_start: datetime.date, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    end = week_start + datetime.timedelta(days=7)
    rows = db.query(Schedule).filter(Schedule.date >= week_start, Schedule.date < end, Schedule.status == "draft").all()
    for r in rows:
        r.status = "published"
    db.commit()
    return {"published": len(rows)}


@router.get("/suggestion")
def suggestion(day: datetime.date, lang: str = "en", db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    out = []
    for emp in db.query(Employee).filter(Employee.is_manager == False, Employee.is_active == True).all():  # noqa: E712
        s = score_for_day(db, emp.id, day)
        out.append({"employee_id": emp.id, "name": emp.name, **s, **suggestion_for_score(s["score"], done=s["done"], reviewed=s["reviewed"], lang=lang)})
    return out
