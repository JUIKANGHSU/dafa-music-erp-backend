from typing import Any, List
from fastapi import APIRouter
from sqlalchemy import select
import uuid


from app.api import deps
from app.models.plan import Plan
from app.models.lesson_package import LessonPackage
from app.models.payment import Payment
from sqlalchemy import update
from app.schemas.all import PlanOut, PlanCreate, PlanUpdate

router = APIRouter()

@router.get("", response_model=List[PlanOut])
async def read_plans(
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
) -> Any:
    """
    Retrieve active plans.
    """
    # For MVP, just return active plans
    query = select(Plan).where(Plan.is_active == True)
    result = await session.execute(query)
    return result.scalars().all()

@router.post("", response_model=PlanOut)
async def create_plan(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    plan_in: PlanCreate
) -> Any:
    """
    Create new plan.
    """
    plan = Plan(**plan_in.model_dump())
    session.add(plan)
    await session.commit()
    await session.refresh(plan)
    return plan

@router.patch("/{plan_id}", response_model=PlanOut)
async def update_plan(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    plan_id: uuid.UUID,
    plan_in: PlanUpdate
) -> Any:
    """
    Update a plan.
    """
    plan = await session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    update_data = plan_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)
        
    session.add(plan)
    await session.commit()
    await session.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=204, response_model=None)
async def delete_plan(
    *,
    session: deps.SessionDep,
    current_user: deps.CurrentUser,
    plan_id: uuid.UUID
) -> Any:
    """
    Delete a plan.
    """
    plan = await session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Nullify references in LessonPackage
    stmt = update(LessonPackage).where(LessonPackage.plan_id == plan_id).values(plan_id=None)
    await session.execute(stmt)

    # Nullify references in Payment
    stmt = update(Payment).where(Payment.plan_id == plan_id).values(plan_id=None)
    await session.execute(stmt)
    
    await session.delete(plan)
    await session.commit()
    return None

