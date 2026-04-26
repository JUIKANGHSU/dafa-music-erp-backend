from fastapi import APIRouter

from app.api.routes import auth, students, payments, events, plans, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(payments.router, tags=["payments"]) # payments is integrated in students path or root? Defined routes are /students/...
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
from app.api.routes import attendance
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
