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
from ..photo_url import photo_url
from ..services.blob_upload import upload_to_blob
from ..database import get_db
from ..models import Employee, Schedule, SideworkAssignment, SideworkPhoto, SideworkRecord, SideworkTemplate

router = APIRouter(prefix="/api/sidework", tags=["sidework"])
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".mp4", ".webm", ".mov"}
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def _save_upload(file: UploadFile, name_prefix: str, today: datetime.date) -> str:
    """存一张上传文件（Blob 优先，否则本地 uploads），返回 photo_path。"""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="只支持 jpg/png/mp4/webm/mov")
    name = f"{name_prefix}_{secrets.token_hex(8)}{ext}"
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件超过 50MB")
    blob_url = upload_to_blob(data, name, file.content_type or "")
    if blob_url:
        return blob_url
    folder = os.path.join(BASE_DIR, "uploads", str(today))
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, name), "wb") as f:
        f.write(data)
    return f"{today}/{name}"


def _photo_out(p: SideworkPhoto):
    return {"url": photo_url(p.photo_path), "file_name": p.file_name or ""}


def _record_photos(db: Session, rec: SideworkRecord):
    """一条完成记录的全部照片；老记录没有 SideworkPhoto 行时用 photo_path 顶一张。"""
    rows = db.query(SideworkPhoto).filter(SideworkPhoto.record_id == rec.id).order_by(SideworkPhoto.id).all()
    if rows:
        return [_photo_out(p) for p in rows]
    if rec.photo_path:
        return [{"url": photo_url(rec.photo_path), "file_name": rec.file_name or ""}]
    return []


def _tpl_out(t: SideworkTemplate):
    return {"id": t.id, "category": t.category, "role": t.role, "title": t.title,
            "requires_photo": t.requires_photo, "group_letter": t.group_letter or "A",
            "sort_order": t.sort_order, "is_active": bool(t.is_active),
            "standard": t.standard or "", "segment": t.segment or "opening",
            "optional": bool(t.optional),
            "standard_photo_url": photo_url(t.standard_photo_path) if t.standard_photo_path else ""}


