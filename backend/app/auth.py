"""PIN 登录：PIN 只存哈希，不存明文。Token 为 JWT（无状态），
线上多实例 / serverless 下也能用；本地单机同样可用。"""
import datetime
import hashlib
import hmac
import os

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .database import get_db
from .models import Employee

JWT_SECRET = os.environ.get("JWT_SECRET") or "pos-sidework-dev-only-change-me"
JWT_ALG = "HS256"


def hash_pin(pin: str) -> str:
    salt = b"pos-sidework-salt-v1"
    return hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, 100_000).hex()


def verify_pin(pin: str, pin_hash: str) -> bool:
    return hmac.compare_digest(hash_pin(pin), pin_hash)


def hash_password(password: str) -> str:
    salt = b"pos-sidework-pw-v1"
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000).hex()


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return hmac.compare_digest(hash_password(password), password_hash)


def create_token(employee_id: int) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    return jwt.encode({"sub": str(employee_id), "iat": now,
                       "exp": now + datetime.timedelta(days=30)}, JWT_SECRET, algorithm=JWT_ALG)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> Employee:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALG])
        employee_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="登录已失效")
    user = db.query(Employee).filter(Employee.id == employee_id, Employee.is_active == True).first()  # noqa: E712
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在或已停用")
    return user


def require_manager(user: Employee = Depends(get_current_user)) -> Employee:
    if not user.is_manager and not user.is_owner:
        raise HTTPException(status_code=403, detail="仅经理可用")
    return user


def require_owner(user: Employee = Depends(get_current_user)) -> Employee:
    if not user.is_owner:
        raise HTTPException(status_code=403, detail="仅 owner 可用")
    return user
