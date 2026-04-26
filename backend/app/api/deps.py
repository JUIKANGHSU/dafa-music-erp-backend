import uuid
from typing import Annotated, AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.schemas.all import TokenPayload

ReusableOAuth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

SessionDep = Annotated[AsyncSession, Depends(get_db)]
TokenDep = Annotated[str, Depends(ReusableOAuth2)]

async def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        # print(f"DEBUG: Receiving token: {token[:10]}...")
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        # print(f"DEBUG: Token payload: {payload}")
    except (JWTError, ValidationError) as e:
        # print(f"DEBUG: Token validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    try:
        user_uuid = uuid.UUID(token_data.sub)
        user = await session.get(User, user_uuid)
    except Exception as e:
        # print(f"DEBUG: User lookup failed: {e}")
        raise HTTPException(status_code=500, detail="User lookup error")
        
    if not user:
        print(f"DEBUG: User not found for ID: {token_data.sub}")
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]
