from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict

from app.database import get_db
from app.models import User, UserRole, Job, Application, Interview
from app.schemas import UserCreate, UserResponse
from app.security import RoleChecker, get_password_hash

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

# Strict Admin authorization dependency
admin_only = RoleChecker([UserRole.admin])

@router.post("/hr", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_hr_account(
    user_in: UserCreate,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Allows Administrators to register new HR accounts."""
    if user_in.role != UserRole.hr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint can only be used to create HR accounts."
        )
        
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
        
    new_hr = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=UserRole.hr
    )
    db.add(new_hr)
    db.commit()
    db.refresh(new_hr)
    return new_hr

@router.get("/hr", response_model=List[UserResponse])
def list_hr_accounts(
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Retrieves all HR user accounts currently active in the system."""
    return db.query(User).filter(User.role == UserRole.hr).all()

@router.delete("/hr/{hr_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hr_account(
    hr_id: int,
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """Deletes an HR user account. Cascades deletion to jobs they created."""
    hr = db.query(User).filter(User.id == hr_id, User.role == UserRole.hr).first()
    if not hr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="HR account not found."
        )
    db.delete(hr)
    db.commit()
    return

@router.get("/stats")
def get_system_stats(
    current_user: User = Depends(admin_only),
    db: Session = Depends(get_db)
):
    """
    Computes system-wide high-level operational statistics.
    Provides Admin and HR dashboards with current state metrics.
    """
    total_jobs = db.query(Job).count()
    total_applications = db.query(Application).count()
    total_candidates = db.query(User).filter(User.role == UserRole.candidate).count()
    total_hr = db.query(User).filter(User.role == UserRole.hr).count()
    
    # Calculate application breakdowns by status
    status_counts = {}
    for state in ["applied", "interview", "offer", "rejected"]:
        status_counts[state] = db.query(Application).filter(Application.status == state).count()

    return {
        "jobs_count": total_jobs,
        "applications_count": total_applications,
        "candidates_count": total_candidates,
        "hr_count": total_hr,
        "status_distribution": status_counts
    }
