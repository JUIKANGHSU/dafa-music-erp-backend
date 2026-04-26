import asyncio
from app.db.session import AsyncSessionLocal
from app.models.student import Student
from sqlalchemy import select

async def list_students():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Student))
        students = result.scalars().all()
        print(f"Total Students in DB: {len(students)}")
        for s in students:
            print(f"- {s.name} ({s.phone})")

if __name__ == "__main__":
    asyncio.run(list_students())
