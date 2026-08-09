"""
Payment reminder agent.

The "loop": for every active lesson package running low on remaining lessons,
decide whether a reminder is due (not sent recently), then either report the
decision (dry_run) or act on it (send LINE/email + record when it was sent).
"""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.lesson_package import LessonPackage
from app.models.plan import Plan
from app.services.line_notify import LineMessagingService
from app.services.email import EmailService

LOW_LESSON_THRESHOLD = 2
REMINDER_COOLDOWN_DAYS = 7


@dataclass
class ReminderDecision:
    student_id: str
    student_name: str
    package_id: str
    plan_name: str
    remaining_lessons: int
    action: str  # "would_send" | "sent" | "skipped_cooldown" | "skipped_no_contact"
    detail: str


def _build_message(student_name: str, plan_name: str) -> str:
    return (
        f"親愛的{student_name}您好，"
        f"提醒您目前的「{plan_name}」堂數即將用完，"
        f"記得盡快繳交下一期學費，以安排後續課程，謝謝！"
    )


async def run_payment_reminder_scan(
    session: AsyncSession,
    dry_run: bool = True,
    threshold: int = LOW_LESSON_THRESHOLD,
    cooldown_days: int = REMINDER_COOLDOWN_DAYS,
) -> List[ReminderDecision]:
    query = (
        select(LessonPackage, Student, Plan.name)
        .join(Student, LessonPackage.student_id == Student.id)
        .outerjoin(Plan, LessonPackage.plan_id == Plan.id)
        .where(
            LessonPackage.status == "active",
            Student.status == "active",
        )
    )
    result = await session.execute(query)

    decisions: List[ReminderDecision] = []
    now = datetime.now(timezone.utc)

    for package, student, plan_name in result:
        remaining = package.total_lessons - package.used_lessons
        if remaining > threshold:
            continue

        plan_label = plan_name or "課程"

        if package.last_reminder_sent_at:
            last_sent = package.last_reminder_sent_at
            if last_sent.tzinfo is None:
                last_sent = last_sent.replace(tzinfo=timezone.utc)
            if now - last_sent < timedelta(days=cooldown_days):
                decisions.append(ReminderDecision(
                    student_id=str(student.id),
                    student_name=student.name,
                    package_id=str(package.id),
                    plan_name=plan_label,
                    remaining_lessons=remaining,
                    action="skipped_cooldown",
                    detail=f"上次提醒於 {last_sent.date()}，{cooldown_days} 天內不重複發送",
                ))
                continue

        if not student.line_user_id and not student.email:
            decisions.append(ReminderDecision(
                student_id=str(student.id),
                student_name=student.name,
                package_id=str(package.id),
                plan_name=plan_label,
                remaining_lessons=remaining,
                action="skipped_no_contact",
                detail="沒有 LINE 或 Email 可以聯絡",
            ))
            continue

        message = _build_message(student.name, plan_label)

        if dry_run:
            decisions.append(ReminderDecision(
                student_id=str(student.id),
                student_name=student.name,
                package_id=str(package.id),
                plan_name=plan_label,
                remaining_lessons=remaining,
                action="would_send",
                detail=message,
            ))
            continue

        sent_line = LineMessagingService.send_message(student.line_user_id, message) if student.line_user_id else False
        sent_email = EmailService.send_email(student.email, "【大發音樂】課程堂數提醒", message) if student.email else False

        package.last_reminder_sent_at = now
        session.add(package)

        channels = []
        if sent_line:
            channels.append("LINE")
        if sent_email:
            channels.append("Email")

        decisions.append(ReminderDecision(
            student_id=str(student.id),
            student_name=student.name,
            package_id=str(package.id),
            plan_name=plan_label,
            remaining_lessons=remaining,
            action="sent" if channels else "skipped_no_contact",
            detail=f"已透過 {'/'.join(channels)} 發送" if channels else "發送失敗",
        ))

    if not dry_run:
        await session.commit()

    return decisions
