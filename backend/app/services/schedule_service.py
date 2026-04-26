import uuid
from datetime import datetime, timedelta, date
from sqlalchemy import select
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.lesson_package import LessonPackage
from app.schemas.all import ScheduleCreate

async def generate_events(session: AsyncSession, student_id: uuid.UUID, schedule: ScheduleCreate) -> List[Event]:
    """Generate Event entries for a student's lesson package.

    Args:
        session: Async SQLAlchemy session.
        student_id: UUID of the student.
        schedule: ScheduleCreate containing lesson_package_id, teacher_id, start_date, frequency_days.
    Returns:
        List of created Event objects.
    """
    # Fetch the lesson package with plan relationship
    # We need to import select and options for eager loading or just two queries.
    # Since this is an async session, relationship lazy loading won't work easily without options.
    from sqlalchemy.orm import selectinload
    stmt = select(LessonPackage).options(selectinload(LessonPackage.plan)).where(LessonPackage.id == schedule.lesson_package_id)
    result = await session.execute(stmt)
    pkg = result.scalar_one_or_none()
    
    if not pkg:
        raise ValueError("Lesson package not found")
    if pkg.student_id != student_id:
        raise ValueError("Lesson package does not belong to the student")

    total = pkg.total_lessons
    duration_minutes = pkg.plan.lesson_minutes if pkg.plan else 60
    
    events: List[Event] = []
    
    # Check if we should append to existing used lessons or just schedule all?
    # Usually we schedule 'total' lessons. If some are already used, maybe we shouldn't schedule them?
    # But the request says "Manage Schedule".
    # For now, let's assume we are scheduling all remaining lessons or just 'total' if new.
    # The loop goes range(total). 
    
    # Fetch student for name
    from app.models.student import Student
    student = await session.get(Student, student_id)
    student_name = student.name if student else "Unknown Student"
    plan_name = pkg.plan.name if pkg.plan else "Lesson"

    for i in range(total):
        # schedule.start_date is now datetime
        start_dt = schedule.start_date + timedelta(days=i * schedule.frequency_days)
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        
        event = Event(
            title=student_name,
            start_at=start_dt,
            end_at=end_dt,
            teacher_id=schedule.teacher_id,
            student_id=student_id,
            package_id=pkg.id,
            status="scheduled",
            note=plan_name
        )
        session.add(event)
        events.append(event)
    await session.commit()
    # Refresh to get IDs
    for ev in events:
        await session.refresh(ev)
    return events
