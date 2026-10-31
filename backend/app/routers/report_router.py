"""报告与分数：每日报告（规则版）+ 个人/全员分数。"""
import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_manager
from ..database import get_db
from ..models import DailyReport, Employee
from ..services.daily_report import build_daily_report
from ..services.scoring import rolling_score_14, score_for_day

router = APIRouter(prefix="/api", tags=["report"])


@router.get("/scores/me")
def my_score(db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    return {"employee_id": user.id, "name": user.name, **score_for_day(db, user.id, datetime.date.today())}


@router.get("/scores/all")
def all_scores(day: datetime.date | None = None, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    day = day or datetime.date.today()
    return [{"employee_id": e.id, "name": e.name, **score_for_day(db, e.id, day)}
            for e in db.query(Employee).filter(Employee.is_manager == False, Employee.is_active == True).all()]  # noqa: E712


@router.get("/scores/rolling/me")
def my_rolling(day: datetime.date | None = None, db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    day = day or datetime.date.today()
    return {"employee_id": user.id, "name": user.name, "end_day": str(day), **rolling_score_14(db, user.id, day)}


@router.get("/scores/rolling/all")
def all_rolling(day: datetime.date | None = None, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    day = day or datetime.date.today()
    return [{"employee_id": e.id, "name": e.name, "end_day": str(day), **rolling_score_14(db, e.id, day)}
            for e in db.query(Employee).filter(Employee.is_manager == False, Employee.is_active == True).all()]  # noqa: E712


@router.get("/reports/daily")
def get_report(date: datetime.date | None = None, lang: str = "en", db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    day = date or datetime.date.today()
    # Language switch must work instantly: always build in the requested language.
    return build_daily_report(db, day, lang=lang)


@router.post("/reports/daily/generate")
def generate_report(date: datetime.date | None = None, lang: str = "en", db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    day = date or datetime.date.today()
    data = build_daily_report(db, day, lang=lang)
    saved = db.query(DailyReport).filter(DailyReport.date == day).first()
    if saved:
        saved.summary_text = data["summary_text"]
    else:
        db.add(DailyReport(date=day, summary_text=data["summary_text"]))
    db.commit()
    return {"date": str(day), "summary_text": data["summary_text"]}
