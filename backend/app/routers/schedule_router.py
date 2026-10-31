"""排班模块：独立路由。只读分数给建议，不由 Sidework 直接改排班。"""
import datetime

from fastapi import APIRouter, Depends, HTTPException
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


class TemplateIn(BaseModel):
    name_en: str
    name_zh: str = ""
    start_time: str  # HH:MM
    end_time: str = "closing"  # HH:MM 或 "closing"（到关门）
    role: str = "server"


@router.post("/templates")
def create_template(body: TemplateIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    import re

    if not re.match(r"^\d{2}:\d{2}$", body.start_time):
        raise HTTPException(status_code=400, detail="开始时间格式应为 HH:MM")
    if body.end_time != "closing" and not re.match(r"^\d{2}:\d{2}$", body.end_time):
        raise HTTPException(status_code=400, detail="结束时间应为 HH:MM 或 closing（到关门）")
    if body.end_time != "closing" and body.end_time <= body.start_time:
        raise HTTPException(status_code=400, detail="结束时间要晚于开始时间，到关门除外")
    name = body.name_en.strip()
    if body.name_zh.strip():
        name = f"{name} || {body.name_zh.strip()}"
    t = ShiftTemplate(name=name, start_time=body.start_time, end_time=body.end_time, role=body.role)
    db.add(t); db.commit(); db.refresh(t)
    return {"id": t.id, "name": t.name, "start_time": t.start_time, "end_time": t.end_time, "role": t.role}


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
                    "shift": tpl.name if tpl else "", "shift_template_id": s.shift_template_id,
                    "start_time": tpl.start_time if tpl else "",
                    "end_time": tpl.end_time if tpl else "", "date": str(s.date), "status": s.status})
    return out


@router.post("")
def create_schedule(body: ScheduleIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    s = Schedule(employee_id=body.employee_id, shift_template_id=body.shift_template_id, date=body.date, status="draft")
    db.add(s); db.commit(); db.refresh(s)
    return {"id": s.id, "status": s.status}


class SchedulePatch(BaseModel):
    shift_template_id: int


@router.patch("/{schedule_id}")
def update_schedule(schedule_id: int, body: SchedulePatch, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    """Excel 式格子编辑：点格子直接换班次，状态不变（已发布改完立刻生效，草稿改完仍是草稿）。"""
    s = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not s or s.status == "cancelled":
        raise HTTPException(status_code=404, detail="排班不存在或已取消")
    tpl = db.query(ShiftTemplate).filter(ShiftTemplate.id == body.shift_template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="班次不存在")
    s.shift_template_id = body.shift_template_id; db.commit()
    return {"id": s.id, "shift_template_id": s.shift_template_id, "status": s.status}


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    """格子里的 ×：取消该班次（留痕，员工端不再看到，可再加回来）。"""
    s = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="排班不存在")
    s.status = "cancelled"; db.commit()
    return {"id": s.id, "status": "cancelled"}


@router.post("/publish")
def publish(week_start: datetime.date, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    end = week_start + datetime.timedelta(days=7)
    rows = db.query(Schedule).filter(Schedule.date >= week_start, Schedule.date < end, Schedule.status == "draft").all()
    for r in rows:
        r.status = "published"
    db.commit()
    return {"published": len(rows)}


class ApplyIn(BaseModel):
    employee_id: int
    action: str  # keep / talk / minus_half_day / minus_one_day
    week_start: datetime.date | None = None
    date: datetime.date | None = None
    shift_id: int | None = None


@router.post("/suggestion/apply")
def apply_suggestion(body: ApplyIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    """采用建议 / 改后应用：只有经理点 Adopt 才会改排班表。

    keep / talk 不改排班；minus_half_day 取消 1 个班次；minus_one_day
    取消所选日期的全部班次。取消 = status 改为 cancelled（留痕，
    员工端不再看到，排班表不再显示），不是物理删除。
    """
    if body.action not in ("keep", "talk", "minus_half_day", "minus_one_day"):
        raise HTTPException(status_code=400, detail="action 只能是 keep / talk / minus_half_day / minus_one_day")
    if body.action in ("keep", "talk"):
        return {"employee_id": body.employee_id, "action": body.action, "cancelled": []}
    cancelled = []
    if body.action == "minus_one_day":
        if not body.date:
            raise HTTPException(status_code=400, detail="减一天请先选日期")
        rows = db.query(Schedule).filter(Schedule.employee_id == body.employee_id, Schedule.date == body.date,
                                         Schedule.status != "cancelled").all()
        for r in rows:
            r.status = "cancelled"; cancelled.append({"id": r.id, "date": str(r.date), "shift_template_id": r.shift_template_id})
    else:  # minus_half_day: 取消 1 个班次
        target = None
        if body.shift_id:
            target = db.query(Schedule).filter(Schedule.id == body.shift_id, Schedule.employee_id == body.employee_id,
                                               Schedule.status != "cancelled").first()
        elif body.date:
            target = db.query(Schedule).filter(Schedule.employee_id == body.employee_id, Schedule.date == body.date,
                                               Schedule.status != "cancelled").order_by(Schedule.id).first()
        elif body.week_start:
            end = body.week_start + datetime.timedelta(days=7)
            target = db.query(Schedule).filter(Schedule.employee_id == body.employee_id,
                                               Schedule.date >= body.week_start, Schedule.date < end,
                                               Schedule.status != "cancelled").order_by(Schedule.date.desc(), Schedule.id.desc()).first()
        if not target:
            raise HTTPException(status_code=400, detail="该员工在所选范围没有可减的班次")
        target.status = "cancelled"
        cancelled.append({"id": target.id, "date": str(target.date), "shift_template_id": target.shift_template_id})
    db.commit()
    return {"employee_id": body.employee_id, "action": body.action, "cancelled": cancelled}


@router.get("/suggestion")
def suggestion(day: datetime.date, lang: str = "en", db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    out = []
    for emp in db.query(Employee).filter(Employee.is_manager == False, Employee.is_active == True).all():  # noqa: E712
        s = score_for_day(db, emp.id, day)
        out.append({"employee_id": emp.id, "name": emp.name, **s, **suggestion_for_score(s["score"], done=s["done"], reviewed=s["reviewed"], lang=lang)})
    return out
