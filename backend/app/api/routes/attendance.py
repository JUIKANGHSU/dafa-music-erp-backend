from typing import Any, List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from datetime import datetime
import uuid

from app.api import deps
from app.models.student import Student
from app.models.attendance import AttendanceLog
from app.services.line_notify import LineMessagingService
from app.schemas.all import StudentOut

router = APIRouter()

from app.services.email import EmailService

# ... imports ...

@router.post("/check-in", response_model=dict)
async def student_check_in(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID
) -> Any:
    """
    Check in a student.
    """
    student = await session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Create attendance log
    log = AttendanceLog(
        student_id=student.id,
        teacher_id=current_user.id,
        check_in_time=datetime.now(),
        status="present"
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)
    
    msg = "Check-in successful"
    
    # 1. Send LINE message if user_id exists
    line_sent = False
    if student.line_user_id:
        time_str = log.check_in_time.strftime("%Y-%m-%d %H:%M")
        message = f"{student.name} 學生已於 {time_str} 到班打卡。"
        line_sent = LineMessagingService.send_message(student.line_user_id, message)
        if line_sent:
            msg += " + LINE"
            
    # 2. Send Email if email exists
    email_sent = False
    if student.email:
        time_str = log.check_in_time.strftime("%Y-%m-%d %H:%M")
        subject = f"【大發音樂】學生到班通知 - {student.name}"
        content = f"親愛的家長您好：\n\n您的孩子 {student.name} 已於 {time_str} 完成到班打卡。\n\n大發音樂教室 敬上"
        email_sent = EmailService.send_email(student.email, subject, content)
        if email_sent:
            msg += " + Email"
            
    return {
        "message": msg,
        "check_in_time": log.check_in_time,
        "line_sent": line_sent,
        "email_sent": email_sent
    }

@router.get("", response_model=List[dict])
async def read_attendance_logs(
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve attendance logs.
    """
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
