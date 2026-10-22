from datetime import date
from typing import Any, Literal
from pydantic import BaseModel, Field, model_validator

class TripCreate(BaseModel):
    destination: str = Field(min_length=2, max_length=120)
    start_date: date
    end_date: date
    budget: float = Field(ge=0, le=100_000_000)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    party_size: int = Field(default=1, ge=1, le=50)
    travel_style: Literal["solo", "couple", "group"] = "solo"
    interests: list[str] = Field(default_factory=list)
    pace: Literal["relaxed", "balanced", "packed"] = "balanced"
    accommodation: Literal["budget", "mid-range", "premium"] = "mid-range"
    notes: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def dates_valid(self):
        if self.end_date < self.start_date:
            raise ValueError("End date must be on or after start date.")
        if (self.end_date - self.start_date).days > 30:
            raise ValueError("Trips are limited to 31 calendar days in this starter.")
        return self

class TripUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=160)
    destination: str | None = Field(default=None, min_length=2, max_length=120)
    budget: float | None = Field(default=None, ge=0, le=100_000_000)

class DayUpdate(BaseModel):
    day: dict[str, Any]

class GenerateRequest(BaseModel):
    regenerate_day: int | None = Field(default=None, ge=1, le=31)

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)

class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=12)
    destination: str | None = Field(default=None, max_length=120)
