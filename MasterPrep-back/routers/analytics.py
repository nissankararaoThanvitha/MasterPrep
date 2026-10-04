from datetime import date, datetime, timedelta, timezone
from typing import Literal, get_args

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import (
    DailyChallenge, InterviewAnswer, InterviewSession, Question, QuizAttempt, RevisionCard,
    User, ViewedQuestion,
)
from revision_cards import get_today
from schemas import Subject
from srs import MASTERED_DAYS

router = APIRouter(prefix="/analytics", tags=["analytics"])

SUBJECTS: tuple[str, ...] = get_args(Subject)
TREND_WEEKS = 8
# A subject needs this many answered quiz questions (half a quiz) before
# its accuracy is trusted enough to call it the weakest.
MIN_ANSWERED_FOR_WEAKEST = 10


class SubjectStats(BaseModel):
    subject: str
    quizzes: int
    answered: int            # quiz questions answered (incl. unanswered on timeout)
    correct: int
    accuracy: float | None   # 0-100, None if no quizzes yet
    best_score: float | None  # best single quiz, 0-100
    viewed: int              # question-bank answers viewed
    bank_total: int          # questions in the bank for this subject
    revision_due: int        # revision cards due today
    interview_answers: int   # mock interview questions answered
    interview_avg: float | None  # average interview score, 0-10


class WeekStats(BaseModel):
    week_start: date         # Monday (UTC)
    quizzes: int
    accuracy: float | None


class Weakest(BaseModel):
    subject: str
    reason: Literal["lowest_accuracy", "not_started"]
    accuracy: float | None


class Totals(BaseModel):
    quizzes: int
    accuracy: float | None
    viewed: int
    bank_total: int
    daily_solved: int
    longest_streak: int
    revision_due: int
    revision_mastered: int
    interviews: int              # completed mock interviews
    interview_avg: float | None  # average score over all answered interview questions


class AnalyticsOut(BaseModel):
    totals: Totals
    subjects: list[SubjectStats]
    weekly: list[WeekStats]
    weakest: Weakest | None


def pct(part: int, whole: int) -> float | None:
    return round(100 * part / whole, 1) if whole else None


def longest_run(days: list[date]) -> int:
    """Longest run of consecutive calendar days."""
    best = run = 0
    prev = None
    for d in sorted(set(days)):
        run = run + 1 if prev and d - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = d
    return best


def pick_weakest(subjects: list[SubjectStats]) -> Weakest | None:
    rated = [s for s in subjects if s.answered >= MIN_ANSWERED_FOR_WEAKEST]
    if rated:
        worst = min(rated, key=lambda s: s.accuracy)
        return Weakest(subject=worst.subject, reason="lowest_accuracy", accuracy=worst.accuracy)

    # "Not started" means no quizzes AND no interview answers in that subject
    untouched = [s for s in subjects if s.quizzes == 0 and s.interview_answers == 0]
    if untouched:
        return Weakest(subject=untouched[0].subject, reason="not_started", accuracy=None)
    return None


