import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    admin = "admin"
    hr = "hr"
    candidate = "candidate"

class JobStatus(str, enum.Enum):
    open = "open"
    closed = "closed"

class ApplicationStatus(str, enum.Enum):
    applied = "applied"
    interview = "interview"
    offer = "offer"
    rejected = "rejected"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reset_token = Column(String, unique=True, index=True, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # Relationships
    jobs_created = relationship("Job", back_populates="hr_user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="interviewer", foreign_keys="[Interview.interviewer_id]", cascade="all, delete-orphan")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    department = Column(String, nullable=False, index=True)
    status = Column(Enum(JobStatus), default=JobStatus.open, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    hr_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    hr_user = relationship("User", back_populates="jobs_created")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # We store the reference to the resume file in MongoDB GridFS as a string.
    # This design split keeps heavy documents in MongoDB GridFS, while keeping
    # Postgres light, indexed, and fast for joins and status queries.
    resume_mongo_id = Column(String, nullable=False)
    
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.applied, nullable=False, index=True)
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="applications")
    candidate = relationship("User", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    interviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date_time = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    application = relationship("Application", back_populates="interviews")
    interviewer = relationship("User", back_populates="interviews", foreign_keys=[interviewer_id])
