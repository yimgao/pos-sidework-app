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
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=5)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def ensure_new_columns():
    """轻量迁移：老数据库没有新字段时补列，不删数据、不重建表。"""
    from sqlalchemy import inspect, text

    def _add(table, col, ddl):
        try:
            cols = {c["name"] for c in inspect(engine).get_columns(table)}
        except Exception:
            return
        if cols and col not in cols:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))
    _add("sidework_templates", "group_letter", "group_letter VARCHAR(10) DEFAULT 'A'")
    _add("sidework_templates", "is_active", "is_active BOOLEAN DEFAULT 1")
    _add("sidework_templates", "standard", "standard TEXT DEFAULT ''")
    _add("sidework_templates", "segment", "segment VARCHAR(20) DEFAULT 'opening'")
    _add("sidework_templates", "optional", "optional BOOLEAN DEFAULT 0")
    _add("employees", "username", "username VARCHAR(100)")
    _add("employees", "password_hash", "password_hash VARCHAR(200)")
    _add("employees", "is_owner", "is_owner BOOLEAN DEFAULT 0")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
