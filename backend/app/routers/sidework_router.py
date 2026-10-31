"""Sidework 模块：清单、提交、照片/视频证据。独立于排班模块。

经理可增删任务（删 = 停用，历史记录保留），任务按 A / B / C / D 分组；
经理每天把任务匹配给上班的员工，员工今日只看自己被分配的项。
"""
import datetime
import os
import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_manager
from ..database import get_db
from ..models import Employee, Schedule, SideworkAssignment, SideworkRecord, SideworkTemplate

router = APIRouter(prefix="/api/sidework", tags=["sidework"])
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".mp4", ".webm", ".mov"}
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _tpl_out(t: SideworkTemplate):
    return {"id": t.id, "category": t.category, "role": t.role, "title": t.title,
            "requires_photo": t.requires_photo, "group_letter": t.group_letter or "A",
            "sort_order": t.sort_order, "is_active": bool(t.is_active)}


@router.get("/templates")
def templates(db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    return [_tpl_out(t) for t in db.query(SideworkTemplate).filter(SideworkTemplate.is_active == True)  # noqa: E712
            .order_by(SideworkTemplate.group_letter, SideworkTemplate.sort_order).all()]


class TemplateIn(BaseModel):
    title_en: str
    title_zh: str = ""
    group_letter: str = "A"
    requires_photo: bool = False


@router.post("/templates")
def create_template(body: TemplateIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    if body.group_letter not in ("A", "B", "C", "D", "E"):
        raise HTTPException(status_code=400, detail="分组只能是 A / B / C / D / E")
    title = body.title_en.strip()
    if body.title_zh.strip():
        title = f"{title} || {body.title_zh.strip()}"
    max_order = db.query(SideworkTemplate).filter(SideworkTemplate.group_letter == body.group_letter).count()
    t = SideworkTemplate(category="custom", role="all", title=title, requires_photo=body.requires_photo,
                         sort_order=max_order + 1, group_letter=body.group_letter, is_active=True)
    db.add(t); db.commit(); db.refresh(t)
    return _tpl_out(t)


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    t = db.query(SideworkTemplate).filter(SideworkTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="任务不存在")
    t.is_active = False; db.commit()
    return {"id": t.id, "is_active": False}


@router.get("/scheduled")
def scheduled(date: datetime.date | None = None, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    day = date or datetime.date.today()
    on_shift = {s.employee_id for s in db.query(Schedule).filter(
        Schedule.date == day, Schedule.status != "cancelled").all()}
    return [{"id": e.id, "name": e.name, "on_shift": e.id in on_shift}
            for e in db.query(Employee).filter(Employee.is_manager == False, Employee.is_active == True).all()]  # noqa: E712


class AssignIn(BaseModel):
    employee_id: int
    date: datetime.date
    template_ids: list[int] = []


@router.get("/assignments")
def list_assignments(date: datetime.date | None = None, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    day = date or datetime.date.today()
    out = []
    for a in db.query(SideworkAssignment).filter(SideworkAssignment.date == day).all():
        tpl = db.query(SideworkTemplate).filter(SideworkTemplate.id == a.template_id).first()
        emp = db.query(Employee).filter(Employee.id == a.employee_id).first()
        if tpl and tpl.is_active:
            out.append({"id": a.id, "employee_id": a.employee_id, "employee_name": emp.name if emp else "",
                        "template_id": a.template_id, "title": tpl.title, "group_letter": tpl.group_letter or "A"})
    return out


@router.post("/assignments")
def save_assignments(body: AssignIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    db.query(SideworkAssignment).filter(SideworkAssignment.employee_id == body.employee_id,
                                        SideworkAssignment.date == body.date).delete()
    for tid in body.template_ids:
        tpl = db.query(SideworkTemplate).filter(SideworkTemplate.id == tid, SideworkTemplate.is_active == True).first()  # noqa: E712
        if tpl:
            db.add(SideworkAssignment(employee_id=body.employee_id, template_id=tid, date=body.date, assigned_by=manager.id))
    db.commit()
    return {"employee_id": body.employee_id, "date": str(body.date), "assigned": len(body.template_ids)}


@router.get("/my/today")
def my_today(db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    today = datetime.date.today()
    templates = db.query(SideworkTemplate).filter(SideworkTemplate.is_active == True)  # noqa: E712
    templates = templates.order_by(SideworkTemplate.group_letter, SideworkTemplate.sort_order).all()
    # 当天只要有人被分配，就按分配走；没人被分配时回落到全部清单。
    any_assigned = db.query(SideworkAssignment).filter(SideworkAssignment.date == today).count() > 0
    if any_assigned:
        mine = {a.template_id for a in db.query(SideworkAssignment).filter(
            SideworkAssignment.employee_id == user.id, SideworkAssignment.date == today).all()}
        templates = [t for t in templates if t.id in mine]
    records = {r.template_id: r for r in db.query(SideworkRecord).filter(
        SideworkRecord.employee_id == user.id, SideworkRecord.date == today).all()}
    out = []
    for t in templates:
        r = records.get(t.id)
        out.append({"template_id": t.id, "category": t.category, "title": t.title, "requires_photo": t.requires_photo,
                    "group_letter": t.group_letter or "A",
                    "record_id": r.id if r else None, "status": r.status if r else "pending",
                    "note": r.note if r else "", "photo_url": ("/uploads/" + r.photo_path) if r and r.photo_path else "",
                    "file_name": r.file_name if r else "", "review": r.review if r else "",
                    "review_note": r.review_note if r else "", "late": bool(r.late) if r else False})
    return {"date": str(today), "items": out, "assigned_mode": any_assigned}


@router.post("/complete")
async def complete(template_id: int = Form(...), note: str = Form(""),
                    file: UploadFile | None = File(None),
                    db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    tpl = db.query(SideworkTemplate).filter(SideworkTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="任务不存在")
    today = datetime.date.today()
    rec = db.query(SideworkRecord).filter(
        SideworkRecord.employee_id == user.id, SideworkRecord.template_id == template_id,
        SideworkRecord.date == today).first()
    if not rec:
        rec = SideworkRecord(employee_id=user.id, template_id=template_id, date=today)
        db.add(rec)
    photo_path = None
    if file is not None:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(status_code=400, detail="只支持 jpg/png/mp4/webm/mov")
        folder = os.path.join(BASE_DIR, "uploads", str(today))
        os.makedirs(folder, exist_ok=True)
        name = f"{user.id}_{template_id}_{secrets.token_hex(8)}{ext}"
        dest = os.path.join(folder, name)
        data = await file.read()
        if len(data) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="文件超过 50MB")
        with open(dest, "wb") as f:
            f.write(data)
        photo_path = f"{today}/{name}"
        rec.file_name = file.filename
    if tpl.requires_photo and not photo_path and not rec.photo_path:
        raise HTTPException(status_code=400, detail="这项是必传项，请先传照片或视频")
    if photo_path:
        rec.photo_path = photo_path
    rec.status = "done"; rec.note = note; rec.completed_at = datetime.datetime.now()
    db.commit()
    return {"record_id": rec.id, "status": rec.status}
