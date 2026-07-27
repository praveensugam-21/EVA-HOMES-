from datetime import datetime
from pydantic import BaseModel

from schemas.property import PropertyListItem


class SavedPropertyResponse(BaseModel):
    id: int
    property_id: int
    created_at: datetime
    property: PropertyListItem

    model_config = {"from_attributes": True}


class SavedPropertyListResponse(BaseModel):
    items: list[SavedPropertyResponse]
    total: int
