from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class SlideSchema(BaseModel):
    index: int
    title: str
    body: str
    image_prompt: Optional[str] = None
    image_url: Optional[str] = None


class CarouselSchema(BaseModel):
    id: str
    topic: str
    brand_id: Optional[str]
    slides: List[SlideSchema]
    status: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
