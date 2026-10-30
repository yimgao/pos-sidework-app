"""PIN 登录：PIN 只存哈希，不存明文。Token 为服务端内存会话（单机演示/单店够用）。"""
import hashlib
import hmac
import secrets

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .database import get_db
from .models import Employee

TOKENS: dict[str, int] = {}


def hash_pin(pin: str) -> str:
    salt = b"pos-sidework-salt-v1"
    return hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, 100_000).hex()


def verify_pin(pin: str, pin_hash: str) -> bool:
    return hmac.compare_digest(hash_pin(pin), pin_hash)


def create_token(employee_id: int) -> str:
    token = secrets.token_hex(24)
    TOKENS[token] = employee_id
    return token


def get_current_user(request: Request, db: Session = Depends(get_db)) -> Employee:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录")
    token = auth[7:]
    employee_id = TOKENS.get(token)
    if not employee_id:
        raise HTTPException(status_code=401, detail="登录已失效")
    user = db.query(Employee).filter(Employee.id == employee_id, Employee.is_active == True).first()  # noqa: E712
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在或已停用")
    return user


def require_manager(user: Employee = Depends(get_current_user)) -> Employee:
    if not user.is_manager:
        raise HTTPException(status_code=403, detail="仅经理可用")
    return user