@router.get("", response_model=AnalyticsOut)
def get_analytics(
    today: date = Depends(get_today),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ---- quiz stats per subject (one GROUP BY query) ----
    quiz_rows = (
        db.query(
            QuizAttempt.subject,
            func.count(QuizAttempt.id),
            func.sum(QuizAttempt.score),
            func.sum(QuizAttempt.total),
            func.max(QuizAttempt.score * 100.0 / QuizAttempt.total),
        )
        .filter(QuizAttempt.user_id == user.id)
        .group_by(QuizAttempt.subject)
        .all()
    )
    quiz = {row[0]: row[1:] for row in quiz_rows}

    # ---- question-bank coverage per subject ----
    viewed = dict(
        db.query(ViewedQuestion.subject, func.count())
        .filter(ViewedQuestion.user_id == user.id)
        .group_by(ViewedQuestion.subject)
        .all()
    )
    bank = dict(db.query(Question.subject, func.count()).group_by(Question.subject).all())

    # ---- revision queue ----
    cards = db.query(RevisionCard).filter(RevisionCard.user_id == user.id)
    due = dict(
        cards.filter(RevisionCard.due_date <= today)
        .with_entities(RevisionCard.subject, func.count())
        .group_by(RevisionCard.subject)
        .all()
    )
    mastered = cards.filter(RevisionCard.interval_days >= MASTERED_DAYS).count()

    # ---- mock interviews: per-subject answer count + average score ----
    my_answers = (
        db.query(InterviewAnswer)
        .join(InterviewSession)
        .filter(InterviewSession.user_id == user.id, InterviewAnswer.score.is_not(None))
    )
    interview = {
        subj: (n, avg)
        for subj, n, avg in my_answers.with_entities(
            InterviewAnswer.subject, func.count(), func.avg(InterviewAnswer.score)
        ).group_by(InterviewAnswer.subject)
    }
    overall_avg = my_answers.with_entities(func.avg(InterviewAnswer.score)).scalar()
    interviews_done = (
        db.query(InterviewSession)
        .filter_by(user_id=user.id, status="completed")
        .count()
    )

    subjects = []
    for s in SUBJECTS:
        count, correct, answered, best = quiz.get(s, (0, 0, 0, None))
        subjects.append(SubjectStats(
            subject=s,
            quizzes=count,
            answered=answered or 0,
            correct=correct or 0,
            accuracy=pct(correct or 0, answered or 0),
            best_score=round(best, 1) if best is not None else None,
            viewed=viewed.get(s, 0),
            bank_total=bank.get(s, 0),
            revision_due=due.get(s, 0),
            interview_answers=interview.get(s, (0, None))[0],
            interview_avg=round(float(interview[s][1]), 1) if s in interview else None,
        ))

    # ---- weekly accuracy trend (last 8 weeks, Monday-start, UTC) ----
    utc_today = datetime.now(timezone.utc).date()
    first_week = utc_today - timedelta(days=utc_today.weekday(), weeks=TREND_WEEKS - 1)
    recent = (
        db.query(QuizAttempt.created_at, QuizAttempt.score, QuizAttempt.total)
        .filter(
            QuizAttempt.user_id == user.id,
            QuizAttempt.created_at >= datetime.combine(first_week, datetime.min.time(), timezone.utc),
        )
        .all()
    )
    buckets = {first_week + timedelta(weeks=i): [0, 0, 0] for i in range(TREND_WEEKS)}
    for created_at, score, total in recent:
        d = created_at.astimezone(timezone.utc).date() if created_at.tzinfo else created_at.date()
        week = d - timedelta(days=d.weekday())
        if week in buckets:
            b = buckets[week]
            b[0] += 1
            b[1] += score
            b[2] += total
    weekly = [
        WeekStats(week_start=w, quizzes=n, accuracy=pct(c, t))
        for w, (n, c, t) in buckets.items()
    ]

    # ---- daily challenge ----
    solved_days = [
        d for (d,) in db.query(DailyChallenge.date)
        .filter(DailyChallenge.user_id == user.id, DailyChallenge.solved.is_(True))
        .all()
    ]

    total_answered = sum(s.answered for s in subjects)
    totals = Totals(
        quizzes=sum(s.quizzes for s in subjects),
        accuracy=pct(sum(s.correct for s in subjects), total_answered),
        viewed=sum(s.viewed for s in subjects),
        bank_total=sum(s.bank_total for s in subjects),
        daily_solved=len(solved_days),
        longest_streak=longest_run(solved_days),
        revision_due=sum(due.values()),
        revision_mastered=mastered,
        interviews=interviews_done,
        interview_avg=round(float(overall_avg), 1) if overall_avg is not None else None,
    )

    return AnalyticsOut(
        totals=totals, subjects=subjects, weekly=weekly, weakest=pick_weakest(subjects)
    )
