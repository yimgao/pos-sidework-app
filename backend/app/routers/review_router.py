"""经理复核：只由经理操作，通过 / 打回 / 标迟交，原因留痕给员工看。"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import require_manager
from ..database import get_db
from ..models import Employee, SideworkRecord, SideworkTemplate

router = APIRouter(prefix="/api/review", tags=["review"])


class ReviewIn(BaseModel):
    result: str  # pass / fail
    note: str = ""


@router.get("/pending")
def pending(db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    out = []
    for r in db.query(SideworkRecord).filter(SideworkRecord.status == "done", SideworkRecord.review.is_(None)).all():
        tpl = db.query(SideworkTemplate).filter(SideworkTemplate.id == r.template_id).first()
        emp = db.query(Employee).filter(Employee.id == r.employee_id).first()
        out.append({"id": r.id, "employee_name": emp.name if emp else "", "title": tpl.title if tpl else "",
                    "date": str(r.date), "note": r.note, "file_name": r.file_name,
                    "photo_url": ("/uploads/" + r.photo_path) if r.photo_path else "", "late": r.late})
    return out


@router.post("/{record_id}")
def review(record_id: int, body: ReviewIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    if body.result not in ("pass", "fail"):
        raise HTTPException(status_code=400, detail="result must be pass or fail result 只能是 pass 或 fail")
    if body.result == "fail" and not body.note.strip():
        raise HTTPException(status_code=400, detail="打回时请写一句话原因")
    rec = db.query(SideworkRecord).filter(SideworkRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    rec.review = body.result; rec.review_note = body.note; rec.reviewed_by = manager.id
    db.commit()
    return {"id": rec.id, "review": rec.review}


@router.post("/{record_id}/late")
def mark_late(record_id: int, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    rec = db.query(SideworkRecord).filter(SideworkRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    rec.late = True; db.commit()
    return {"id": rec.id, "late": True}
