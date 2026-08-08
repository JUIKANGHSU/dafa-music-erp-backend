from typing import Any, List, Optional
from fastapi import APIRouter, HTTPException
from sqlalchemy import select, or_
import uuid

from app.api import deps
from app.models.student import Student
from app.models.lesson_package import LessonPackage
from app.models.plan import Plan
from app.models.event import Event
from app.models.payment import Payment
from app.models.attendance import AttendanceLog
from app.models.user import User
from sqlalchemy import delete, update as sql_update
from app.schemas.all import StudentCreate, StudentUpdate, StudentOut, ScheduleCreate, EventOut, PackageOut, LessonPackageUpdate, LessonRecordOut

router = APIRouter()

@router.get("", response_model=List[StudentOut])
async def read_students(
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    skip: int = 0,
    limit: int = 100,
    keyword: Optional[str] = None
) -> Any:
    """
    Retrieve students.
    """
    query = select(Student)
    if keyword:
        query = query.where(
            or_(
                Student.name.ilike(f"%{keyword}%"),
                Student.phone.ilike(f"%{keyword}%"),
                Student.nickname.ilike(f"%{keyword}%")
            )
        )
    query = query.offset(skip).limit(limit).order_by(Student.created_at.desc())
    result = await session.execute(query)
    students = result.scalars().all()
    
    if students:
        student_ids = [s.id for s in students]
        # Fetch active packages
        # We need to import models inside function or at top. Using explicit strings in query if needed, but better to import.
        # Assuming imports are added at top.
        
        pkg_query = (
            select(LessonPackage, Plan.name)
            .join(Plan, LessonPackage.plan_id == Plan.id)
            .where(LessonPackage.student_id.in_(student_ids))
            .where(LessonPackage.status == 'active')
        )
        pkg_result = await session.execute(pkg_query)
        
        pkg_map = {}
        for pkg, plan_name in pkg_result:
            pkg_map[pkg.student_id] = {
                "active_plan": plan_name,
                "remaining_lessons": pkg.total_lessons - pkg.used_lessons
            }
            
        for s in students:
            if s.id in pkg_map:
                setattr(s, "active_plan", pkg_map[s.id]["active_plan"])
                setattr(s, "remaining_lessons", pkg_map[s.id]["remaining_lessons"])
                
    return students

@router.post("", response_model=StudentOut)
async def create_student(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_in: StudentCreate
) -> Any:
    """
    Create new student.
    """
    student = Student(**student_in.model_dump())
    session.add(student)
    await session.commit()
    await session.refresh(student)
    return student

@router.get("/{student_id}", response_model=StudentOut)
async def read_student(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID
) -> Any:
    """
    Get student by ID.
    """
    student = await session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.patch("/{student_id}", response_model=StudentOut)
async def update_student(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
    student_in: StudentUpdate
) -> Any:
    """
    Update a student.
    """
    student = await session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    update_data = student_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(student, field, value)
        
    session.add(student)
    await session.commit()
    await session.refresh(student)
    return student

from app.services.schedule_service import generate_events

