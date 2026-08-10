from typing import Any, List
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
import uuid

from app.api import deps
from app.models.payment import Payment
from app.models.lesson_package import LessonPackage
from app.models.student import Student
from app.schemas.all import PaymentCreate, PaymentOut, PackageOut
from app.services import audit
from datetime import date

router = APIRouter()

@router.post("/students/{student_id}/payments")
async def create_payment_for_student(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
    payment_in: PaymentCreate
) -> Any:
    """
    Create a payment and automatically generate a lesson package.
    """
    student = await session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 1. Create Payment
    payment = Payment(
        student_id=student_id,
        plan_id=payment_in.plan_id,
        plan_name_snapshot=payment_in.plan_name_snapshot,
        paid_amount=payment_in.paid_amount,
        payment_method=payment_in.payment_method,
        note=payment_in.note,
        paid_at=payment_in.paid_at, # created_at default now() if None? Validated in Schema or logic
        created_by=current_user.id
    )
    session.add(payment)
    await session.flush() # get ID

    # 2. Create Lesson Package
    package = LessonPackage(
        student_id=student_id,
        payment_id=payment.id,
        plan_id=payment_in.plan_id,
        total_lessons=payment_in.total_lessons,
        used_lessons=0,
        start_date=payment_in.start_date,
        expire_date=payment_in.expire_date,
        status="active"
    )
    session.add(package)

    await audit.record(
        session, current_user, "payment.created", "payment", payment.id, student.name,
        detail=f"{payment_in.plan_name_snapshot}／${payment_in.paid_amount}／{payment_in.total_lessons}堂",
    )

    await session.commit()
    await session.refresh(payment)
    await session.refresh(package)
    return {
        "id": str(payment.id),
        "student_id": str(payment.student_id),
        "plan_name_snapshot": payment.plan_name_snapshot,
        "paid_amount": payment.paid_amount,
        "paid_at": payment.paid_at,
        "payment_method": payment.payment_method,
        "status": payment.status,
        "lesson_package_id": str(package.id),
    }

@router.get("/students/{student_id}/payments", response_model=List[PaymentOut])
async def read_student_payments(
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
) -> Any:
    query = select(Payment).where(Payment.student_id == student_id).order_by(Payment.paid_at.desc())
    result = await session.execute(query)
    return result.scalars().all()

@router.get("/students/{student_id}/packages", response_model=List[PackageOut])
async def read_student_packages(
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    student_id: uuid.UUID,
) -> Any:
    query = select(LessonPackage).where(LessonPackage.student_id == student_id).order_by(LessonPackage.created_at.desc())
    result = await session.execute(query)
    return result.scalars().all()
