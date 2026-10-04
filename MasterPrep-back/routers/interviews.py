import random
from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session, selectinload

import ai
from auth import get_current_user
from database import get_db
from models import InterviewAnswer, InterviewSession, Question, User
from revision_cards import add_card, get_today
from schemas import Subject

router = APIRouter(prefix="/interviews", tags=["mock interview"])

Difficulty = Literal["Easy", "Medium", "Hard"]
RECENT_QUESTIONS = 100  # avoid repeating the user's last 100 interview questions
REVISE_BELOW = 6        # answers scoring under this go into the revision queue


# ---------------- SCHEMAS ----------------
class InterviewIn(BaseModel):
    subject: Subject | None = None        # None = mixed
    difficulty: Difficulty | None = None  # None = any
    num_questions: int = Field(5, ge=3, le=10)


class AnswerIn(BaseModel):
    answer: str = Field("", max_length=4000)
    skipped: bool = False  # "I don't know"

    @model_validator(mode="after")
    def needs_text_unless_skipped(self):
        if not self.skipped and not self.answer.strip():
            raise ValueError("Write an answer, or skip the question")
        return self


class QuestionView(BaseModel):
    position: int
    subject: str
    question_id: int
    question: str
    answered: bool
    skipped: bool
    answer_text: str | None
    score: int | None
    feedback: dict | None
    reference_answer: str | None  # only revealed once answered
    added_to_revision: bool       # scored below REVISE_BELOW


class SessionSummary(BaseModel):
    id: int
    subject: str | None
    difficulty: str | None
    status: str
    avg_score: float | None
    num_questions: int
    answered: int
    created_at: datetime
    completed_at: datetime | None


class SessionDetail(SessionSummary):
    questions: list[QuestionView]
    current_position: int | None  # next question to answer, None when done


# ---------------- HELPERS ----------------
# Load a session's answers and their questions in bulk, not one query each
WITH_ANSWERS = selectinload(InterviewSession.answers).selectinload(InterviewAnswer.question)


def get_own_session(session_id: int, user: User, db: Session) -> InterviewSession:
    s = db.get(InterviewSession, session_id, options=[WITH_ANSWERS])
    if s is None or s.user_id != user.id:
        raise HTTPException(status_code=404, detail="Interview not found")
    return s


def summary_fields(s: InterviewSession) -> dict:
    return dict(
        id=s.id, subject=s.subject, difficulty=s.difficulty, status=s.status,
        avg_score=s.avg_score, num_questions=len(s.answers),
        answered=sum(a.answered_at is not None for a in s.answers),
        created_at=s.created_at, completed_at=s.completed_at,
    )


def to_detail(s: InterviewSession) -> SessionDetail:
    questions = []
    for a in s.answers:
        answered = a.answered_at is not None
        questions.append(QuestionView(
            position=a.position, subject=a.subject, question_id=a.question_id,
            question=a.question.title, answered=answered, skipped=a.skipped,
            answer_text=a.answer_text, score=a.score, feedback=a.feedback,
            reference_answer=a.question.answer if answered else None,
            added_to_revision=answered and a.score < REVISE_BELOW,
        ))
    pending = [q.position for q in questions if not q.answered]
    current = pending[0] if pending and s.status == "active" else None
    return SessionDetail(**summary_fields(s), questions=questions, current_position=current)


def complete(s: InterviewSession) -> None:
    scores = [a.score for a in s.answers if a.score is not None]
    s.status = "completed"
    s.avg_score = round(sum(scores) / len(scores), 1) if scores else None
    s.completed_at = datetime.now(timezone.utc)


