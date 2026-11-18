"""Owner 设置：只有 owner 能改。"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import require_owner
from ..database import get_db
from ..models import AppSetting

router = APIRouter(prefix="/api/settings", tags=["settings"])
DEFAULTS = {"manager_can_see_person_reports": "true"}


def get_setting(db: Session, key: str) -> str:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    return row.value if row else DEFAULTS.get(key, "")


@router.get("")
def list_settings(db: Session = Depends(get_db), owner=Depends(require_owner)):
    return {k: get_setting(db, k) for k in DEFAULTS}


class SettingIn(BaseModel):
    key: str
    value: str


@router.post("")
def set_setting(body: SettingIn, db: Session = Depends(get_db), owner=Depends(require_owner)):
    if body.key not in DEFAULTS:
        return {"error": "未知的设置项"}
    row = db.query(AppSetting).filter(AppSetting.key == body.key).first()
    if row:
        row.value = body.value
    else:
        db.add(AppSetting(key=body.key, value=body.value))
    db.commit()
    return {"key": body.key, "value": body.value}
