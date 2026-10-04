"""Shared revision-queue helpers, used by the routers that create cards."""
from datetime import date, datetime, timedelta, timezone

from fastapi import Header
from sqlalchemy.orm import Session

from models import RevisionCard
from srs import MIN_EASE, START_EASE, CardState, Grade, schedule


def get_today(x_local_date: str | None = Header(default=None)) -> date:
    """The user's local date, sent by the frontend as `X-Local-Date: YYYY-MM-DD`.

    Accepted only within a day of the server's UTC date (every real timezone
    is), so a client can't push cards far into the past or future."""
    utc_today = datetime.now(timezone.utc).date()
    try:
        local = date.fromisoformat(x_local_date) if x_local_date else None
    except ValueError:
        local = None
    if local and abs((local - utc_today).days) <= 1:
        return local
    return utc_today


def add_card(
    db: Session,
    *,
    user_id: int,
    kind: str,
    subject: str,
    question_id: int,
    source: str,
    today: date,
    missed: bool,
) -> RevisionCard:
    """Puts a question into the user's revision queue (due today).

    missed=True  (got it wrong somewhere): if the card already exists, it's a
                 lapse, so the card restarts from scratch and is due today.
    missed=False (e.g. bookmarked "Revise Later"): an existing card is left alone.
    """
    card = (
        db.query(RevisionCard)
        .filter_by(user_id=user_id, kind=kind, subject=subject, question_id=question_id)
        .first()
    )

    if card is None:
        card = RevisionCard(
            user_id=user_id, kind=kind, subject=subject, question_id=question_id,
            source=source, due_date=today,
            ease=START_EASE, interval_days=0, repetitions=0, lapses=0,
        )
        db.add(card)
        db.flush()  # visible to later lookups in this same request
    elif missed:
        if card.repetitions > 0:  # it had been learned, and was forgotten
            card.lapses += 1
            card.ease = max(MIN_EASE, card.ease - 0.2)
        card.repetitions = 0
        card.interval_days = 0
        card.due_date = min(card.due_date, today)
    return card


def state_of(card: RevisionCard) -> CardState:
    return CardState(
        ease=card.ease, interval=card.interval_days, reps=card.repetitions, lapses=card.lapses
    )


def apply_grade(card: RevisionCard, grade: Grade, today: date) -> None:
    new = schedule(state_of(card), grade)
    card.ease = new.ease
    card.interval_days = new.interval
    card.repetitions = new.reps
    card.lapses = new.lapses
    card.due_date = today + timedelta(days=new.interval)
    card.last_reviewed_at = datetime.now(timezone.utc)
