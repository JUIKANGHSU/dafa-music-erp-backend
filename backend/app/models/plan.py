import uuid
from typing import Optional
from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)  # e.g., "Drum 10 Lessons"
    lesson_minutes: Mapped[int] = mapped_column(Integer)
    total_lessons: Mapped[int] = mapped_column(Integer)
    price: Mapped[int] = mapped_column(Integer)
    valid_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
