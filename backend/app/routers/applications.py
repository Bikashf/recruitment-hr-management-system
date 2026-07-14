from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
import io

from app.database import get_db, get_mongo_db
from app.models import Application, Job, User, UserRole, ApplicationStatus
from app.schemas import ApplicationResponse, PaginatedApplications, ApplicationUpdateStatus
from app.security import RoleChecker, get_current_user

router = APIRouter(prefix="/applications", tags=["Applications"])

candidate_only = RoleChecker([UserRole.candidate])
hr_or_admin = RoleChecker([UserRole.hr, UserRole.admin])

@router.post("/apply/{job_id}", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    job_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(candidate_only),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """
    Submits a candidate application for a job.
    Validates file type (PDF/DOCX only) and size (max 5MB) before uploading.
    Offloads resume binaries to MongoDB GridFS for stream-capable, chunked storage.
    Persists metadata in PostgreSQL.
    """
    # 1. Check if job exists and is open
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")
    if job.status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This job posting is closed")

    # 2. Check if candidate already applied
    existing_app = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == current_user.id
    ).first()
    if existing_app:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already applied to this job")

    # 3. File type & size validation
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    allowed_extensions = ["pdf", "docx"]
    
    file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if file.content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF and DOCX documents are accepted."
        )

    # Read and check file size (5MB = 5 * 1024 * 1024 bytes)
    file_data = await file.read()
    if len(file_data) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum limit of 5MB."
        )

    # 4. Stream and write file to MongoDB GridFS (Requirement: GridFS only)
    # GridFS splits large binary blobs into chunks (default 255KB) to avoid doc size limits
    # and handles memory-efficient streaming back to the client.
    fs = AsyncIOMotorGridFSBucket(mongo_db)
    grid_in = fs.open_upload_stream(
        file.filename,
        metadata={"content_type": file.content_type}
    )
    await grid_in.write(file_data)
    await grid_in.close()
    resume_mongo_id = str(grid_in._id)

    # 5. Save application metadata in PostgreSQL
    new_application = Application(
        job_id=job_id,
        candidate_id=current_user.id,
        resume_mongo_id=resume_mongo_id,
        status=ApplicationStatus.applied
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return ApplicationResponse(
        id=new_application.id,
        job_id=new_application.job_id,
        candidate_id=new_application.candidate_id,
        resume_mongo_id=new_application.resume_mongo_id,
        status=new_application.status,
        applied_at=new_application.applied_at,
        job_title=job.title,
        candidate_email=current_user.email
    )

@router.get("", response_model=PaginatedApplications)
def list_applications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists applications. Candidates only see their own.
    HR and Admin see all applications (paginated).
    """
    query = db.query(Application)
    
    if current_user.role == UserRole.candidate:
        query = query.filter(Application.candidate_id == current_user.id)
        
    total = query.count()
    apps = query.order_by(Application.applied_at.desc()).offset(offset).limit(limit).all()
    
    items = []
    for app in apps:
        job = db.query(Job).filter(Job.id == app.job_id).first()
        candidate = db.query(User).filter(User.id == app.candidate_id).first()
        items.append(ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            candidate_id=app.candidate_id,
            resume_mongo_id=app.resume_mongo_id,
            status=app.status,
            applied_at=app.applied_at,
            job_title=job.title if job else "Unknown",
            candidate_email=candidate.email if candidate else "Unknown"
        ))
        
    return PaginatedApplications(items=items, total=total, limit=limit, offset=offset)

@router.put("/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    status_in: ApplicationUpdateStatus,
    current_user: User = Depends(hr_or_admin),
    db: Session = Depends(get_db)
):
    """Updates application status. Restricted to HR/Admin roles."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        
    app.status = status_in.status
    db.commit()
    db.refresh(app)
    
    job = db.query(Job).filter(Job.id == app.job_id).first()
    candidate = db.query(User).filter(User.id == app.candidate_id).first()
    
    return ApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        candidate_id=app.candidate_id,
        resume_mongo_id=app.resume_mongo_id,
        status=app.status,
        applied_at=app.applied_at,
        job_title=job.title if job else "Unknown",
        candidate_email=candidate.email if candidate else "Unknown"
    )

@router.get("/{application_id}/resume")
async def download_resume(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """
    Downloads and streams the resume file associated with an application.
    Candidates can only view their own resume. HR/Admin can download any.
    Reads chunks dynamically from MongoDB GridFS.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        
    if current_user.role == UserRole.candidate and app.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Access GridFS bucket dynamically using Motor
    fs = AsyncIOMotorGridFSBucket(mongo_db)
    try:
        grid_out = await fs.open_download_stream(ObjectId(app.resume_mongo_id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Resume file not found in GridFS storage"
        )
        
    async def file_generator():
        while True:
            chunk = await grid_out.read(64 * 1024) # 64KB chunks
            if not chunk:
                break
            yield chunk

    filename = grid_out.filename
    content_type = grid_out.metadata.get("content_type", "application/pdf")
    
    return StreamingResponse(
        file_generator(),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
