from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, date
import uuid

# --- Token ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

# --- User ---
class UserBase(BaseModel):
    email: str
    name: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: uuid.UUID
    is_active: bool
    role: str
    
    model_config = ConfigDict(from_attributes=True)

# --- Student ---
class StudentBase(BaseModel):
    name: str
    nickname: Optional[str] = None
    dob: Optional[date] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    line_user_id: Optional[str] = None
    tags: List[str] = []
    status: str = "active"

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    line_user_id: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    # Add other fields as needed

class StudentOut(StudentBase):
    id: uuid.UUID
    created_at: datetime
    
    active_plan: Optional[str] = None
    remaining_lessons: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Plan ---
class PlanBase(BaseModel):
    name: str
    lesson_minutes: int
    total_lessons: int
    price: int
    valid_days: Optional[int] = None

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    lesson_minutes: Optional[int] = None
    total_lessons: Optional[int] = None
    price: Optional[int] = None
    valid_days: Optional[int] = None
    is_active: Optional[bool] = None

class PlanOut(PlanBase):
    id: uuid.UUID
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

# --- Payment ---
class PaymentCreate(BaseModel):
    plan_id: Optional[uuid.UUID] = None
    plan_name_snapshot: str
    paid_amount: int
    payment_method: str
    note: Optional[str] = None
    paid_at: Optional[datetime] = None
    
    # Package related (often sent together)
    total_lessons: int
    start_date: date
    expire_date: Optional[date] = None

class PaymentOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    plan_name_snapshot: str
    paid_amount: int
    paid_at: datetime
    payment_method: str
    status: str
    lesson_package_id: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)

# --- Package ---
class PackageOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    teacher_id: Optional[uuid.UUID] = None
    teacher_name: Optional[str] = None
    total_lessons: int
    used_lessons: int
    start_date: date
    expire_date: Optional[date]
    status: str
    model_config = ConfigDict(from_attributes=True)

class LessonRecordOut(BaseModel):
    id: uuid.UUID
    start_at: datetime
    end_at: datetime
    status: str
    note: Optional[str] = None
    checked_in: bool = False
    check_in_time: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class LessonPackageUpdate(BaseModel):
    teacher_id: Optional[uuid.UUID] = None
    total_lessons: Optional[int] = None
    used_lessons: Optional[int] = None
    start_date: Optional[date] = None
    expire_date: Optional[date] = None
    status: Optional[str] = None

# --- Schedule ---
class ScheduleCreate(BaseModel):
    lesson_package_id: uuid.UUID
    teacher_id: uuid.UUID
    start_date: datetime
    frequency_days: int = 1  # interval between lessons

# --- Event ---
class EventBase(BaseModel):
    title: str
    start_at: datetime
    end_at: datetime
    teacher_id: uuid.UUID
    student_id: Optional[uuid.UUID] = None
    note: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    teacher_id: Optional[uuid.UUID] = None
    student_id: Optional[uuid.UUID] = None
    note: Optional[str] = None

class EventOut(EventBase):
    id: uuid.UUID
    status: str
    model_config = ConfigDict(from_attributes=True)