@router.post("/{student_id}/schedule", response_model=List[EventOut])
async def schedule_lessons(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
    schedule_in: ScheduleCreate,
) -> Any:
    """Generate lesson events for a student's lesson package.

    The schedule includes a start date and optional frequency (days between lessons).
    """
    try:
        events = await generate_events(session, student_id, schedule_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return events

@router.delete("/{student_id}", status_code=204, response_model=None)
async def delete_student(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID
) -> Any:
    """
    Delete a student.
    """
    student = await session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Cascade delete
    try:
        # 0. Get student packages
        pkg_query = select(LessonPackage.id).where(LessonPackage.student_id == student_id)
        pkg_result = await session.execute(pkg_query)
        pkg_ids = pkg_result.scalars().all()

        # 1. Events
        # Delete events for this student OR events linked to this student's packages
        if pkg_ids:
            stmt = delete(Event).where(
                or_(
                    Event.student_id == student_id,
                    Event.package_id.in_(pkg_ids)
                )
            )
        else:
            stmt = delete(Event).where(Event.student_id == student_id)
        await session.execute(stmt)

        # 2. Packages
        stmt = delete(LessonPackage).where(LessonPackage.student_id == student_id)
        await session.execute(stmt)

        # 3. Payments
        stmt = delete(Payment).where(Payment.student_id == student_id)
        await session.execute(stmt)

        # 4. Attendance logs
        stmt = delete(AttendanceLog).where(AttendanceLog.student_id == student_id)
        await session.execute(stmt)

        await session.delete(student)
        await session.commit()
    except Exception as e:
        await session.rollback()
        # Log error here if logger available
        print(f"Error deleting student {student_id}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to delete student: {str(e)}")
        
    return None


@router.get("/{student_id}/packages", response_model=List[PackageOut])
async def read_student_packages(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
) -> Any:
    pkg_query = (
        select(LessonPackage, User.name.label("teacher_name"))
        .outerjoin(User, LessonPackage.teacher_id == User.id)
        .where(LessonPackage.student_id == student_id)
        .order_by(LessonPackage.created_at.desc())
    )
    result = await session.execute(pkg_query)
    rows = result.all()
    packages = []
    for pkg, teacher_name in rows:
        out = PackageOut.model_validate(pkg)
        out.teacher_name = teacher_name
        packages.append(out)
    return packages

@router.get("/{student_id}/packages/{package_id}/lessons", response_model=List[LessonRecordOut])
async def read_package_lessons(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
    package_id: uuid.UUID,
) -> Any:
    """
    List every scheduled lesson (Event) for a lesson package, with check-in status.
    """
    pkg = await session.get(LessonPackage, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    if pkg.student_id != student_id:
        raise HTTPException(status_code=400, detail="Package does not belong to student")

    query = (
        select(Event, AttendanceLog.check_in_time)
        .outerjoin(AttendanceLog, AttendanceLog.event_id == Event.id)
        .where(Event.package_id == package_id)
        .order_by(Event.start_at.asc())
    )
    result = await session.execute(query)
    lessons = []
    for event, check_in_time in result:
        out = LessonRecordOut.model_validate(event)
        out.checked_in = check_in_time is not None
        out.check_in_time = check_in_time
        lessons.append(out)
    return lessons


@router.patch("/{student_id}/packages/{package_id}", response_model=PackageOut)
async def update_student_package(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
    package_id: uuid.UUID,
    package_in: LessonPackageUpdate
) -> Any:
    """
    Update a lesson package.
    """
    pkg = await session.get(LessonPackage, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    if pkg.student_id != student_id:
        raise HTTPException(status_code=400, detail="Package does not belong to student")
    
    update_data = package_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pkg, field, value)
        
    session.add(pkg)
    await session.commit()
    await session.refresh(pkg)
    return pkg


@router.post("/{student_id}/send-payment-reminder")
async def send_payment_reminder(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
) -> Any:
    from app.services.line_notify import LineMessagingService

    student = await session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not student.line_user_id:
        raise HTTPException(status_code=400, detail="此學生尚未設定 LINE ID")

    pkg_query = (
        select(LessonPackage, Plan.name)
        .join(Plan, LessonPackage.plan_id == Plan.id)
        .where(LessonPackage.student_id == student_id)
        .where(LessonPackage.status == "active")
    )
    pkg_result = await session.execute(pkg_query)
    row = pkg_result.first()
    plan_name = row[1] if row else "課程"

    message = (
        f"親愛的{student.name}您好，"
        f"感謝您完成本期的{plan_name}，"
        f"提醒您，記得繳交下一期學費！以安排後續課程。"
    )

    sent = LineMessagingService.send_message(student.line_user_id, message)
    if not sent:
        raise HTTPException(status_code=500, detail="LINE 訊息傳送失敗")
    return {"success": True}


@router.delete("/{student_id}/packages/{package_id}", status_code=204, response_model=None)
async def delete_student_package(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
    package_id: uuid.UUID,
) -> None:
    pkg = await session.get(LessonPackage, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    if pkg.student_id != student_id:
        raise HTTPException(status_code=400, detail="Package does not belong to student")

    # Cancel associated events
    stmt = delete(Event).where(Event.package_id == package_id)
    await session.execute(stmt)

    await session.delete(pkg)
    await session.commit()
