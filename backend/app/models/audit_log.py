import uuid
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_name: Mapped[str] = mapped_column(String)

    action: Mapped[str] = mapped_column(String, index=True)  # e.g. "student.archived"
    target_type: Mapped[str] = mapped_column(String, index=True)  # e.g. "student"
    target_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True, index=True)
    target_label: Mapped[str] = mapped_column(String)  # human-readable, e.g. student name

    detail: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