@router.get("/templates")
def templates(db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    return [_tpl_out(t) for t in db.query(SideworkTemplate).filter(SideworkTemplate.is_active == True)  # noqa: E712
            .order_by(SideworkTemplate.group_letter, SideworkTemplate.sort_order).all()]


class TemplateIn(BaseModel):
    title_en: str
    title_zh: str = ""
    group_letter: str = "A"
    requires_photo: bool = False
    standard: str = ""
    segment: str = "opening"
    optional: bool = False
    role: str = "all"


@router.post("/templates")
def create_template(body: TemplateIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    if body.group_letter not in ("A", "B", "C", "D", "E"):
        raise HTTPException(status_code=400, detail="分组只能是 A / B / C / D / E")
    title = body.title_en.strip()
    if not title:
        raise HTTPException(status_code=400, detail="任务名不能为空")
    if body.title_zh.strip():
        title = f"{title} || {body.title_zh.strip()}"
    if body.segment not in ("opening", "midday", "evening"):
        raise HTTPException(status_code=400, detail="时段只能是 opening / midday / evening")
    # 序号取组内最大值 + 1（不能用 count + 1：停用的任务会让序号重复）。
    from sqlalchemy import func as _func
    max_order = db.query(_func.max(SideworkTemplate.sort_order)).filter(
        SideworkTemplate.group_letter == body.group_letter).scalar() or 0
    t = SideworkTemplate(category="custom", role=body.role or "all", title=title, requires_photo=body.requires_photo,
                         sort_order=max_order + 1, group_letter=body.group_letter, is_active=True,
                         standard=body.standard.strip(), segment=body.segment, optional=body.optional)
    db.add(t); db.commit(); db.refresh(t)
    return _tpl_out(t)


@router.post("/templates/{template_id}/standard-photo")
async def upload_standard_photo(template_id: int, file: UploadFile = File(...),
                                db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    """经理给任务传一张标准参考图（"应该做成这样"），员工做任务时在最上面看到。"""
    t = db.query(SideworkTemplate).filter(SideworkTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="任务不存在")
    if not (file.filename or "").strip():
        raise HTTPException(status_code=400, detail="请选择一张图片")
    t.standard_photo_path = await _save_upload(file, f"std_{template_id}", datetime.date.today())
    db.commit(); db.refresh(t)
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
    # 当天只要有人被分配，就按分配走；没人被分配时回落到全部清单（只看自己岗位的）。
    any_assigned = db.query(SideworkAssignment).filter(SideworkAssignment.date == today).count() > 0
    if any_assigned:
        mine = {a.template_id for a in db.query(SideworkAssignment).filter(
            SideworkAssignment.employee_id == user.id, SideworkAssignment.date == today).all()}
        templates = [t for t in templates if t.id in mine]
    else:
        templates = [t for t in templates if (t.role or "all") in ("all", user.role)]
    records = {r.template_id: r for r in db.query(SideworkRecord).filter(
        SideworkRecord.employee_id == user.id, SideworkRecord.date == today).all()}
    out = []
    for t in templates:
        r = records.get(t.id)
        out.append({"template_id": t.id, "category": t.category, "title": t.title, "requires_photo": t.requires_photo,
                    "standard": t.standard or "", "segment": t.segment or "opening",
                    "optional": bool(t.optional), "role": t.role or "all",
                    "group_letter": t.group_letter or "A",
                    "standard_photo_url": photo_url(t.standard_photo_path) if t.standard_photo_path else "",
                    "record_id": r.id if r else None, "status": r.status if r else "pending",
                    "note": r.note if r else "",
                    "photos": _record_photos(db, r) if r else [],
                    "photo_url": photo_url(r.photo_path) if r and r.photo_path else "",
                    "file_name": r.file_name if r else "", "review": r.review if r else "",
                    "review_note": r.review_note if r else "", "late": bool(r.late) if r else False,
                    "completed_at": r.completed_at.isoformat() if r and r.completed_at else ""})
    return {"date": str(today), "items": out, "assigned_mode": any_assigned}


@router.post("/complete")
async def complete(template_id: int = Form(...), note: str = Form(""),
                   file: UploadFile | None = File(None),
                   files: list[UploadFile] = File(default=[]),
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
    # 2026-11-18 用户定：每项任务完成前都要传照片并写备注，不分必传项。
    # 空文件（只选了框、没选文件）按没传处理；可一次传多张。
    incoming = [f for f in ([file] if file is not None else []) + list(files or [])
                if f is not None and (f.filename or "").strip()]
    if not (note or "").strip():
        raise HTTPException(status_code=400, detail="每项都要写备注：完成前请先写一句备注")
    existing = db.query(SideworkPhoto).filter(SideworkPhoto.record_id == rec.id).count() if rec.id else 0
    if not incoming and not rec.photo_path and not existing:
        raise HTTPException(status_code=400, detail="每项都要传照片：完成前请先上传照片或视频")
    db.flush()  # 新记录先拿到 id，好挂照片行
    for f in incoming:
        path = await _save_upload(f, f"{user.id}_{template_id}", today)
        db.add(SideworkPhoto(record_id=rec.id, photo_path=path, file_name=f.filename))
        if not rec.photo_path:
            rec.photo_path = path
            rec.file_name = f.filename
    rec.status = "done"; rec.note = note; rec.completed_at = datetime.datetime.now()
    db.commit()
    return {"record_id": rec.id, "status": rec.status,
            "photos": _record_photos(db, rec)}


@router.post("/records/{record_id}/photos")
async def add_record_photos(record_id: int, files: list[UploadFile] = File(...),
                            db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    """给一条已有的完成记录再补照片（比如被打回后补拍），一次可传多张。"""
    rec = db.query(SideworkRecord).filter(SideworkRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    if rec.employee_id != user.id:
        raise HTTPException(status_code=403, detail="只能给自己的记录补照片")
    incoming = [f for f in (files or []) if f is not None and (f.filename or "").strip()]
    if not incoming:
        raise HTTPException(status_code=400, detail="请选择至少一张照片")
    for f in incoming:
        path = await _save_upload(f, f"{user.id}_{rec.template_id}", datetime.date.today())
        db.add(SideworkPhoto(record_id=rec.id, photo_path=path, file_name=f.filename))
        if not rec.photo_path:
            rec.photo_path = path
            rec.file_name = f.filename
    db.commit()
    return {"record_id": rec.id, "photos": _record_photos(db, rec)}
