"""数据模型，对应 docs/03-数据模型与接口.md。

模块边界：排班（ShiftTemplate / Schedule）与 Sidework（SideworkTemplate /
SideworkRecord）是两张独立的表，唯一的交点是评分服务读 SideworkRecord
算分，排班建议接口读分数，Sidework 绝不直接改排班表。
"""
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from .database import Base


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="server")
    pin_hash = Column(String(200), nullable=False)
    is_manager = Column(Boolean, default=False)
    hourly_rate = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)


class ShiftTemplate(Base):
    __tablename__ = "shift_templates"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    role = Column(String(50), nullable=False, default="server")
    required_count = Column(Integer, default=1)


class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    shift_template_id = Column(Integer, ForeignKey("shift_templates.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(20), default="draft")  # draft / published / cancelled


class SideworkTemplate(Base):
    __tablename__ = "sidework_templates"
    id = Column(Integer, primary_key=True)
    category = Column(String(20), nullable=False)  # opening / running / closing
    role = Column(String(50), default="all")
    title = Column(String(200), nullable=False)
    requires_photo = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)


class SideworkRecord(Base):
    __tablename__ = "sidework_records"
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("sidework_templates.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(20), default="pending")  # pending / done
    note = Column(Text, default="")
    photo_path = Column(String(300), nullable=True)
    file_name = Column(String(200), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    late = Column(Boolean, default=False)
    review = Column(String(20), nullable=True)  # pass / fail
    review_note = Column(Text, default="")
    reviewed_by = Column(Integer, nullable=True)


class AIDraft(Base):
    """AI 起草的排班草稿：只存草稿，批准后才生成 Schedule 草稿（仍需发布）。

    payload 是 JSON 文本：{"entries": [{employee_id, shift_template_id, date, reason}], "warnings": [...]}
    驳回后不生成任何排班；AI 永不直接发布排班。
    """
    __tablename__ = "ai_drafts"
    id = Column(Integer, primary_key=True)
    week_start = Column(Date, nullable=False)
    requirement_text = Column(Text, nullable=False, default="")
    status = Column(String(20), default="draft")  # draft / approved / rejected
    payload = Column(Text, default="{}")
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class DailyReport(Base):
    __tablename__ = "daily_reports"
    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, unique=True)
    summary_text = Column(Text, nullable=False)
    payload = Column(Text, default="{}")
    created_at = Column(DateTime, server_default=func.now())
