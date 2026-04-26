import uuid
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.base import Base

class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id"))
    plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("plans.id"), nullable=True)
    plan_name_snapshot: Mapped[str] = mapped_column(String)
    paid_amount: Mapped[int] = mapped_column(Integer)
    paid_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    payment_method: Mapped[str] = mapped_column(String)  # cash, transfer, etc.
    note: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="paid")  # paid, void
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
