from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
import uuid


from app.api import deps
from app.models.user import User
from app.models.event import Event
from app.models.payment import Payment
from sqlalchemy import delete
from app.schemas.all import UserOut, UserCreate, UserUpdate
from app.core import security

router = APIRouter()

@router.get("", response_model=List[UserOut])
async def read_users(
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None
) -> Any:
    """
    Retrieve users.
    """
    query = select(User).where(User.is_active == True)
    if role:
        query = query.where(User.role == role)
    
    query = query.offset(skip).limit(limit)
    result = await session.execute(query)
    return result.scalars().all()



# ...

@router.post("", response_model=UserOut)
async def create_user(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """

    # Check by email
    stmt = select(User).where(User.email == user_in.email)
    result = await session.execute(stmt)
    if result.scalar_one_or_none():
         raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        name=user_in.name,
        role="teacher", # Default creating teachers for now or allow input? let's stick to 'teacher' or default
        is_active=True
    )
    # The schema doesn't have role input, so we default to 'teacher' or 'user'.
    # For this task "Add Teacher", we can force role='teacher' or update schema.
    # Let's force role='teacher' if not specified, but simpler to just hardcode for MVP if this is "Create Teacher" endpoint.
    # Actually, let's keep it generic but default role to 'teacher' for now as that is the requirement.
    
    session.add(user)
    await session.commit()
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    user_id: uuid.UUID,
    user_in: UserUpdate
) -> Any:
    """
    Update a user.
    """
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_in.model_dump(exclude_unset=True)
    if update_data.get("password"):
        hashed_password = security.get_password_hash(update_data["password"])
        del update_data["password"]
        user.hashed_password = hashed_password

    for field, value in update_data.items():
        setattr(user, field, value)
        
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204, response_model=None)
async def delete_user(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    user_id: uuid.UUID
) -> Any:
    """
    Delete a user.
    """
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user created any payments (audit trail shouldn't be deleted)
    # If we really want to delete, we'd have to cascade or reassign.
    # For now, let's block if payments exist to be safe, or just delete events.
    
    # 1. Delete future events (or all events?)
    stmt = delete(Event).where(Event.teacher_id == user_id)
    await session.execute(stmt)

    # 2. Check payments
    stmt = select(Payment).where(Payment.created_by == user_id).limit(1)
    result = await session.execute(stmt)
    if result.scalar_one_or_none():
         # Soft delete: Deactivate and rename email to release it
         import time
         timestamp = int(time.time())
         user.is_active = False
         user.email = f"deleted_{timestamp}_{user.email}"
         session.add(user)
         await session.commit()
         await session.refresh(user)
         return None

    await session.delete(user)
    await session.commit()
    return None

