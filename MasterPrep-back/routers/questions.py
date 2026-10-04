from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, selectinload

from auth import get_current_user
from database import get_db
from models import Bookmark, Question, User, ViewedQuestion
from revision_cards import add_card, get_today
from schemas import BookmarkCategory, Subject

router = APIRouter(tags=["questions"])

Difficulty = Literal["Easy", "Medium", "Hard"]


class QuestionRef(BaseModel):
    subject: Subject
    question_id: int


class QuestionOut(QuestionRef):
    model_config = ConfigDict(from_attributes=True)

    title: str
    difficulty: str


class QuestionPage(BaseModel):
    items: list[QuestionOut]
    total: int
    page: int
    page_size: int


class AnswerOut(BaseModel):
    answer: str


class BookmarkIn(QuestionRef):
    category: BookmarkCategory


class BookmarkOut(BookmarkIn):
    title: str
    difficulty: str
    answer: str
    created_at: datetime


def get_question(subject: str, question_id: int, db: Session) -> Question:
    question = db.get(Question, {"subject": subject, "question_id": question_id})
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


# ---------------- QUESTION BANK ----------------
@router.get("/questions", response_model=QuestionPage)
def list_questions(
    subject: Subject | None = None,
    difficulty: Difficulty | None = None,
    search: str = Query("", max_length=200),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Questions without their answers; answers come from /view."""
    query = db.query(Question)
    if subject:
        query = query.filter(Question.subject == subject)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if search.strip():
        query = query.filter(Question.title.icontains(search.strip(), autoescape=True))

    total = query.count()
    items = (
        query.order_by(Question.subject, Question.question_id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return QuestionPage(items=items, total=total, page=page, page_size=page_size)


@router.post("/questions/{subject}/{question_id}/view", response_model=AnswerOut)
def view_answer(
    subject: Subject,
    question_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the answer and records that this user has viewed it."""
    question = get_question(subject, question_id, db)

    key = {"user_id": user.id, "subject": subject, "question_id": question_id}
    if db.get(ViewedQuestion, key) is None:
        db.add(ViewedQuestion(**key))
        db.commit()

    return AnswerOut(answer=question.answer)


@router.get("/viewed", response_model=list[QuestionRef])
def list_viewed(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(ViewedQuestion).filter_by(user_id=user.id).all()
    return [QuestionRef(subject=r.subject, question_id=r.question_id) for r in rows]


# ---------------- BOOKMARKS ----------------
def to_bookmark_out(b: Bookmark) -> BookmarkOut:
    return BookmarkOut(
        subject=b.subject,
        question_id=b.question_id,
        category=b.category,
        title=b.question.title,
        difficulty=b.question.difficulty,
        answer=b.question.answer,
        created_at=b.created_at,
    )


@router.get("/bookmarks", response_model=list[BookmarkOut])
def list_bookmarks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bookmarks = (
        db.query(Bookmark)
        .options(selectinload(Bookmark.question))  # one query for all questions
        .filter_by(user_id=user.id)
        .order_by(Bookmark.created_at.desc())
        .all()
    )
    return [to_bookmark_out(b) for b in bookmarks]


@router.put("/bookmarks", response_model=BookmarkOut)
def save_bookmark(
    data: BookmarkIn,
    today: date = Depends(get_today),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates the bookmark, or changes its category if it already exists."""
    get_question(data.subject, data.question_id, db)

    bookmark = (
        db.query(Bookmark)
        .filter_by(user_id=user.id, subject=data.subject, question_id=data.question_id)
        .first()
    )
    if bookmark is None:
        bookmark = Bookmark(user_id=user.id, subject=data.subject, question_id=data.question_id)
        db.add(bookmark)

    bookmark.category = data.category
    if data.category == "Revise Later":
        add_card(
            db, user_id=user.id, kind="theory", subject=data.subject,
            question_id=data.question_id, source="bookmark", today=today, missed=False,
        )
    db.commit()
    db.refresh(bookmark)
    return to_bookmark_out(bookmark)


@router.delete("/bookmarks/{subject}/{question_id}", status_code=204)
def delete_bookmark(
    subject: Subject,
    question_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Bookmark).filter_by(
        user_id=user.id, subject=subject, question_id=question_id
    ).delete()
    db.commit()
    return Response(status_code=204)