def pick_questions(
    db: Session, user_id: int, subject: str | None, difficulty: str | None, n: int
) -> list[Question]:
    query = db.query(Question)
    if subject:
        query = query.filter(Question.subject == subject)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    pool = query.all()

    recent = {
        (a.subject, a.question_id)
        for a in db.query(InterviewAnswer)
        .join(InterviewSession)
        .filter(InterviewSession.user_id == user_id)
        .order_by(InterviewAnswer.id.desc())
        .limit(RECENT_QUESTIONS)
    }
    fresh = [q for q in pool if (q.subject, q.question_id) not in recent]
    source = fresh if len(fresh) >= n else pool  # small pools: allow repeats
    return random.sample(source, min(n, len(source)))


# ---------------- ROUTES ----------------
@router.post("", response_model=SessionDetail, status_code=201)
def start_interview(
    data: InterviewIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    questions = pick_questions(db, user.id, data.subject, data.difficulty, data.num_questions)
    if not questions:
        raise HTTPException(status_code=400, detail="No questions match those settings")

    session = InterviewSession(
        user_id=user.id, subject=data.subject, difficulty=data.difficulty, status="active"
    )
    session.answers = [
        InterviewAnswer(position=i, subject=q.subject, question_id=q.question_id, question=q)
        for i, q in enumerate(questions, start=1)
    ]
    db.add(session)
    db.commit()
    db.refresh(session)
    return to_detail(session)


@router.get("", response_model=list[SessionSummary])
def list_interviews(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = (
        db.query(InterviewSession)
        .options(selectinload(InterviewSession.answers))
        .filter_by(user_id=user.id)
        .order_by(InterviewSession.created_at.desc())
        .limit(50)
        .all()
    )
    return [SessionSummary(**summary_fields(s)) for s in sessions]


@router.get("/{session_id}", response_model=SessionDetail)
def get_interview(
    session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return to_detail(get_own_session(session_id, user, db))


# Plain `def`: the Gemini call is slow and blocking, so FastAPI runs this
# in a thread pool instead of on the event loop.
@router.post("/{session_id}/answers/{position}", response_model=SessionDetail)
def answer_question(
    session_id: int,
    position: int,
    data: AnswerIn,
    today: date = Depends(get_today),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = get_own_session(session_id, user, db)
    if session.status != "active":
        raise HTTPException(status_code=409, detail="This interview is already finished")

    answer = next((a for a in session.answers if a.position == position), None)
    if answer is None:
        raise HTTPException(status_code=404, detail="No such question in this interview")
    if answer.answered_at is not None:
        raise HTTPException(status_code=409, detail="Already answered")
    if any(a.answered_at is None for a in session.answers if a.position < position):
        raise HTTPException(status_code=409, detail="Answer the questions in order")

    if data.skipped:
        answer.skipped = True
        answer.answer_text = None
        answer.score = 0
        answer.feedback = {
            "covered": [], "missing": [],
            "feedback": "You skipped this one. Read the model answer, then try "
                        "explaining it out loud in your own words.",
            "follow_up": "",
        }
    else:
        try:
            graded = ai.grade_answer(answer.question.title, answer.question.answer, data.answer)
        except ai.GradeError:
            # Nothing is saved, so the student can simply submit again
            raise HTTPException(
                status_code=502,
                detail="Couldn't grade your answer right now. Please submit it again.",
            )
        answer.answer_text = data.answer.strip()
        answer.score = graded.pop("score")
        answer.feedback = graded

    answer.answered_at = datetime.now(timezone.utc)

    # A weak answer is exactly what the revision queue is for
    if answer.score < REVISE_BELOW:
        add_card(
            db, user_id=user.id, kind="theory", subject=answer.subject,
            question_id=answer.question_id, source="interview", today=today, missed=True,
        )

    if all(a.answered_at is not None for a in session.answers):
        complete(session)

    db.commit()
    db.refresh(session)
    return to_detail(session)


@router.post("/{session_id}/finish", response_model=SessionDetail)
def finish_early(
    session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Ends the interview now; unanswered questions stay unanswered."""
    session = get_own_session(session_id, user, db)
    if session.status == "active":
        complete(session)
        db.commit()
        db.refresh(session)
    return to_detail(session)
