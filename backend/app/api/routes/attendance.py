from typing import Any, List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
import uuid

from app.api import deps
from app.models.student import Student
from app.models.attendance import AttendanceLog
from app.models.lesson_package import LessonPackage
from app.models.plan import Plan
from app.models.user import User
from app.models.event import Event
from app.services.line_notify import LineMessagingService
from app.schemas.all import StudentOut

router = APIRouter()

from app.services.email import EmailService

@router.post("/check-in", response_model=dict)
async def student_check_in(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID
) -> Any:
    student = await session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get most recent active package to resolve teacher and plan name
    pkg_result = await session.execute(
        select(Plan.name, LessonPackage.teacher_id)
        .join(LessonPackage, LessonPackage.plan_id == Plan.id)
        .where(LessonPackage.student_id == student.id, LessonPackage.status == "active")
        .order_by(LessonPackage.created_at.desc())
        .limit(1)
    )
    row = pkg_result.first()
    plan_name = row[0] if row else "課程"
    pkg_teacher_id = row[1] if row else None

    if pkg_teacher_id:
        teacher_user = await session.get(User, pkg_teacher_id)
        teacher_name = teacher_user.name if teacher_user else current_user.name
        resolved_teacher_id = pkg_teacher_id
    else:
        teacher_name = current_user.name
        resolved_teacher_id = current_user.id

    # 找今天該學員最近的一堂課（以台灣時間 UTC+8 計算當天範圍）
    now_utc = datetime.now(timezone.utc)
    today_start = (now_utc + timedelta(hours=8)).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(hours=8)
    today_end = today_start + timedelta(days=1)

    event_result = await session.execute(
        select(Event)
        .where(
            Event.student_id == student.id,
            Event.start_at >= today_start,
            Event.start_at < today_end,
            Event.status == "scheduled"
        )
        .order_by(Event.start_at.asc())
        .limit(1)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="今天找不到該學員的排課，請先建立課程再簽到")

    existing_log = await session.execute(
        select(AttendanceLog).where(AttendanceLog.event_id == event.id)
    )
    if existing_log.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="這堂課今天已經簽到過了")

    log = AttendanceLog(
        student_id=student.id,
        teacher_id=resolved_teacher_id,
        event_id=event.id,
        check_in_time=event.start_at,
        status="present"
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)

    # Format time in Taiwan timezone (UTC+8)
    tw_time = log.check_in_time.replace(tzinfo=timezone.utc) + timedelta(hours=8)
    date_str = f"{tw_time.month}/{tw_time.day}/{tw_time.year}"
    time_str = tw_time.strftime("%H:%M")

    msg = "Check-in successful"

    # Send LINE message
    line_sent = False
    if student.line_user_id:
        message = (
            f"親愛的 {student.name} 您好，\n"
            f"您已於 {date_str} {time_str} 完成一堂 {plan_name}，\n"
            f"老師為 {teacher_name}，\n"
            f"大發音樂祝您上課愉快！"
        )
        line_sent = LineMessagingService.send_message(student.line_user_id, message)
        if line_sent:
            msg += " + LINE"

    # Send Email
    email_sent = False
    if student.email:
        subject = f"【大發音樂】學生到班通知 - {student.name}"
        content = (
            f"親愛的 {student.name} 您好，\n\n"
            f"您已於 {date_str} {time_str} 完成一堂 {plan_name}，\n"
            f"老師為 {teacher_name}，\n\n"
            f"大發音樂祝您上課愉快！"
        )
        email_sent = EmailService.send_email(student.email, subject, content)
        if email_sent:
            msg += " + Email"

    return {
        "message": msg,
        "check_in_time": log.check_in_time,
        "line_sent": line_sent,
        "email_sent": email_sent
    }

@router.post("/shortcut-checkin")
async def shortcut_checkin(
    *,
    session: deps.SessionDep,
    secret: str,
    name: str,
) -> Any:
    from app.core.config import settings

    if secret != settings.SHORTCUT_SECRET:
        raise HTTPException(status_code=403, detail="無效的 secret")

    result = await session.execute(
        select(Student).where(Student.name.ilike(f"%{name}%")).limit(1)
    )
    student = result.scalar_one_or_none()
    if not student:
        return {"message": f"找不到學生：{name}"}

    log = AttendanceLog(
        student_id=student.id,
        check_in_time=datetime.now(),
        status="present"
    )
    session.add(log)
    await session.commit()

    # Get active plan name
    pkg_result = await session.execute(
        select(Plan.name)
        .join(LessonPackage, LessonPackage.plan_id == Plan.id)
        .where(LessonPackage.student_id == student.id, LessonPackage.status == "active")
        .limit(1)
    )
    plan_name = pkg_result.scalar() or "課程"

    # Send LINE message
    if student.line_user_id:
        tw_time = datetime.now(timezone.utc) + timedelta(hours=8)
        date_str = f"{tw_time.month}/{tw_time.day}/{tw_time.year}"
        time_str = tw_time.strftime("%H:%M")
        message = (
            f"親愛的 {student.name} 您好，\n"
            f"您已於 {date_str} {time_str} 完成一堂 {plan_name}，\n"
            f"大發音樂祝您上課愉快！"
        )
        LineMessagingService.send_message(student.line_user_id, message)

    return {"message": f"{student.name} 簽到成功！"}


@router.get("", response_model=List[dict])
async def read_attendance_logs(
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    query = (
        select(AttendanceLog, Student.name)
        .join(Student, AttendanceLog.student_id == Student.id)
        .order_by(AttendanceLog.check_in_time.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(query)

    logs = []
    for log, student_name in result:
        logs.append({
            "id": log.id,
            "student_name": student_name,
            "check_in_time": log.check_in_time,
            "status": log.status
        })

    return logs
