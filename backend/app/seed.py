"""种子数据：只在员工表为空时跑一次。演示 PIN：经理 123456，员工 1111/2222/3333。"""
import datetime

from sqlalchemy.orm import Session

from .auth import hash_pin
from .database import Base, SessionLocal, engine, ensure_new_columns
from .models import Employee, Schedule, ShiftTemplate, SideworkTemplate

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


def seed():
    Base.metadata.create_all(bind=engine)
    ensure_new_columns()
    db: Session = SessionLocal()
    try:
        if db.query(Employee).count():
            return
        manager = Employee(name="Manager", role="manager", pin_hash=hash_pin("123456"), is_manager=True)
        anna = Employee(name="Anna", role="server", pin_hash=hash_pin("1111"))
        ben = Employee(name="Ben", role="server", pin_hash=hash_pin("2222"))
        chris = Employee(name="Chris", role="server", pin_hash=hash_pin("3333"))
        db.add_all([manager, anna, ben, chris]); db.flush()
        lunch = ShiftTemplate(name="Lunch || 午市", start_time="11:00", end_time="15:00", role="server")
        dinner = ShiftTemplate(name="Dinner || 晚市", start_time="16:00", end_time="22:00", role="server")
        closing = ShiftTemplate(name="Closing || 打烊", start_time="16:00", end_time="23:00", role="server")
        # 用户要的班次口径：上午半天、晚上、全天（原 Lunch/Dinner/Closing 保留，旧排班不断）
        morning = ShiftTemplate(name="Morning Half Day || 上午半天", start_time="11:00", end_time="15:00", role="server")
        evening = ShiftTemplate(name="Evening || 晚上", start_time="16:00", end_time="22:00", role="server")
        fullday = ShiftTemplate(name="Full Day || 全天", start_time="11:00", end_time="22:00", role="server")
        db.add_all([lunch, dinner, closing, morning, evening, fullday]); db.flush()
        # 演示分组：开店=A、进行中=B、打烊=C，D 组留给经理自己加真实清单。
        group_map = {"opening": "A", "running": "B", "closing": "C"}
        for cat, role, title, photo, order in TASKS:
            db.add(SideworkTemplate(category=cat, role=role, title=title, requires_photo=photo, sort_order=order,
                                    group_letter=group_map.get(cat, "A")))
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
