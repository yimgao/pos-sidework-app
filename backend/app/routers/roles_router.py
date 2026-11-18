"""岗位管理：经理/owner 在应用里加岗位，不写死。"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import require_manager
from ..database import get_db
from ..models import Role

router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("")
def list_roles(db: Session = Depends(get_db), manager=Depends(require_manager)):
    return [{"id": r.id, "name": r.name, "is_active": bool(r.is_active)}
            for r in db.query(Role).filter(Role.is_active == True).order_by(Role.name).all()]  # noqa: E712


class RoleIn(BaseModel):
    name: str


@router.post("")
def create_role(body: RoleIn, db: Session = Depends(get_db), manager=Depends(require_manager)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="岗位名必填")
    if db.query(Role).filter(Role.name == name).first():
        raise HTTPException(status_code=400, detail="岗位已存在")
    r = Role(name=name)
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "name": r.name, "is_active": True}


@router.delete("/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db), manager=Depends(require_manager)):
    r = db.query(Role).filter(Role.id == role_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="岗位不存在")
    r.is_active = False; db.commit()
    return {"id": r.id, "is_active": False}
