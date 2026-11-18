"""账号管理：owner 能建任何账号（经理/员工），经理只能建员工账号。"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, require_manager
from ..database import get_db
from ..models import Employee

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _out(e: Employee):
    return {"id": e.id, "name": e.name, "username": e.username, "role": e.role,
            "is_manager": bool(e.is_manager or e.is_owner), "is_owner": bool(e.is_owner),
            "is_active": bool(e.is_active)}


class AccountIn(BaseModel):
    name: str
    username: str
    password: str
    role: str = "server"
    is_manager: bool = False
    is_owner: bool = False


@router.get("")
def list_accounts(db: Session = Depends(get_db), user: Employee = Depends(require_manager)):
    q = db.query(Employee)
    if not user.is_owner:
        q = q.filter(Employee.is_manager == False, Employee.is_owner == False)  # noqa: E712
    return [_out(e) for e in q.order_by(Employee.id).all()]


@router.post("")
def create_account(body: AccountIn, db: Session = Depends(get_db), user: Employee = Depends(require_manager)):
    if body.is_owner and not user.is_owner:
        raise HTTPException(status_code=403, detail="只有 owner 能建 owner 账号")
    if body.is_manager and not user.is_owner:
        raise HTTPException(status_code=403, detail="只有 owner 能建经理账号")
    if not body.username.strip() or len(body.password) < 4:
        raise HTTPException(status_code=400, detail="用户名必填，密码至少 4 位")
    if db.query(Employee).filter(Employee.username == body.username.strip()).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    e = Employee(name=body.name.strip(), username=body.username.strip(),
                 password_hash=hash_password(body.password),
                 pin_hash="x", role=body.role, is_manager=body.is_manager,
                 is_owner=body.is_owner)
    db.add(e); db.commit(); db.refresh(e)
    return _out(e)


class AccountPatch(BaseModel):
    name: str = ""
    password: str = ""
    role: str = ""
    is_active: bool | None = None


@router.patch("/{account_id}")
def update_account(account_id: int, body: AccountPatch, db: Session = Depends(get_db),
                   user: Employee = Depends(require_manager)):
    e = db.query(Employee).filter(Employee.id == account_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="账号不存在")
    if not user.is_owner and (e.is_manager or e.is_owner):
        raise HTTPException(status_code=403, detail="经理只能改员工账号")
    if body.name:
        e.name = body.name.strip()
    if body.password:
        if len(body.password) < 4:
            raise HTTPException(status_code=400, detail="密码至少 4 位")
        e.password_hash = hash_password(body.password)
    if body.role:
        e.role = body.role
    if body.is_active is not None:
        e.is_active = body.is_active
    db.commit(); db.refresh(e)
    return _out(e)
