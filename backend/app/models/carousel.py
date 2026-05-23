from sqlalchemy import Column, String, Integer, JSON, DateTime, func
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Carousel(Base):
    __tablename__ = "carousels"

    id = Column(String, primary_key=True)
    topic = Column(String, nullable=False)
    brand_id = Column(String, nullable=True)
    slides = Column(JSON, nullable=False, default=list)
    status = Column(String, default="pending")
    slide_count = Column(Integer, default=6)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
