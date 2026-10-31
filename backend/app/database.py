"""数据库连接：SQLite，单店先行，以后换 PostgreSQL 只改这里的 URL。"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# v2：优先读 DATABASE_URL（Docker + PostgreSQL），没配时回落到本地 SQLite。
# 这样换数据库不用改模型代码。
DATABASE_URL = os.environ.get("DATABASE_URL") or f"sqlite:///{os.path.join(BASE_DIR, 'app.db')}"

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def ensure_new_columns():
    """轻量迁移：老数据库没有新字段时补列，不删数据、不重建表。"""
    from sqlalchemy import inspect, text

    try:
        cols = {c["name"] for c in inspect(engine).get_columns("sidework_templates")}
    except Exception:
        return
    if not cols:
        return
    with engine.begin() as conn:
        if "group_letter" not in cols:
            conn.execute(text("ALTER TABLE sidework_templates ADD COLUMN group_letter VARCHAR(10) DEFAULT 'A'"))
        if "is_active" not in cols:
            conn.execute(text("ALTER TABLE sidework_templates ADD COLUMN is_active BOOLEAN DEFAULT 1"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
