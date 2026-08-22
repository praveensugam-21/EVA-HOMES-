from datetime import date, time
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class AvailabilitySlotCreate(BaseModel):
    property_id: int = Field(gt=0)
    specific_date: date
    start_time: time
    end_time: time

    @field_validator("specific_date")
    @classmethod
    def date_not_in_past(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("Slot date cannot be in the past.")
        return value

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, value: time, info) -> time:
        start = info.data.get("start_time")
        if start is not None and value <= start:
            raise ValueError("End time must be after start time.")
        return value


class AvailabilitySlotResponse(BaseModel):
    id: int
    property_id: int
    specific_date: date
    start_time: time
    end_time: time
    is_booked: bool

    property_title: Optional[str] = None

    model_config = {"from_attributes": True}


class AvailabilitySlotListResponse(BaseModel):
    items: list[AvailabilitySlotResponse]
    total: int
