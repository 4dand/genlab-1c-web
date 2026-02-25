"""initial: users and evaluations tables

Revision ID: 0001
Revises:
Create Date: 2026-04-06
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("username", sa.String(100), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="expert"),
        sa.Column("full_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "evaluations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("experiment_id", sa.String(200), nullable=False, index=True),
        sa.Column("task_id", sa.String(50), nullable=False),
        sa.Column("model_id", sa.String(100), nullable=False),
        sa.Column("run_index", sa.Integer(), nullable=False),
        sa.Column("evaluator_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("s_score", sa.Integer(), nullable=True),
        sa.Column("m_score", sa.Integer(), nullable=True),
        sa.Column("o_score", sa.Integer(), nullable=True),
        sa.Column("p_score", sa.Integer(), nullable=True),
        sa.Column("q_score", sa.Float(), nullable=True),
        sa.Column("comment", sa.Text(), server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "experiment_id", "task_id", "model_id", "run_index", "evaluator_id",
            name="uq_evaluation_run",
        ),
    )


def downgrade() -> None:
    op.drop_table("evaluations")
    op.drop_table("users")
