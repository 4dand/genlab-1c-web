"""
Pydantic schemas for API request / response
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Users ──

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4, max_length=128)
    role: str = Field(default="expert", pattern="^(admin|expert)$")
    full_name: str = Field(default="", max_length=200)


class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str  # user id
    username: str
    role: str


# ── Evaluations ──

class EvaluationCreate(BaseModel):
    experiment_id: str
    task_id: str
    model_id: str
    run_index: int = Field(ge=0)
    scores: dict[str, int]  # {"S": 10, "M": 8, "O": 6, "P": 4}
    comment: str = ""


class EvaluationResponse(BaseModel):
    id: int
    experiment_id: str
    task_id: str
    model_id: str
    run_index: int
    evaluator_id: str
    s_score: Optional[int] = None
    m_score: Optional[int] = None
    o_score: Optional[int] = None
    p_score: Optional[int] = None
    q_score: Optional[float] = None
    comment: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EvaluationProgress(BaseModel):
    total_runs: int
    evaluated_runs: int
    progress_percent: float
    status: str  # not_started | in_progress | completed
