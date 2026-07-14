from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from app.models import UserRole, JobStatus, ApplicationStatus

# --- Generic Response Shape ---
# Part of requirement 4: Consistent API/error/response structure
class ErrorResponse(BaseModel):
    detail: str
    code: str

# --- Auth Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters.")

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
    email: EmailStr
    id: int

class TokenRefreshRequest(BaseModel):
    refresh_token: str

# --- Job Schemas ---
class JobBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10)
    department: str = Field(..., min_length=2, max_length=50)
    status: JobStatus = JobStatus.open

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: int
    created_at: datetime
    hr_id: int

    class Config:
        from_attributes = True

# Pagination wrapper for Jobs
class PaginatedJobs(BaseModel):
    items: List[JobResponse]
    total: int
    limit: int
    offset: int

# --- Application Schemas ---
class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    resume_mongo_id: str
    status: ApplicationStatus
    applied_at: datetime
    job_title: Optional[str] = None
    candidate_email: Optional[str] = None

    class Config:
        from_attributes = True

class ApplicationUpdateStatus(BaseModel):
    status: ApplicationStatus

# Pagination wrapper for Applications
class PaginatedApplications(BaseModel):
    items: List[ApplicationResponse]
    total: int
    limit: int
    offset: int

# --- Interview Schemas ---
class InterviewCreate(BaseModel):
    interviewer_id: Optional[int] = None
    date_time: datetime
    notes: Optional[str] = None

class InterviewResponse(BaseModel):
    id: int
    application_id: int
    interviewer_id: int
    date_time: datetime
    notes: Optional[str] = None
    created_at: datetime
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None
    interviewer_email: Optional[str] = None

    class Config:
        from_attributes = True
