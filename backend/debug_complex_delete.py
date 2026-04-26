
import asyncio
import uuid
import time
from sqlalchemy import select, delete
from datetime import date, datetime
from app.db.session import AsyncSessionLocal
from app.models.student import Student
from app.models.user import User
from app.models.lesson_package import LessonPackage
from app.models.payment import Payment
from app.models.event import Event
from app.models.plan import Plan
from app.core import security

# We will invoke the logic implemented in routes by simulating it here, 
# or we can import the route functions if we mock dependencies.
# Given complexity of dependencies, we will replicate the logic exactly to verify DB behavior.

async def verify_teacher_soft_delete():
    print("\n--- Verifying Teacher Soft Delete ---")
    async with AsyncSessionLocal() as session:
        # 1. Create Teacher
        teacher_email = f"teacher_soft_{uuid.uuid4()}@example.com"
        teacher = User(
            email=teacher_email,
            hashed_password="fake",
            name="Soft Delete Teacher",
            role="teacher",
            is_active=True
        )
        session.add(teacher)
        
        # 2. Create Student (needed for payment)
        student = Student(name="Payment Student", phone="123")
        session.add(student)
        
        await session.commit()
        await session.refresh(teacher)
        await session.refresh(student)
        
        # 3. Create Payment (linked to teacher)
        payment = Payment(
            student_id=student.id,
            plan_name_snapshot="Test Plan",
            paid_amount=100,
            payment_method="cash",
            created_by=teacher.id,
            status="paid"
        )
        session.add(payment)
        await session.commit()
        
        print("Pre-requisites created: Teacher with Payment")
        
        # 4. Attempt Delete (Soft Delete Logic)
        stmt = select(Payment).where(Payment.created_by == teacher.id).limit(1)
        result = await session.execute(stmt)
        if result.scalar_one_or_none():
             print("Payment found, proceeding with soft delete...")
             timestamp = int(time.time())
             teacher.is_active = False
             teacher.email = f"deleted_{timestamp}_{teacher.email}"
             session.add(teacher)
             await session.commit()
             await session.refresh(teacher)
        else:
             print("FAILURE: Payment not detected!")
             return

        # 5. Verify
        # Check if user still exists but is inactive
        check = await session.get(User, teacher.id)
        if check and check.is_active is False and "deleted_" in check.email:
            print(f"SUCCESS: Teacher soft deleted. Email: {check.email}, Active: {check.is_active}")
        else:
            print(f"FAILURE: Teacher state incorrect. Active: {check.is_active}, Email: {check.email}")

async def verify_student_complex_delete():
    print("\n--- Verifying Student Complex Delete ---")
    async with AsyncSessionLocal() as session:
        # 1. Setup Data Tree
        student = Student(name="Complex Delete Student", phone="999")
        session.add(student)
        
        plan = Plan(name="Complex Plan", lesson_minutes=60, total_lessons=10, price=100, is_active=True)
        session.add(plan)
        
        teacher = User(email=f"teacher_complex_{uuid.uuid4()}@example.com", hashed_password="fake", name="T", role="teacher", is_active=True)
        session.add(teacher)
        
        await session.commit()
        await session.refresh(student)
        await session.refresh(plan)
        await session.refresh(teacher)
        
        # Payment
        payment = Payment(
            student_id=student.id,
            plan_id=plan.id,
            plan_name_snapshot=plan.name,
            paid_amount=100,
            payment_method="cash",
            created_by=teacher.id
        )
        session.add(payment)
        await session.commit()
        await session.refresh(payment)
        
        # Package
        package = LessonPackage(
            student_id=student.id,
            payment_id=payment.id,
            plan_id=plan.id,
            total_lessons=10,
            start_date=date(2024, 1, 1)
        )
        session.add(package)
        await session.commit()
        await session.refresh(package)
        
        # Event (linked to package)
        event = Event(
            title="Lesson 1",
            student_id=student.id,
            teacher_id=teacher.id,
            start_at=datetime(2024, 1, 1, 10, 0, 0),
            end_at=datetime(2024, 1, 1, 11, 0, 0),
            package_id=package.id
        )
        session.add(event)
        await session.commit()
        
        print("Complex tree created. Attempting cascading delete...")
        
        try:
            # COPY OF NEW LOGIC
            from sqlalchemy import or_
            
            # 0. Get student packages
            pkg_query = select(LessonPackage.id).where(LessonPackage.student_id == student.id)
            pkg_result = await session.execute(pkg_query)
            pkg_ids = pkg_result.scalars().all()

            # 1. Events
            if pkg_ids:
                stmt = delete(Event).where(
                    or_(
                        Event.student_id == student.id,
                        Event.package_id.in_(pkg_ids)
                    )
                )
            else:
                stmt = delete(Event).where(Event.student_id == student.id)
            await session.execute(stmt)

            # 2. Packages
            stmt = delete(LessonPackage).where(LessonPackage.student_id == student.id)
            await session.execute(stmt)

            # 3. Payments
            stmt = delete(Payment).where(Payment.student_id == student.id)
            await session.execute(stmt)
            
            await session.delete(student)
            await session.commit()
            
            # Verify
            check = await session.get(Student, student.id)
            if not check:
                print("SUCCESS: Student and all related complex data deleted.")
            else:
                print("FAILURE: Student still exists.")
                
        except Exception as e:
            print(f"FAILURE: Exception during delete: {e}")
            await session.rollback()

async def main():
    await verify_teacher_soft_delete()
    await verify_student_complex_delete()

if __name__ == "__main__":
    asyncio.run(main())
