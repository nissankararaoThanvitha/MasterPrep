from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, tuple_
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import McqQuestion, Question, RevisionCard, User
from revision_cards import apply_grade, get_today, state_of
from schemas import Subject
from srs import MASTERED_DAYS, Grade, previews

router = APIRouter(prefix="/revision", tags=["revision"])

MAX_DUE = 100  # cards sent per session


class CardOut(BaseModel):
    id: int
    kind: Literal["theory", "mcq"]
    subject: str
    question_id: int
    source: str
    repetitions: int
    lapses: int
    prompt: str                # question text
    code: str | None           # mcq code snippet, if any
    options: list[str] | None  # mcq only
    answer: str | None         # theory only (revealed after "Show answer")
    previews: dict[str, int]   # days until next review for each grade (theory)


class NextReview(BaseModel):
    interval_days: int
    due_date: date
    mastered: bool


class GradeIn(BaseModel):
    grade: Grade


class McqAnswerIn(BaseModel):
    selected: int = Field(ge=0, le=3)  # option index


class McqResultOut(BaseModel):
    correct: bool
    correct_answer: str
    explanation: str
    next: NextReview


class StatsOut(BaseModel):
    due_today: int
    due_tomorrow: int
    learning: int
    mastered: int
    total: int
    due_by_subject: dict[str, int]


def get_own_card(card_id: int, user: User, db: Session) -> RevisionCard:
    card = db.get(RevisionCard, card_id)
    if card is None or card.user_id != user.id:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


def next_review(card: RevisionCard) -> NextReview:
    return NextReview(
        interval_days=card.interval_days,
        due_date=card.due_date,
        mastered=card.interval_days >= MASTERED_DAYS,
    )


def to_card_out(card: RevisionCard, db: Session) -> CardOut | None:
    key = {"subject": card.subject, "question_id": card.question_id}
    if card.kind == "theory":
        q = db.get(Question, key)
        if q is None:
            return None  # question was removed from the bank
        prompt, code, options, answer = q.title, None, None, q.answer
    else:
        m = db.get(McqQuestion, key)
        if m is None:
            return None
        prompt, code, options, answer = m.question, m.code, m.options, None  # answer stays hidden

    return CardOut(
        id=card.id, kind=card.kind, subject=card.subject, question_id=card.question_id,
        source=card.source, repetitions=card.repetitions, lapses=card.lapses,
        prompt=prompt, code=code, options=options, answer=answer,
        previews=previews(state_of(card)),
    )


@router.get("/due", response_model=list[CardOut])
def due_cards(
    subject: Subject | None = None,
    today: date = Depends(get_today),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(RevisionCard).filter(
        RevisionCard.user_id == user.id, RevisionCard.due_date <= today
    )
    if subject:
        query = query.filter(RevisionCard.subject == subject)

    cards = query.order_by(RevisionCard.due_date, RevisionCard.id).limit(MAX_DUE).all()

    # Load every card's question up front: one query per table instead of one
    # per card. The rows land in the session, so to_card_out's db.get() calls
    # are answered from memory without going back to the database.
    # `preloaded` must stay referenced: the session only holds rows weakly,
    # and an unreferenced result would be garbage-collected straight away.
    preloaded = []
    for model, kind in ((Question, "theory"), (McqQuestion, "mcq")):
        keys = [(c.subject, c.question_id) for c in cards if c.kind == kind]
        if keys:
            preloaded += db.query(model).filter(
                tuple_(model.subject, model.question_id).in_(keys)
            ).all()

    return [out for c in cards if (out := to_card_out(c, db))]


@router.get("/stats", response_model=StatsOut)
def stats(
    today: date = Depends(get_today),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mine = db.query(RevisionCard).filter(RevisionCard.user_id == user.id)
    due_by_subject = dict(
        mine.filter(RevisionCard.due_date <= today)
        .with_entities(RevisionCard.subject, func.count())
        .group_by(RevisionCard.subject)
        .all()
    )
    total = mine.count()
    mastered = mine.filter(RevisionCard.interval_days >= MASTERED_DAYS).count()
    return StatsOut(
        due_today=sum(due_by_subject.values()),
        due_tomorrow=mine.filter(RevisionCard.due_date == today + timedelta(days=1)).count(),
        learning=total - mastered,
        mastered=mastered,
        total=total,
        due_by_subject=due_by_subject,
    )


@router.post("/{card_id}/review", response_model=NextReview)
def review_theory(
    card_id: int,
    data: GradeIn,
    today: date = Depends(get_today),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Self-graded flashcard review (theory cards)."""
    card = get_own_card(card_id, user, db)
    if card.kind != "theory":
        raise HTTPException(status_code=400, detail="MCQ cards are answered, not self-graded")

    apply_grade(card, data.grade, today)
    db.commit()
    return next_review(card)


@router.post("/{card_id}/answer", response_model=McqResultOut)
def answer_mcq(
    card_id: int,
    data: McqAnswerIn,
    today: date = Depends(get_today),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-answer an MCQ card; the server checks it. Right = good, wrong = again."""
    card = get_own_card(card_id, user, db)
    if card.kind != "mcq":
        raise HTTPException(status_code=400, detail="Theory cards are self-graded")

    m = db.get(McqQuestion, {"subject": card.subject, "question_id": card.question_id})
    if m is None:
        raise HTTPException(status_code=404, detail="Question no longer exists")

    correct = m.options[data.selected] == m.correct_option
    apply_grade(card, "good" if correct else "again", today)
    db.commit()

    return McqResultOut(
        correct=correct,
        correct_answer=m.correct_option,
        explanation=m.explanation,
        next=next_review(card),
    )


@router.delete("/{card_id}", status_code=204)
def remove_card(
    card_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db.delete(get_own_card(card_id, user, db))
    db.commit()
    return Response(status_code=204)
