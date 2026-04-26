from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, and_, or_
from datetime import datetime, timezone
import uuid

from app.api import deps
from app.models.event import Event
from app.schemas.all import EventCreate, EventUpdate, EventOut

router = APIRouter()

@router.get("", response_model=List[EventOut])
async def read_events(
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    start: datetime,
    end: datetime,
    teacher_id: Optional[uuid.UUID] = None,
    student_id: Optional[uuid.UUID] = None) -> Any:
    """
    Get events in a time range. Optional filter by teacher.
    """
    # Ensure naive UTC for SQLite comparison
    if start.tzinfo:
        start = start.astimezone(timezone.utc).replace(tzinfo=None)
    if end.tzinfo:
        end = end.astimezone(timezone.utc).replace(tzinfo=None)

    query = select(Event).where(
        and_(
            Event.start_at >= start,
            Event.start_at <= end
        )
    )
    if teacher_id:
        query = query.where(Event.teacher_id == teacher_id)
    
    query = query.filter(Event.status != "canceled")
    
    result = await session.execute(query)
    return result.scalars().all()

@router.post("", response_model=EventOut)
async def create_event(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    event_in: EventCreate
) -> Any:
    """
    Create event with conflict detection.
    """
    # Conflict Check
    # Overlap logic: (StartA < EndB) and (EndA > StartB)
    conflict_query = select(Event).where(
        and_(
            Event.teacher_id == event_in.teacher_id,
            Event.start_at < event_in.end_at,
            Event.end_at > event_in.start_at,
            Event.status != "canceled"
        )
    )
    result = await session.execute(conflict_query)
    if result.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Teacher schedule conflict"
        )
    
    event = Event(**event_in.model_dump())
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event

@router.patch("/{event_id}", response_model=EventOut)
async def update_event(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    event_id: uuid.UUID,
    event_in: EventUpdate
) -> Any:
    """
    Update event with conflict detection.
    """
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check for conflict if timing or teacher changes
    check_conflict = False
    new_start = event_in.start_at or event.start_at
    new_end = event_in.end_at or event.end_at
    new_teacher = event_in.teacher_id or event.teacher_id
    
    if (event_in.start_at or event_in.end_at or event_in.teacher_id):
         # If any critical field changed, we must check conflict excluding SELF
         conflict_query = select(Event).where(
            and_(
                Event.id != event_id, # Exclude self
                Event.teacher_id == new_teacher,
                Event.start_at < new_end,
                Event.end_at > new_start,
                Event.status != "canceled"
            )
        )
         result = await session.execute(conflict_query)
         if result.first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Teacher schedule conflict"
            )
            
    update_data = event_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
        
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event

from datetime import timedelta

@router.post("/{event_id}/leave", response_model=EventOut)
async def event_leave(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    event_id: uuid.UUID
) -> Any:
    """
    Mark event as 'leave' (canceled) and defer it to the end of the package schedule.
    """
    event = await session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.status == "canceled":
        raise HTTPException(status_code=400, detail="Event already canceled")

    # 1. Update current event status
    event.status = "canceled"
    event.note = (event.note or "") + " [Leave/Rescheduled]"
    session.add(event)
    
    # 2. Find package and last event
    if event.package_id:
        # Find the LAST event for this package (excluding canceled ones? or just effective ones?)
        # Logic: We want to append to the end of the *current* schedule.
        # So we look for the event with the latest start_time for this package.
        query = select(Event).where(
            and_(
                Event.package_id == event.package_id,
                Event.status != "canceled"
            )
        ).order_by(Event.start_at.desc()).limit(1)
        
        result = await session.execute(query)
        last_event = result.scalars().first()
        
        if last_event:
            # Create new event 7 days after the last one
            # Assuming weekly cadence. If we wanted to be smarter we'd check frequency...
            # But the requirement says "next week same time".
            new_start = last_event.start_at + timedelta(days=7)
            new_end = last_event.end_at + timedelta(days=7)
            
            new_event = Event(
                title=event.title,
                start_at=new_start,
                end_at=new_end,
                teacher_id=event.teacher_id,
                student_id=event.student_id,
                package_id=event.package_id,
                location=event.location,
                status="scheduled",
                note="Deferred from " + event.start_at.strftime("%Y-%m-%d")
            )
            session.add(new_event)
            
    await session.commit()
    await session.refresh(event)
    return event
