import random
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from auth import get_current_user
from database import get_db
from models import DailyChallenge, McqQuestion, User
from revision_cards import add_card, get_today

router = APIRouter(prefix="/daily", tags=["daily challenge"])


class DailyQuestion(BaseModel):
    id: int
    subject: str
    question: str
    code: str | None
    options: list[str]
    answer: str | None = None       # letter; only once solved
    explanation: str | None = None  # only once solved


class ChallengeOut(BaseModel):
    date: date
    question: DailyQuestion
    solved: bool


class AnswerIn(BaseModel):
    answer: Literal["a", "b", "c", "d"]


class AnswerOut(BaseModel):
    correct: bool
    challenge: ChallengeOut


def to_out(c: DailyChallenge) -> ChallengeOut:
    q = c.mcq
    return ChallengeOut(
        date=c.date,
        solved=c.solved,
        question=DailyQuestion(
            id=q.question_id, subject=q.subject, question=q.question, code=q.code,
            options=q.options,
            answer=q.answer if c.solved else None,
            explanation=q.explanation if c.solved else None,
        ),
    )


def check_not_future(day: date):
    # The browser sends its local date; allow one day of timezone slack.
    if day > datetime.now(timezone.utc).date() + timedelta(days=1):
        raise HTTPException(status_code=400, detail="That date is in the future.")


@router.get("", response_model=list[ChallengeOut])
def list_challenges(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    challenges = (
        db.query(DailyChallenge)
        .options(selectinload(DailyChallenge.mcq))  # one query for all questions
        .filter_by(user_id=user.id)
        .all()
    )
    return [to_out(c) for c in challenges]


@router.put("/{day}", response_model=ChallengeOut)
def get_or_create_challenge(
    day: date, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Returns the date's challenge, picking a random MCQ the first time.
    Once a date has a question it never changes."""
    check_not_future(day)

    challenge = db.query(DailyChallenge).filter_by(user_id=user.id, date=day).first()
    if challenge is None:
        count = db.query(McqQuestion).count()
        mcq = db.query(McqQuestion).offset(random.randrange(count)).first()
        challenge = DailyChallenge(
            user_id=user.id, date=day, subject=mcq.subject, question_id=mcq.question_id
        )
        db.add(challenge)
        db.commit()
        db.refresh(challenge)
    return to_out(challenge)


@router.post("/{day}/answer", response_model=AnswerOut)
def answer_challenge(
    day: date,
    data: AnswerIn,
    today: date = Depends(get_today),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    challenge = db.query(DailyChallenge).filter_by(user_id=user.id, date=day).first()
    if challenge is None:
        raise HTTPException(status_code=404, detail="No challenge for that date.")

    correct = data.answer == challenge.mcq.answer
    if correct and not challenge.solved:
        challenge.solved = True
        challenge.solved_at = datetime.now(timezone.utc)
    elif not correct:
        add_card(
            db, user_id=user.id, kind="mcq", subject=challenge.subject,
            question_id=challenge.question_id, source="daily", today=today, missed=True,
        )
    db.commit()
    db.refresh(challenge)

    return AnswerOut(correct=correct, challenge=to_out(challenge))
