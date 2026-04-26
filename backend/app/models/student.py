import uuid
from typing import Optional, List
from sqlalchemy import String, Date, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.base import Base

class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, index=True)
    nickname: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    dob: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    phone: Mapped[str] = mapped_column(String)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    line_user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tags: Mapped[List[str]] = mapped_column(JSON, default=[])
    status: Mapped[str] = mapped_column(String, default="active")
    
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
