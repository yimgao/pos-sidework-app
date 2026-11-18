from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import create_token, get_current_user, verify_password, verify_pin
from ..database import get_db
from ..models import Employee

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    pin: str = ""
    username: str = ""
    password: str = ""


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = None
    if body.username:
        cand = db.query(Employee).filter(Employee.username == body.username.strip(),
                                         Employee.is_active == True).first()  # noqa: E712
        if cand and verify_password(body.password, cand.password_hash):
            user = cand
    elif body.pin:
        for emp in db.query(Employee).filter(Employee.is_active == True).all():  # noqa: E712
            if verify_pin(body.pin, emp.pin_hash):
                user = emp
                break
    if not user:
        raise HTTPException(status_code=401, detail="Wrong login 登录不对")
    return {"token": create_token(user.id),
            "user": {"id": user.id, "name": user.name, "role": user.role,
                     "is_manager": bool(user.is_manager or user.is_owner),
                     "is_owner": bool(user.is_owner)}}


@router.get("/me")
def me(user: Employee = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "role": user.role,
            "is_manager": bool(user.is_manager or user.is_owner),
            "is_owner": bool(user.is_owner)}
