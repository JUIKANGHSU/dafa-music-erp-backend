"""
Sandbox-only fake data seeder. Only ever run this against the local
Docker Postgres (DATABASE_URL pointing at localhost:5432) — never against
the real Supabase database. Creates fictional students so agent/feature
development never touches real student data.
"""
import asyncio
import logging
import uuid
from datetime import date, timedelta

from sqlalchemy import select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models import Student, Plan, Payment, LessonPackage, User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FAKE_STUDENTS = [
    {"name": "測試-陳小明", "phone": "0900000001", "remaining": 1},
    {"name": "測試-林小華", "phone": "0900000002", "remaining": 2},
    {"name": "測試-王小美", "phone": "0900000003", "remaining": 0},
    {"name": "測試-張小強", "phone": "0900000004", "remaining": 6},
    {"name": "測試-李小芳", "phone": "0900000005", "remaining": 1},
]


async def seed_sandbox():
    if "localhost" not in settings.SQLALCHEMY_DATABASE_URI and "127.0.0.1" not in settings.SQLALCHEMY_DATABASE_URI:
        raise RuntimeError(
            f"Refusing to seed fake data: DATABASE_URL does not look like localhost "
            f"({settings.SQLALCHEMY_DATABASE_URI}). This script must only run against the sandbox DB."
        )

    async with AsyncSessionLocal() as session:
        plan = (await session.execute(select(Plan).limit(1))).scalars().first()
        teacher = (await session.execute(select(User).where(User.role == "teacher").limit(1))).scalars().first()
        if not plan or not teacher:
            raise RuntimeError("Run seed.py first to create base plans/teachers.")

        for s in FAKE_STUDENTS:
            existing = (await session.execute(select(Student).where(Student.name == s["name"]))).scalars().first()
            if existing:
                logger.info(f"Skip existing: {s['name']}")
                continue

            student = Student(
                name=s["name"],
                phone=s["phone"],
                line_user_id=f"SANDBOX_FAKE_{uuid.uuid4().hex[:8]}",
                status="active",
            )
            session.add(student)
            await session.flush()

            total = s["remaining"] + 5
            payment = Payment(
                student_id=student.id,
                plan_id=plan.id,
                plan_name_snapshot=plan.name + "（測試假資料）",
                paid_amount=plan.price,
                payment_method="cash",
                note="SANDBOX 假資料，非真實繳費",
                created_by=teacher.id,
            )
            session.add(payment)
            await session.flush()

            package = LessonPackage(
                student_id=student.id,
                payment_id=payment.id,
                plan_id=plan.id,
                total_lessons=total,
                used_lessons=total - s["remaining"],
                start_date=date.today() - timedelta(days=30),
                status="active",
            )
            session.add(package)
            logger.info(f"Created {s['name']} (remaining={s['remaining']})")

        await session.commit()
        logger.info("Sandbox seeding completed.")


if __name__ == "__main__":
    asyncio.run(seed_sandbox())
