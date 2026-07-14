from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import Job, UserRole, JobStatus
from app.schemas import JobCreate, JobResponse, PaginatedJobs
from app.security import RoleChecker, get_current_user, User

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# Role permission helpers
hr_or_admin = RoleChecker([UserRole.hr, UserRole.admin])

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    current_user: User = Depends(hr_or_admin),
    db: Session = Depends(get_db)
):
    """Allows HR or Admin users to create new job postings."""
    new_job = Job(
        title=job_in.title,
        description=job_in.description,
        department=job_in.department,
        status=job_in.status,
        hr_id=current_user.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@router.get("", response_model=PaginatedJobs)
def list_jobs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    department: Optional[str] = Query(None),
    status: Optional[JobStatus] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves a paginated list of job postings.
    Filterable by department and status. Publicly readable.
    """
    query = db.query(Job)
    if department:
        query = query.filter(Job.department.ilike(f"%{department}%"))
    if status:
        query = query.filter(Job.status == status)
    
    total = query.count()
    items = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()
    
    return PaginatedJobs(items=items, total=total, limit=limit, offset=offset)

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """Retrieves detailed information of a specific job posting."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found",
        )
    return job

@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    job_in: JobCreate,
    current_user: User = Depends(hr_or_admin),
    db: Session = Depends(get_db)
):
    """Updates an existing job posting. Restricted to HR or Admin."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found",
        )
    
    # Check if HR is updating their own job (or Admin status overrides)
    if current_user.role == UserRole.hr and job.hr_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit jobs you have created.",
        )
        
    job.title = job_in.title
    job.description = job_in.description
    job.department = job_in.department
    job.status = job_in.status
    
    db.commit()
    db.refresh(job)
    return job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    current_user: User = Depends(hr_or_admin),
    db: Session = Depends(get_db)
):
    """Deletes an existing job posting. Restricted to HR or Admin."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found",
        )
        
    if current_user.role == UserRole.hr and job.hr_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete jobs you have created.",
        )
        
    db.delete(job)
    db.commit()
    return
