
import asyncio
import uuid
import time
from sqlalchemy import select, delete, or_, update
from datetime import date, datetime
from app.db.session import AsyncSessionLocal
from app.models.student import Student
from app.models.user import User
from app.models.lesson_package import LessonPackage
from app.models.payment import Payment
from app.models.event import Event
from app.models.plan import Plan

async def repro_teacher_fail():
    print("\n=== Repro Teacher Soft Delete ===")
    async with AsyncSessionLocal() as session:
        try:
            # 1. Create Teacher
            email = f"repro_teacher_{uuid.uuid4()}@example.com"
            teacher = User(email=email, hashed_password="pw", name="Repro T", role="teacher", is_active=True)
            session.add(teacher)
            
            # Needed for payment
            student = Student(name="Repro S", phone="123")
            session.add(student)
            
            await session.commit()
            await session.refresh(teacher)
            await session.refresh(student)
            
            # 2. Create Payment
            payment = Payment(
                student_id=student.id,
                plan_name_snapshot="P",
                paid_amount=10,
                payment_method="cash",
                created_by=teacher.id
            )
            session.add(payment)
            await session.commit()
            
            print(f"Created teacher {teacher.id} with payment {payment.id}")
            
            # 3. Logic from users.py delete_user
            user_id = teacher.id
            
            # 1. Delete future events
            stmt = delete(Event).where(Event.teacher_id == user_id)
            await session.execute(stmt)

            # 2. Check payments
            stmt = select(Payment).where(Payment.created_by == user_id).limit(1)
            result = await session.execute(stmt)
            if result.scalar_one_or_none():
                 print("Payment detected. Attempting soft delete update...")
                 # Soft delete
                 timestamp = int(time.time())
                 teacher.is_active = False
                 teacher.email = f"deleted_{timestamp}_{teacher.email}"
                 session.add(teacher)
                 await session.commit()
                 await session.refresh(teacher)
                 print("Soft delete committed successfully.")
            else:
                 print("No payments? Should have payments.")
                 
        except Exception as e:
            await session.rollback()
            print(f"!!! EXCEPTION in Teacher Delete: {e}")
            import traceback
            traceback.print_exc()

async def repro_student_fail():
    print("\n=== Repro Student Cascade Delete ===")
    async with AsyncSessionLocal() as session:
        try:
            # Setup complex data
            s = Student(name="Repro S2", phone="555")
            session.add(s)
            
            p = Plan(name="Plan X", lesson_minutes=30, total_lessons=5, price=50, is_active=True)
            session.add(p)
            
            t = User(email=f"t2_{uuid.uuid4()}@ex.com", hashed_password="pw", name="T2", role="teacher", is_active=True)
            session.add(t)
            
            await session.commit()
            await session.refresh(s)
            await session.refresh(p)
            await session.refresh(t)
            
            pay = Payment(student_id=s.id, plan_id=p.id, plan_name_snapshot="X", paid_amount=50, payment_method="cash", created_by=t.id)
            session.add(pay)
            await session.commit()
            await session.refresh(pay)
            
            pkg = LessonPackage(student_id=s.id, payment_id=pay.id, plan_id=p.id, total_lessons=5, start_date=date.today())
            session.add(pkg)
            await session.commit()
            await session.refresh(pkg)
            
            evt = Event(title="E1", student_id=s.id, teacher_id=t.id, start_at=datetime.now(), end_at=datetime.now(), package_id=pkg.id)
            session.add(evt)
            await session.commit()
            
            print(f"Created student {s.id} with Event->Package->Payment")
            
            # Delete Logic from students.py
            student_id = s.id
            
            # 0. Get student packages
            pkg_query = select(LessonPackage.id).where(LessonPackage.student_id == student_id)
            pkg_result = await session.execute(pkg_query)
            pkg_ids = pkg_result.scalars().all()

            # 1. Events
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
            
            session.delete(s)
            await session.commit()
            print("Student delete committed successfully.")

        except Exception as e:
            await session.rollback()
            print(f"!!! EXCEPTION in Student Delete: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(repro_teacher_fail())
    asyncio.run(repro_student_fail())
