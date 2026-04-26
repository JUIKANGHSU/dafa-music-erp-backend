import asyncio
import logging
import uuid
from app.db.session import AsyncSessionLocal
from app.models import User, Plan
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Check if users exist
        user_check = await session.get(User, uuid.UUID("00000000-0000-0000-0000-000000000000")) 
        # Just creating if empty query
        
        # Create Teachers
        teachers = [
            {"name": "瑞康 (Rui Kang)", "email": "ruikang@example.com", "password": "password"},
            {"name": "太太 (Tai Tai)", "email": "taitai@example.com", "password": "password"},
        ]
        
        for t in teachers:
            # Check exist
            from sqlalchemy import select
            stmt = select(User).where(User.email == t["email"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                user = User(
                    name=t["name"],
                    email=t["email"],
                    hashed_password=get_password_hash(t["password"]),
                    role="teacher"
                )
                session.add(user)
                logger.info(f"Created user: {t['name']}")

        # Create Plans
        plans = [
            {"name": "爵士鼓體驗 (30min)", "lesson_minutes": 30, "total_lessons": 1, "price": 500},
            {"name": "爵士鼓常規 (60min)", "lesson_minutes": 60, "total_lessons": 4, "price": 2400},
            {"name": "爵士鼓一期 (60min x 10)", "lesson_minutes": 60, "total_lessons": 10, "price": 6000},
        ]

        for p in plans:
            # Simple check by name
            stmt = select(Plan).where(Plan.name == p["name"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                plan = Plan(**p)
                session.add(plan)
                logger.info(f"Created plan: {p['name']}")
                
        await session.commit()
        logger.info("Seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed_data())
