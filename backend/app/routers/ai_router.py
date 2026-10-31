"""AI 功能路由：起草排班、照片预筛、日报邮件。

审批关口：AI 草稿批准后只生成 Schedule 草稿，仍需经理点 Publish Week
才对员工可见；驳回不生成任何排班；照片预筛不改复核结果。
"""
import datetime
import json
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import require_manager
from ..database import get_db
from ..models import AIDraft, Employee, Schedule, SideworkRecord, SideworkTemplate
from ..services.ai_vision import screen_photo
from ..services.daily_report import build_daily_report
from ..services.draft_schedule import parse_requirement
from ..services.email_report import send_daily_report

router = APIRouter(prefix="/api/ai", tags=["ai"])
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class DraftIn(BaseModel):
    requirement: str
    week_start: datetime.date
    lang: str = "en"


class RemoveEntryIn(BaseModel):
    index: int


def _draft_out(d: AIDraft):
    payload = json.loads(d.payload or "{}")
    return {"id": d.id, "week_start": str(d.week_start), "requirement_text": d.requirement_text,
            "status": d.status, "entries": payload.get("entries", []), "warnings": payload.get("warnings", [])}


@router.post("/drafts")
def create_draft(body: DraftIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    parsed = parse_requirement(db, body.requirement, body.week_start, lang=body.lang)
    d = AIDraft(week_start=body.week_start, requirement_text=body.requirement, status="draft",
                payload=json.dumps(parsed), created_by=manager.id)
    db.add(d); db.commit(); db.refresh(d)
    return _draft_out(d)


@router.get("/drafts")
def list_drafts(db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    return [_draft_out(d) for d in db.query(AIDraft).order_by(AIDraft.id.desc()).limit(20).all()]


@router.post("/drafts/{draft_id}/approve")
def approve_draft(draft_id: int, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    d = db.query(AIDraft).filter(AIDraft.id == draft_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="草稿不存在")
    if d.status != "draft":
        raise HTTPException(status_code=400, detail="该草稿已处理过")
    payload = json.loads(d.payload or "{}")
    created = 0
    for e in payload.get("entries", []):
        db.add(Schedule(employee_id=e["employee_id"], shift_template_id=e["shift_template_id"],
                        date=datetime.date.fromisoformat(e["date"]), status="draft"))
        created += 1
    d.status = "approved"; db.commit()
    return {"id": d.id, "status": "approved", "created_drafts": created,
            "note": "已生成排班草稿，仍需在排班页点 Publish Week 发布后员工才看得到"}


@router.post("/drafts/{draft_id}/reject")
def reject_draft(draft_id: int, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    d = db.query(AIDraft).filter(AIDraft.id == draft_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="草稿不存在")
    d.status = "rejected"; db.commit()
    return {"id": d.id, "status": "rejected", "created_drafts": 0}


@router.post("/drafts/{draft_id}/remove-entry")
def remove_entry(draft_id: int, body: RemoveEntryIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    d = db.query(AIDraft).filter(AIDraft.id == draft_id).first()
    if not d or d.status != "draft":
        raise HTTPException(status_code=400, detail="只能修改未处理的草稿")
    payload = json.loads(d.payload or "{}")
    entries = payload.get("entries", [])
    if not (0 <= body.index < len(entries)):
        raise HTTPException(status_code=400, detail="条目序号不对")
    entries.pop(body.index)
    payload["entries"] = entries
    d.payload = json.dumps(payload); db.commit()
    return _draft_out(d)


@router.post("/screen/{record_id}")
def screen(record_id: int, lang: str = "en", db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    rec = db.query(SideworkRecord).filter(SideworkRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="记录不存在")
    tpl = db.query(SideworkTemplate).filter(SideworkTemplate.id == rec.template_id).first()
    full = os.path.join(BASE_DIR, "uploads", rec.photo_path) if rec.photo_path else ""
    return {"record_id": rec.id, **screen_photo(full, tpl.title if tpl else "", lang=lang)}


@router.post("/report-email")
def report_email(date: datetime.date | None = None, lang: str = "en", db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    day = date or datetime.date.today()
    data = build_daily_report(db, day, lang=lang)
    return send_daily_report(data["summary_text"], str(day), lang=lang)
