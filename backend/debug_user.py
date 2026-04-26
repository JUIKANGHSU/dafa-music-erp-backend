import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select
from app.core.security import verify_password

async def check_user():
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.email == "ruikang@example.com")
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User found: {user.email}")
            print(f"Hashed password in DB: {user.hashed_password}")
            is_valid = verify_password("password", user.hashed_password)
            print(f"Password 'password' is valid: {is_valid}")
        else:
            print("User NOT found")

if __name__ == "__main__":
    asyncio.run(check_user())
