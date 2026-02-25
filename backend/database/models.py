"""
SQLAlchemy ORM models — users + evaluations
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="expert")  # admin | expert
    full_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    evaluations: Mapped[list["Evaluation"]] = relationship(back_populates="evaluator")


class Evaluation(Base):
    __tablename__ = "evaluations"
    __table_args__ = (
        UniqueConstraint(
            "experiment_id", "task_id", "model_id", "run_index", "evaluator_id",
            name="uq_evaluation_run",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    experiment_id: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    task_id: Mapped[str] = mapped_column(String(50), nullable=False)
    model_id: Mapped[str] = mapped_column(String(100), nullable=False)
    run_index: Mapped[int] = mapped_column(Integer, nullable=False)
    evaluator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    # SMOP scores (0–10, step 2)
    s_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    m_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    o_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    p_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    q_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    evaluator: Mapped["User"] = relationship(back_populates="evaluations")
