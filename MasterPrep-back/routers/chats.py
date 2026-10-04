import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

import ai
from auth import get_current_user
from database import get_db
from models import Chat, Message, User

router = APIRouter(prefix="/chats", tags=["ai chat"])
log = logging.getLogger(__name__)


class ChatOut(BaseModel):
    id: int
    title: str
    updated_at: datetime


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    role: str
    text: str
    created_at: datetime


class ChatDetailOut(ChatOut):
    messages: list[MessageOut]


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class ExchangeOut(BaseModel):
    title: str
    user_message: MessageOut
    ai_message: MessageOut


def get_own_chat(chat_id: int, user: User, db: Session) -> Chat:
    chat = db.get(Chat, chat_id)
    # 404 (not 403) so users can't probe which chat ids exist
    if chat is None or chat.user_id != user.id:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


def make_title(text: str) -> str:
    words = re.sub(r"[^a-zA-Z0-9 ]", "", text).split()
    return " ".join(words[:6]) or "New Chat"


@router.get("", response_model=list[ChatOut])
def list_chats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Chat).filter_by(user_id=user.id).order_by(Chat.updated_at.desc()).all()


@router.post("", response_model=ChatOut, status_code=201)
def create_chat(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = Chat(user_id=user.id)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


@router.get("/{chat_id}", response_model=ChatDetailOut)
def get_chat(chat_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_own_chat(chat_id, user, db)


# Plain `def` (not async): FastAPI runs it in a thread pool, so the slow
# Gemini call doesn't block other requests.
@router.post("/{chat_id}/messages", response_model=ExchangeOut)
def send_message(
    chat_id: int,
    data: MessageIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = get_own_chat(chat_id, user, db)
    history = [(m.role, m.text) for m in chat.messages]

    if chat.title == "New Chat":
        chat.title = make_title(data.text)

    user_msg = Message(chat=chat, role="user", text=data.text)
    chat.updated_at = datetime.now(timezone.utc)
    db.add(user_msg)
    db.commit()

    try:
        answer = ai.answer_question(data.text, history)
    except Exception:
        # Full error goes to the server log; users get a plain message
        log.exception("Gemini request failed")
        raise HTTPException(
            status_code=502,
            detail="The AI assistant is unavailable right now. Please try again in a moment.",
        )

    ai_msg = Message(chat=chat, role="ai", text=answer)
    db.add(ai_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(ai_msg)

    return ExchangeOut(title=chat.title, user_message=user_msg, ai_message=ai_msg)
