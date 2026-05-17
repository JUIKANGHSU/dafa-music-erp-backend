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

    log = AttendanceLog(
        student_id=student.id,
        teacher_id=current_user.id,
        check_in_time=datetime.now(),
        status="present"
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)

    # Get active plan name
    pkg_result = await session.execute(
        select(Plan.name)
        .join(LessonPackage, LessonPackage.plan_id == Plan.id)
        .where(LessonPackage.student_id == student.id, LessonPackage.status == "active")
        .limit(1)
    )
    plan_name = pkg_result.scalar() or "課程"

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
            f"老師為 {current_user.name}，\n"
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
            f"老師為 {current_user.name}，\n\n"
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
    from app.models.user import User

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
