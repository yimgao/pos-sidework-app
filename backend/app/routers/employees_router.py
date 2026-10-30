from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user, hash_pin, require_manager
from ..database import get_db
from ..models import Employee

router = APIRouter(prefix="/api/employees", tags=["employees"])


class EmployeeIn(BaseModel):
    name: str
    role: str = "server"
    pin: str
    is_manager: bool = False


def _out(e: Employee):
    return {"id": e.id, "name": e.name, "role": e.role, "is_manager": e.is_manager, "is_active": e.is_active}


@router.get("")
def list_employees(db: Session = Depends(get_db), user: Employee = Depends(get_current_user)):
    if user.is_manager:
        return [_out(e) for e in db.query(Employee).all()]
    return [_out(user)]


@router.post("")
def create_employee(body: EmployeeIn, db: Session = Depends(get_db), manager: Employee = Depends(require_manager)):
    emp = Employee(name=body.name, role=body.role, pin_hash=hash_pin(body.pin), is_manager=body.is_manager)
    db.add(emp); db.commit(); db.refresh(emp)
    return _out(emp)
