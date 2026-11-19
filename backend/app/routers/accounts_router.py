"""账号管理：owner 能建任何账号（经理/员工），经理只能建员工账号。"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_password, require_manager
from ..database import get_db
from ..models import (Employee, Schedule, SideworkAssignment, SideworkPhoto,
                      SideworkRecord)

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
        if body.is_active is False:
            # 2026-11-18 晚：用户把 owner 账号停用了才发现 owner 根本不能被停用
            # （停了就没人能管账号）。owner 账号永远不能停用；自己的账号也不能
            # 停用（否则把自己锁在外面，没人能恢复）。
            if e.is_owner:
                raise HTTPException(status_code=403, detail="Owner 账号不能停用")
            if e.id == user.id:
                raise HTTPException(status_code=403, detail="不能停用自己的账号")
        e.is_active = body.is_active
    db.commit(); db.refresh(e)
    return _out(e)


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db),
                   user: Employee = Depends(require_manager)):
    """真删账号（用户 2026-11-18 明确要的；停用之外再给一个删除）。
    经理只能删员工；owner 除自己和最后一个 owner 外都能删。
    连带删掉该员工的排班、分配、sidework 记录及照片行。"""
    e = db.query(Employee).filter(Employee.id == account_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="账号不存在")
    if e.id == user.id:
        raise HTTPException(status_code=400, detail="不能删自己的账号")
    if not user.is_owner and (e.is_manager or e.is_owner):
        raise HTTPException(status_code=403, detail="经理只能删员工账号")
    if e.is_owner:
        owners = db.query(Employee).filter(Employee.is_owner == True).count()  # noqa: E712
        if owners <= 1:
            raise HTTPException(status_code=400, detail="不能删最后一个 owner 账号")
    rec_ids = [r.id for r in db.query(SideworkRecord).filter(SideworkRecord.employee_id == e.id).all()]
    if rec_ids:
        db.query(SideworkPhoto).filter(SideworkPhoto.record_id.in_(rec_ids)).delete(synchronize_session=False)
    db.query(SideworkRecord).filter(SideworkRecord.employee_id == e.id).delete(synchronize_session=False)
    db.query(SideworkAssignment).filter(SideworkAssignment.employee_id == e.id).delete(synchronize_session=False)
    db.query(Schedule).filter(Schedule.employee_id == e.id).delete(synchronize_session=False)
    db.delete(e); db.commit()
    return {"id": account_id, "deleted": True}
