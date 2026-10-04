"""mcq bank and server quiz sessions

Moves the quiz MCQs (previously public JSON files, answers included) into
the database, adds server-issued quiz sessions, and makes daily challenges and
MCQ revision cards point at MCQ rows instead of storing their own copies.

Revision ID: e0156e3ce9f9
Revises: 3123c7b8ccaf
Create Date: 2026-10-04

"""
import json
from pathlib import Path
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0156e3ce9f9'
down_revision: Union[str, Sequence[str], None] = '3123c7b8ccaf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_DIR = Path(__file__).resolve().parents[2] / "seed_data" / "mcq"


def load_seed_mcqs() -> list[dict]:
    rows = []
    for path in sorted(SEED_DIR.glob("*.json")):
        for q in json.loads(path.read_text(encoding="utf-8")):
            rows.append({
                "subject": q["subject"],
                "question_id": q["id"],
                "question": q["question"],
                "code": q.get("code"),
                "options": q["options"],
                "answer": q["answer"].lower(),
                "explanation": q.get("explanation", ""),
            })
    return rows


def upgrade() -> None:
    conn = op.get_bind()

    # 1. MCQ bank
    mcq = op.create_table(
        'mcq_questions',
        sa.Column('subject', sa.String(length=10), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('code', sa.Text(), nullable=True),
        sa.Column('options', sa.JSON(), nullable=False),
        sa.Column('answer', sa.String(length=1), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('subject', 'question_id'),
    )
    op.bulk_insert(mcq, load_seed_mcqs())

    # 2. Server-issued quiz sessions
    op.create_table(
        'quiz_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('subject', sa.String(length=10), nullable=False),
        sa.Column('question_ids', sa.JSON(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_quiz_sessions_user_id', 'quiz_sessions', ['user_id'])

    # 3. Daily challenges: JSON copy of the question -> (subject, question_id)
    with op.batch_alter_table('daily_challenges') as batch:
        batch.add_column(sa.Column('subject', sa.String(length=10), nullable=True))
        batch.add_column(sa.Column('question_id', sa.Integer(), nullable=True))

    daily = sa.table(
        'daily_challenges',
        sa.column('id', sa.Integer), sa.column('question', sa.JSON),
        sa.column('subject', sa.String), sa.column('question_id', sa.Integer),
    )
    known = {(r.subject, r.question_id) for r in conn.execute(sa.text(
        "SELECT subject, question_id FROM mcq_questions"))}
    for row in conn.execute(sa.select(daily.c.id, daily.c.question)).all():
        q = row.question if isinstance(row.question, dict) else json.loads(row.question)
        key = (q.get("subject"), int(q.get("id", -1)))
        if key in known:
            conn.execute(daily.update().where(daily.c.id == row.id)
                         .values(subject=key[0], question_id=key[1]))
        else:  # points at a question that doesn't exist; nothing to keep
            conn.execute(daily.delete().where(daily.c.id == row.id))

    with op.batch_alter_table('daily_challenges') as batch:
        batch.alter_column('subject', existing_type=sa.String(length=10), nullable=False)
        batch.alter_column('question_id', existing_type=sa.Integer(), nullable=False)
        batch.drop_column('question')
        batch.create_foreign_key(
            'fk_daily_challenges_mcq', 'mcq_questions',
            ['subject', 'question_id'], ['subject', 'question_id'], ondelete='CASCADE',
        )

    # 4. Revision cards: drop snapshots; remove MCQ cards with no matching question
    rev = sa.table(
        'revision_cards',
        sa.column('id', sa.Integer), sa.column('kind', sa.String),
        sa.column('subject', sa.String), sa.column('question_id', sa.Integer),
    )
    for row in conn.execute(sa.select(rev.c.id, rev.c.subject, rev.c.question_id)
                            .where(rev.c.kind == 'mcq')).all():
        if (row.subject, row.question_id) not in known:
            conn.execute(rev.delete().where(rev.c.id == row.id))

    with op.batch_alter_table('revision_cards') as batch:
        batch.drop_column('content')


def downgrade() -> None:
    with op.batch_alter_table('revision_cards') as batch:
        batch.add_column(sa.Column('content', sa.JSON(), nullable=True))

    with op.batch_alter_table('daily_challenges') as batch:
        batch.drop_constraint('fk_daily_challenges_mcq', type_='foreignkey')
        batch.add_column(sa.Column('question', sa.JSON(), nullable=True))

    # rebuild the JSON copies from the MCQ table
    conn = op.get_bind()
    rows = conn.execute(sa.text(
        "SELECT d.id, m.subject, m.question_id, m.question, m.options, m.answer, m.explanation "
        "FROM daily_challenges d JOIN mcq_questions m "
        "ON m.subject = d.subject AND m.question_id = d.question_id")).all()
    daily = sa.table('daily_challenges', sa.column('id', sa.Integer), sa.column('question', sa.JSON))
    for r in rows:
        options = r.options if isinstance(r.options, list) else json.loads(r.options)
        conn.execute(daily.update().where(daily.c.id == r.id).values(question={
            "id": r.question_id, "subject": r.subject, "question": r.question,
            "options": options, "answer": r.answer, "explanation": r.explanation,
        }))

    with op.batch_alter_table('daily_challenges') as batch:
        batch.alter_column('question', existing_type=sa.JSON(), nullable=False)
        batch.drop_column('question_id')
        batch.drop_column('subject')

    op.drop_index('ix_quiz_sessions_user_id', table_name='quiz_sessions')
    op.drop_table('quiz_sessions')
    op.drop_table('mcq_questions')
