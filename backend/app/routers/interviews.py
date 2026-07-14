from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Interview, Application, Job, User, UserRole, ApplicationStatus
from app.schemas import InterviewCreate, InterviewResponse
from app.security import RoleChecker, get_current_user

router = APIRouter(prefix="/interviews", tags=["Interviews"])

hr_or_admin = RoleChecker([UserRole.hr, UserRole.admin])

@router.post("/schedule/{application_id}", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
def schedule_interview(
    application_id: int,
    interview_in: InterviewCreate,
    current_user: User = Depends(hr_or_admin),
    db: Session = Depends(get_db)
):
    """
    Schedules an interview for a specific application.
    Updates the application status to 'interview' and creates the interview record.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
        
    # Auto-promote application status to 'interview' when scheduling
    # Rationale: Ensures application pipeline moves forward automatically when HR acts.
    app.status = ApplicationStatus.interview
    
    interviewer_id = interview_in.interviewer_id or current_user.id
    new_interview = Interview(
        application_id=application_id,
        interviewer_id=interviewer_id,
        date_time=interview_in.date_time,
        notes=interview_in.notes
    )
    
    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)
    
    job = db.query(Job).filter(Job.id == app.job_id).first()
    candidate = db.query(User).filter(User.id == app.candidate_id).first()
    interviewer = db.query(User).filter(User.id == interviewer_id).first()
    
    return InterviewResponse(
        id=new_interview.id,
        application_id=new_interview.application_id,
        interviewer_id=new_interview.interviewer_id,
        date_time=new_interview.date_time,
        notes=new_interview.notes,
        created_at=new_interview.created_at,
        candidate_email=candidate.email if candidate else "Unknown",
        job_title=job.title if job else "Unknown",
        interviewer_email=interviewer.email if interviewer else "Unknown"
    )

@router.get("", response_model=List[InterviewResponse])
def list_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists interviews.
    Candidates view only their own invitations.
    HR & Admin view all scheduled interviews.
    """
    if current_user.role == UserRole.candidate:
        # Join application to filter by candidate ID
        interviews = db.query(Interview)\
            .join(Application, Interview.application_id == Application.id)\
            .filter(Application.candidate_id == current_user.id)\
            .order_by(Interview.date_time.asc())\
            .all()
    else:
        interviews = db.query(Interview).order_by(Interview.date_time.asc()).all()
        
    response = []
    for interview in interviews:
        app = db.query(Application).filter(Application.id == interview.application_id).first()
        job = db.query(Job).filter(Job.id == app.job_id).first() if app else None
        candidate = db.query(User).filter(User.id == app.candidate_id).first() if app else None
        interviewer = db.query(User).filter(User.id == interview.interviewer_id).first()
        
        response.append(InterviewResponse(
            id=interview.id,
            application_id=interview.application_id,
            interviewer_id=interview.interviewer_id,
            date_time=interview.date_time,
            notes=interview.notes,
            created_at=interview.created_at,
            candidate_email=candidate.email if candidate else "Unknown",
            job_title=job.title if job else "Unknown",
            interviewer_email=interviewer.email if interviewer else "Unknown"
        ))
        
    return response
