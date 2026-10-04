import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------- LOAD ENV ----------------
load_dotenv()

from auth import router as auth_router
from routers import analytics, chats, daily, interviews, questions, quizzes, revision

# ---------------- DATABASE ----------------
# Bring the database schema up to date (runs any pending Alembic migrations).
command.upgrade(Config(str(Path(__file__).with_name("alembic.ini"))), "head")

# ---------------- FASTAPI ----------------
app = FastAPI(title="MasterPrep API")

# Comma-separated list of allowed frontend URLs
FRONTEND_ORIGINS = os.getenv(
    "FRONTEND_ORIGINS",
    "https://master-prep-vmkv.vercel.app,http://localhost:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in FRONTEND_ORIGINS],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(questions.router)
app.include_router(quizzes.router)
app.include_router(daily.router)
app.include_router(chats.router)
app.include_router(analytics.router)
app.include_router(revision.router)
app.include_router(interviews.router)


# ---------------- HEALTH CHECK ----------------
@app.get("/")
def home():
    return {"message": "Backend is running"}
