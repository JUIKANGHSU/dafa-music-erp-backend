import uuid
from typing import Optional
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db.base import Base
# from app.models.plan import Plan # avoid circular import if possible, use string "Plan"

class LessonPackage(Base):
    __tablename__ = "lesson_packages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id"))
    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id"))
    plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("plans.id"), nullable=True)
    teacher_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)

    total_lessons: Mapped[int] = mapped_column(Integer)
    used_lessons: Mapped[int] = mapped_column(Integer, default=0)
    start_date: Mapped[Date] = mapped_column(Date)
    expire_date: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active") # active, expired, closed
    last_reminder_sent_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    plan: Mapped["Plan"] = relationship("Plan")

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
