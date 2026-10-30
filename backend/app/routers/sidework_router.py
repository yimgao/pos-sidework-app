"""Sidework 模块：清单、提交、照片/视频证据。独立于排班模块。"""
import datetime
import os
import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Employee, SideworkRecord, SideworkTemplate

router = APIRouter(prefix="/api/sidework", tags=["sidework"])
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".mp4", ".webm", ".mov"}
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@router.get("/templates")
def templates(db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    return [{"id": t.id, "category": t.category, "role": t.role, "title": t.title, "requires_photo": t.requires_photo}
            for t in db.query(SideworkTemplate).order_by(SideworkTemplate.sort_order).all()]


@router.get("/my/today")
def my_today(db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    today = datetime.date.today()
    templates = db.query(SideworkTemplate).order_by(SideworkTemplate.sort_order).all()
    records = {r.template_id: r for r in db.query(SideworkRecord).filter(
        SideworkRecord.employee_id == user.id, SideworkRecord.date == today).all()}
    out = []
    for t in templates:
        r = records.get(t.id)
        out.append({"template_id": t.id, "category": t.category, "title": t.title, "requires_photo": t.requires_photo,
                    "record_id": r.id if r else None, "status": r.status if r else "pending",
                    "note": r.note if r else "", "photo_url": ("/uploads/" + r.photo_path) if r and r.photo_path else "",
                    "file_name": r.file_name if r else "", "review": r.review if r else "",
                    "review_note": r.review_note if r else "", "late": bool(r.late) if r else False})
    return {"date": str(today), "items": out}


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
