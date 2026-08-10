import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


async def record(
    session: AsyncSession,
    actor: User,
    action: str,
    target_type: str,
    target_id: Optional[uuid.UUID],
    target_label: str,
    detail: Optional[str] = None,
) -> None:
    """
    Append an audit log entry. Caller is responsible for committing the
    session (this just adds to it) so it can share a transaction with the
    actual mutation it's logging.
    """
    log = AuditLog(
        actor_id=actor.id,
        actor_name=actor.name,
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_label=target_label,
        detail=detail,
    )
    session.add(log)
