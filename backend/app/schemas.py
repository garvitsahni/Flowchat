"""Pydantic models for every request/response — no raw dicts across the API boundary.

Response contract is LOCKED per ARCHITECTURE.md §4. Do not change the shape without
flagging it to the rest of the team (AGENTS.md: shared contract rule).
"""

from typing import Any, Literal

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    language: Literal["en", "hi"] = "en"


class Explainability(BaseModel):
    sql: str
    floats_used: list[str] = Field(default_factory=list)
    qc_excluded_count: int = 0
    time_range_queried: str = ""


ChartType = Literal["depth_profile", "trajectory", "time_series", "comparison", "none"]
Confidence = Literal["high", "low"]


class QueryResponse(BaseModel):
    """The §4 contract. Frontend builds every component against this shape."""

    answer_text: str
    language: Literal["en", "hi"]
    chart_type: ChartType
    chart_data: dict[str, Any] = Field(default_factory=dict)
    confidence: Confidence
    confidence_note: str = ""
    explainability: Explainability


class HealthResponse(BaseModel):
    status: str
    db_connected: bool


class UnsupportedIntent(Exception):
    """Raised when the orchestrator cannot answer a question from this schema."""