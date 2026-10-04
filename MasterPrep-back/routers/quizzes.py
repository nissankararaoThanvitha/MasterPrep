import random
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import McqQuestion, QuizAttempt, QuizSession, User
from revision_cards import add_card, get_today
from schemas import Subject

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

QUIZ_LENGTH = 20
TIME_LIMIT = timedelta(minutes=10)
GRACE = timedelta(seconds=60)  # network delay on the auto-submit at 0:00


# ---------------- SCHEMAS ----------------
class StartIn(BaseModel):
    subject: Subject


class McqOut(BaseModel):
    question_id: int
    question: str
    code: str | None
    options: list[str]


class QuizSessionOut(BaseModel):
    session_id: int
    subject: str
    time_limit_seconds: int
    questions: list[McqOut]  # no answers


class AnswerIn(BaseModel):
    question_id: int
    selected: int | None = Field(None, ge=0, le=3)  # option index, None = not answered


class SubmitIn(BaseModel):
    session_id: int
    answers: list[AnswerIn] = Field(max_length=QUIZ_LENGTH)


class ReviewItem(BaseModel):
    id: int | None = None
    question: str
    options: list[str]
    selected: str
    correct: str
    isCorrect: bool = False
    explanation: str = ""


class AttemptOut(BaseModel):
    id: int
    subject: str
    score: int
    total: int
    review: list[ReviewItem]
    created_at: datetime


def as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ---------------- ROUTES ----------------
@router.get("", response_model=list[AttemptOut])
def list_attempts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(QuizAttempt)
        .filter_by(user_id=user.id)
        .order_by(QuizAttempt.created_at.desc())
        .all()
    )


@router.post("/start", response_model=QuizSessionOut, status_code=201)
def start_quiz(
    data: StartIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Hands out random questions WITHOUT answers and remembers which ones."""
    pool = db.query(McqQuestion).filter_by(subject=data.subject).all()
    picked = random.sample(pool, min(QUIZ_LENGTH, len(pool)))

    now = datetime.now(timezone.utc)
    session = QuizSession(
        user_id=user.id, subject=data.subject,
        question_ids=[q.question_id for q in picked],
        started_at=now, expires_at=now + TIME_LIMIT,
    )
    db.add(session)
    db.commit()

    return QuizSessionOut(
        session_id=session.id,
        subject=data.subject,
        time_limit_seconds=int(TIME_LIMIT.total_seconds()),
        questions=[
            McqOut(question_id=q.question_id, question=q.question, code=q.code, options=q.options)
            for q in picked
        ],
    )


@router.post("", response_model=AttemptOut, status_code=201)
def submit_quiz(
    data: SubmitIn,
    today: date = Depends(get_today),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Grades a quiz on the server, against the questions this session served."""
    session = db.get(QuizSession, data.session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if session.submitted_at is not None:
        raise HTTPException(status_code=409, detail="This quiz was already submitted")
    if datetime.now(timezone.utc) > as_utc(session.expires_at) + GRACE:
        raise HTTPException(status_code=409, detail="Time is up for this quiz")

    served = session.question_ids
    chosen = {}
    for a in data.answers:
        if a.question_id not in served:
            raise HTTPException(status_code=422, detail="Answer for a question not in this quiz")
        if a.question_id in chosen:
            raise HTTPException(status_code=422, detail="Question answered twice")
        chosen[a.question_id] = a.selected

    questions = {
        q.question_id: q
        for q in db.query(McqQuestion).filter(
            McqQuestion.subject == session.subject, McqQuestion.question_id.in_(served)
        )
    }

    review = []
    for qid in served:  # keep the order the student saw
        q = questions[qid]
        picked = chosen.get(qid)
        is_correct = picked is not None and q.options[picked] == q.correct_option
        review.append(ReviewItem(
            id=qid, question=q.question, options=q.options,
            selected="Not answered" if picked is None else q.options[picked],
            correct=q.correct_option, isCorrect=is_correct, explanation=q.explanation,
        ))
        # Every missed (or unanswered) question goes into the revision queue
        if not is_correct:
            add_card(
                db, user_id=user.id, kind="mcq", subject=session.subject, question_id=qid,
                source="quiz", today=today, missed=True,
            )

    attempt = QuizAttempt(
        user_id=user.id,
        subject=session.subject,
        score=sum(r.isCorrect for r in review),
        total=len(review),
        review=[r.model_dump() for r in review],
    )
    db.add(attempt)
    session.submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(attempt)
    return attempt
