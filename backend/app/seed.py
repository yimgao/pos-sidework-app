"""种子数据：只在员工表为空时跑一次。演示 PIN：经理 123456，员工 1111/2222/3333。"""
import datetime

from sqlalchemy.orm import Session

from .auth import hash_password, hash_pin
from .database import Base, SessionLocal, engine, ensure_new_columns
from .models import AppSetting, Employee, Role, Schedule, ShiftTemplate, SideworkTemplate

TASKS = [
    ("opening", "all", "Set tables: cutlery, cups, napkins || 餐桌摆台：餐具、杯子、餐巾齐全", True, 1),
    ("opening", "all", "Roll 20 sets of cutlery || 卷餐具 20 套", True, 2),
    ("opening", "all", "Refill drink station: cups, straws, napkins || 饮料站补满：杯子、吸管、餐巾纸", True, 3),
    ("opening", "all", "Refill condiments, sugar, salt & pepper || 调料、糖包、盐胡椒补满", False, 4),
    ("running", "all", "Clear and reset tables promptly after guests leave || 客人走后及时收桌、重新摆台", False, 5),
    ("running", "all", "Refill drink station and cutlery as needed || 饮料站、餐具随缺随补", False, 6),
    ("closing", "all", "Reset your area: chairs in place, tables wiped || 自己区域桌椅归位、桌面擦净", True, 7),
    ("closing", "all", "Sweep the floor || 地面扫净", True, 8),
    ("closing", "all", "Take out trash, replace bags || 垃圾倒掉、换新垃圾袋", True, 9),
    ("closing", "all", "Wipe and store condiment bottles || 调料瓶擦净、收好", False, 10),
]


DEFAULT_ROLES = ["Server", "Cook", "Manager", "Host", "Busser", "Bar"]


def ensure_roles(db: Session):
    """幂等：每次启动都补齐缺失的岗位（老数据库只有 Server/Cook/Manager/Host）。"""
    existing = {r.name for r in db.query(Role).all()}
    for name in DEFAULT_ROLES:
        if name not in existing:
            db.add(Role(name=name))
    db.commit()


def seed():
    Base.metadata.create_all(bind=engine)
    ensure_new_columns()
    db: Session = SessionLocal()
    try:
        ensure_roles(db)
        if db.query(Employee).count():
            return
        owner = Employee(name="Owner", role="owner", pin_hash=hash_pin("000000"), username="owner",
                         password_hash=hash_password("owner123"), is_owner=True, is_manager=True)
        manager = Employee(name="Manager", role="manager", pin_hash=hash_pin("123456"), username="manager",
                           password_hash=hash_password("manager123"), is_manager=True)
        anna = Employee(name="Anna", role="server", pin_hash=hash_pin("1111"), username="anna",
                        password_hash=hash_password("anna123"))
        ben = Employee(name="Ben", role="server", pin_hash=hash_pin("2222"), username="ben",
                       password_hash=hash_password("ben123"))
        chris = Employee(name="Chris", role="server", pin_hash=hash_pin("3333"), username="chris",
                         password_hash=hash_password("chris123"))
        db.add_all([owner, manager, anna, ben, chris]); db.flush()
        db.add(AppSetting(key="manager_can_see_person_reports", value="true"))
        # 班次只叫名字，不带时间：Lunch shift / Dinner shift / Morning shift 等，
        # 自定义时间另外由经理在排班页选，不混在名字里。
        lunch = ShiftTemplate(name="Lunch shift || 午市", start_time="11:00", end_time="15:00", role="server")
        dinner = ShiftTemplate(name="Dinner shift || 晚市", start_time="16:00", end_time="22:00", role="server")
        closing = ShiftTemplate(name="Closing shift || 打烊", start_time="16:00", end_time="23:00", role="server")
        morning = ShiftTemplate(name="Morning shift || 上午半天", start_time="11:00", end_time="15:00", role="server")
        evening = ShiftTemplate(name="Evening shift || 晚上", start_time="16:00", end_time="22:00", role="server")
        fullday = ShiftTemplate(name="Full day shift || 全天", start_time="11:00", end_time="22:00", role="server")
        db.add_all([lunch, dinner, closing, morning, evening, fullday]); db.flush()
        # 演示分组：开店=A、进行中=B、打烊=C，D 组留给经理自己加真实清单。
        group_map = {"opening": "A", "running": "B", "closing": "C"}
        seg_map = {"opening": "opening", "running": "midday", "closing": "evening"}
        for cat, role, title, photo, order in TASKS:
            db.add(SideworkTemplate(category=cat, role=role, title=title, requires_photo=photo, sort_order=order,
                                    group_letter=group_map.get(cat, "A"),
                                    segment=seg_map.get(cat, "opening"),
                                    optional=(cat == "running")))
        today = datetime.date.today()
        monday = today - datetime.timedelta(days=today.weekday())
        plan = [(anna.id, 0, dinner.id), (anna.id, 2, dinner.id), (anna.id, 4, dinner.id), (anna.id, 5, dinner.id),
                (ben.id, 0, lunch.id), (ben.id, 1, dinner.id), (ben.id, 3, dinner.id), (ben.id, 5, lunch.id),
                (chris.id, 1, lunch.id), (chris.id, 2, closing.id), (chris.id, 4, closing.id), (chris.id, 6, dinner.id)]
        for emp_id, offset, shift_id in plan:
            db.add(Schedule(employee_id=emp_id, shift_template_id=shift_id,
                            date=monday + datetime.timedelta(days=offset), status="published"))
        db.commit()
    finally:
        db.close()
