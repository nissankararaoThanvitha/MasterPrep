"""question bank table

Moves the theory question bank (previously JSON files bundled into the
frontend) into the database, and links bookmarks / viewed questions to it.

Revision ID: 2fe8fb6878ca
Revises: a5746795b570
Create Date: 2026-10-04

"""
import json
from pathlib import Path
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2fe8fb6878ca'
down_revision: Union[str, Sequence[str], None] = 'a5746795b570'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_DIR = Path(__file__).resolve().parents[2] / "seed_data" / "questions"


def load_seed_questions() -> list[dict]:
    rows = []
    for path in sorted(SEED_DIR.glob("*.json")):
        for q in json.loads(path.read_text(encoding="utf-8")):
            rows.append({
                "subject": q["subject"],
                "question_id": q["id"],
                "title": q["title"],
                "difficulty": q["difficulty"],
                "answer": q["answer"],
            })
    return rows


def upgrade() -> None:
    questions = op.create_table(
        'questions',
        sa.Column('subject', sa.String(length=10), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('difficulty', sa.String(length=10), nullable=False),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('subject', 'question_id'),
    )

    # Load the questions before adding the foreign keys, so existing
    # bookmarks / viewed rows already have something to point at.
    op.bulk_insert(questions, load_seed_questions())

    op.create_foreign_key(
        'fk_bookmarks_question', 'bookmarks', 'questions',
        ['subject', 'question_id'], ['subject', 'question_id'], ondelete='CASCADE',
    )
    op.create_foreign_key(
        'fk_viewed_questions_question', 'viewed_questions', 'questions',
        ['subject', 'question_id'], ['subject', 'question_id'], ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint('fk_viewed_questions_question', 'viewed_questions', type_='foreignkey')
    op.drop_constraint('fk_bookmarks_question', 'bookmarks', type_='foreignkey')
    op.drop_table('questions')
