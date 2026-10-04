from datetime import date, datetime, timezone
from sqlalchemy import (
    JSON, Boolean, Date, DateTime, Float, ForeignKey, ForeignKeyConstraint, Integer, String,
    Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------- QUESTION BANK ----------------
# Question ids restart at 1 in every subject, so a question is
# identified by (subject, question_id), never by question_id alone.
class Question(Base):
    __tablename__ = "questions"

    subject: Mapped[str] = mapped_column(String(10), primary_key=True)
    question_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(10))  # Easy / Medium / Hard
    answer: Mapped[str] = mapped_column(Text)


QUESTION_FK = (["subject", "question_id"], ["questions.subject", "questions.question_id"])


# ---------------- MCQ BANK (quizzes + daily challenge) ----------------
class McqQuestion(Base):
    """Multiple-choice question. `answer` is the correct option's letter (a-d)
    and never leaves the server until the question has been answered."""
    __tablename__ = "mcq_questions"

    subject: Mapped[str] = mapped_column(String(10), primary_key=True)
    question_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(Text)
    code: Mapped[str | None] = mapped_column(Text)  # optional code snippet
    options: Mapped[list] = mapped_column(JSON)     # 4 option strings
    answer: Mapped[str] = mapped_column(String(1))
    explanation: Mapped[str] = mapped_column(Text, default="")

    @property
    def correct_option(self) -> str:
        return self.options["abcd".index(self.answer)]


MCQ_FK = (["subject", "question_id"], ["mcq_questions.subject", "mcq_questions.question_id"])


class ViewedQuestion(Base):
    __tablename__ = "viewed_questions"
    __table_args__ = (
        ForeignKeyConstraint(*QUESTION_FK, ondelete="CASCADE", name="fk_viewed_questions_question"),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    subject: Mapped[str] = mapped_column(String(10), primary_key=True)
    question_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (
        UniqueConstraint("user_id", "subject", "question_id"),
        ForeignKeyConstraint(*QUESTION_FK, ondelete="CASCADE", name="fk_bookmarks_question"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subject: Mapped[str] = mapped_column(String(10))
    question_id: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    question: Mapped[Question] = relationship()


# ---------------- QUIZZES ----------------
class QuizSession(Base):
    """A quiz handed out by the server: which questions were served and
    until when answers are accepted. Becomes a QuizAttempt on submit."""
    __tablename__ = "quiz_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subject: Mapped[str] = mapped_column(String(10))
    question_ids: Mapped[list] = mapped_column(JSON)  # served order
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subject: Mapped[str] = mapped_column(String(10))
    score: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    # [{question, options, selected, correct, isCorrect}, ...]
    review: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------- DAILY CHALLENGE ----------------
class DailyChallenge(Base):
    __tablename__ = "daily_challenges"
    __table_args__ = (
        UniqueConstraint("user_id", "date"),
        ForeignKeyConstraint(*MCQ_FK, ondelete="CASCADE", name="fk_daily_challenges_mcq"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date] = mapped_column(Date)
    subject: Mapped[str] = mapped_column(String(10))
    question_id: Mapped[int] = mapped_column(Integer)
    solved: Mapped[bool] = mapped_column(Boolean, default=False)
    solved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    mcq: Mapped[McqQuestion] = relationship()


# ---------------- REVISION QUEUE (spaced repetition) ----------------
class RevisionCard(Base):
    """One question a user is revising.

    kind="theory": a question-bank question (row in `questions`)
    kind="mcq":    a multiple-choice question (row in `mcq_questions`)
    """
    __tablename__ = "revision_cards"
    __table_args__ = (
        UniqueConstraint("user_id", "kind", "subject", "question_id", name="uq_revision_card"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(10))
    subject: Mapped[str] = mapped_column(String(10))
    question_id: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(20))  # quiz / daily / bookmark / interview

    # scheduling state (see srs.py)
    ease: Mapped[float] = mapped_column(Float, default=2.5)
    interval_days: Mapped[int] = mapped_column(Integer, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    lapses: Mapped[int] = mapped_column(Integer, default=0)
    due_date: Mapped[date] = mapped_column(Date, index=True)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------- AI MOCK INTERVIEW ----------------
class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    subject: Mapped[str | None] = mapped_column(String(10))      # None = mixed subjects
    difficulty: Mapped[str | None] = mapped_column(String(10))   # None = any
    status: Mapped[str] = mapped_column(String(10), default="active")  # active / completed
    avg_score: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    answers: Mapped[list["InterviewAnswer"]] = relationship(
        back_populates="session", order_by="InterviewAnswer.position",
        cascade="all, delete-orphan",
    )


class InterviewAnswer(Base):
    """One interview question; the answer fields fill in once it's answered."""
    __tablename__ = "interview_answers"
    __table_args__ = (
        UniqueConstraint("session_id", "position", name="uq_interview_answer_position"),
        ForeignKeyConstraint(
            *QUESTION_FK, ondelete="CASCADE", name="fk_interview_answers_question"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)  # 1-based order in the interview
    subject: Mapped[str] = mapped_column(String(10))
    question_id: Mapped[int] = mapped_column(Integer)

    answer_text: Mapped[str | None] = mapped_column(Text)
    skipped: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[int | None] = mapped_column(Integer)  # 0-10
    # {covered: [...], missing: [...], feedback: "...", follow_up: "..."}
    feedback: Mapped[dict | None] = mapped_column(JSON)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    session: Mapped[InterviewSession] = relationship(back_populates="answers")
    question: Mapped[Question] = relationship()


# ---------------- AI DOUBT CHAT ----------------
class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(100), default="New Chat")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    messages: Mapped[list["Message"]] = relationship(
        back_populates="chat", order_by="Message.id", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(
        ForeignKey("chats.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(10))  # "user" or "ai"
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    chat: Mapped[Chat] = relationship(back_populates="messages")
