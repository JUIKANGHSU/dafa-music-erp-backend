from typing import Any, List, Optional
import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api import deps
from app.models.audit_log import AuditLog
from app.schemas.all import AuditLogOut

router = APIRouter()


@router.get("/audit-logs", response_model=List[AuditLogOut])
async def read_audit_logs(
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    skip: int = 0,
    limit: int = 100,
    target_type: Optional[str] = None,
    target_id: Optional[uuid.UUID] = None,
) -> Any:
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if target_type:
        query = query.where(AuditLog.target_type == target_type)
    if target_id:
        query = query.where(AuditLog.target_id == target_id)
    query = query.offset(skip).limit(limit)

    result = await session.execute(query)
    return result.scalars().all()
