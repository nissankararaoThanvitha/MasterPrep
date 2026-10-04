import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

# ---------------- DATABASE URL ----------------
# Production: a PostgreSQL URL, e.g. postgresql+psycopg://user:pass@host/dbname
# Local dev fallback: a SQLite file next to this script.
_DEV_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "masterprep_dev.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DEV_DB}")

# Hosts like Neon/Render hand out "postgres://" or "postgresql://" URLs;
# point SQLAlchemy at the psycopg (v3) driver we install.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
