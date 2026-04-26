import uuid
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.base import Base

class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String)
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("students.id"), nullable=True)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    
    start_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    package_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("lesson_packages.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="scheduled") # scheduled, completed, canceled
    note: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
