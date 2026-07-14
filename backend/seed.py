import asyncio
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
from gridfs import GridFS
from sqlalchemy.orm import Session

from app.database import SessionLocal, settings
from app.models import User, UserRole, Job, JobStatus, Application, ApplicationStatus, Interview
from app.security import get_password_hash

# 1. Mock Data Setup Constants
JOB_TITLES = [
    ("Software Engineer (L4)", "Engineering"),
    ("Senior Backend Developer", "Engineering"),
    ("Frontend Engineer (React)", "Engineering"),
    ("Fullstack Web Developer", "Engineering"),
    ("DevOps Engineer", "Infrastructure"),
    ("Cloud Architect (AWS)", "Infrastructure"),
    ("Data Analyst", "Data & AI"),
    ("Machine Learning Scientist", "Data & AI"),
    ("Product Manager", "Product Management"),
    ("UX/UI Designer", "Design"),
    ("Scrum Master", "Project Management"),
    ("QA Automation Engineer", "Quality Assurance"),
    ("HR Specialist", "People Operations"),
    ("Recruiter", "People Operations"),
    ("Technical Writer", "Product Support")
]

# Raw mock resume data
MOCK_RESUME_DATA = b"%PDF-1.4 Mock resume file contents for candidate"

from sqlalchemy import text

def clear_databases(db_session: Session, mongo_client: MongoClient):
    """Resets databases and restarts identities to keep user IDs consistent (1, 2, 3...)."""
    print("Clearing Postgres tables...")
    db_session.execute(text("TRUNCATE TABLE users, jobs, applications, interviews CASCADE;"))
    db_session.execute(text("ALTER SEQUENCE users_id_seq RESTART WITH 1;"))
    db_session.execute(text("ALTER SEQUENCE jobs_id_seq RESTART WITH 1;"))
    db_session.execute(text("ALTER SEQUENCE applications_id_seq RESTART WITH 1;"))
    db_session.execute(text("ALTER SEQUENCE interviews_id_seq RESTART WITH 1;"))
    db_session.commit()

    print("Clearing MongoDB GridFS resumes...")
    mongo_db = mongo_client[settings.MONGODB_DB_NAME]
    mongo_db["fs.files"].delete_many({})
    mongo_db["fs.chunks"].delete_many({})

def seed_data():
    db = SessionLocal()
    mongo_client = MongoClient(settings.MONGODB_URL)
    
    try:
        # Prevent seeding/truncating if the database already contains users (e.g. on container restarts)
        user_count = db.query(User).count()
        if user_count > 0:
            print("Postgres database already contains user accounts. Skipping seeding to preserve data.")
            return

        clear_databases(db, mongo_client)
        mongo_db = mongo_client[settings.MONGODB_DB_NAME]
        fs = GridFS(mongo_db)

        print("Creating administrative and HR users...")
        pw_hash = get_password_hash("password123")
        
        admin = User(email="admin@system.com", password_hash=pw_hash, role=UserRole.admin)
        hr1 = User(email="hr1@system.com", password_hash=pw_hash, role=UserRole.hr)
        hr2 = User(email="hr2@system.com", password_hash=pw_hash, role=UserRole.hr)
        db.add_all([admin, hr1, hr2])
        db.commit()

        db.refresh(hr1)
        db.refresh(hr2)
        hr_pool = [hr1, hr2]

        print("Creating 15 mock jobs...")
        jobs = []
        for i, (title, dept) in enumerate(JOB_TITLES):
            job = Job(
                title=title,
                description=f"Join our team as a {title}! We are seeking a qualified professional with experience in {dept} fields. Excellent benefits and flexible hybrid work environment.",
                department=dept,
                status=JobStatus.open if i < 13 else JobStatus.closed,
                hr_id=random.choice(hr_pool).id
            )
            db.add(job)
            jobs.append(job)
        db.commit()
        for j in jobs:
            db.refresh(j)

        print("Creating 100 mock candidate accounts & resumes in GridFS...")
        candidates = []
        resume_ids = []
        
        for i in range(1, 101):
            email = f"candidate{i}@system.com"
            candidate = User(email=email, password_hash=pw_hash, role=UserRole.candidate)
            db.add(candidate)
            candidates.append(candidate)

            # Store resume file in MongoDB GridFS synchronously using PyMongo GridFS helper
            grid_file_id = fs.put(
                MOCK_RESUME_DATA,
                filename=f"candidate_{i}_resume.pdf",
                content_type="application/pdf"
            )
            resume_ids.append(str(grid_file_id))
        
        db.commit()
        for c in candidates:
            db.refresh(c)

        print("Creating candidate applications across all states...")
        for idx, candidate in enumerate(candidates):
            if idx < 40:
                status = ApplicationStatus.applied
            elif idx < 70:
                status = ApplicationStatus.interview
            elif idx < 85:
                status = ApplicationStatus.offer
            else:
                status = ApplicationStatus.rejected
                
            selected_job = random.choice(jobs)
            resume_id = resume_ids[idx]
            
            app = Application(
                job_id=selected_job.id,
                candidate_id=candidate.id,
                resume_mongo_id=resume_id,
                status=status,
                applied_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
            )
            db.add(app)
            db.commit()
            db.refresh(app)

            if status == ApplicationStatus.interview:
                interview = Interview(
                    application_id=app.id,
                    interviewer_id=selected_job.hr_id,
                    date_time=datetime.utcnow() + timedelta(days=random.randint(1, 10), hours=random.randint(9, 17)),
                    notes=f"Technical round scheduling for {candidate.email} - role: {selected_job.title}."
                )
                db.add(interview)

        db.commit()
        print("Database Seeding Completed Successfully!")
        # Notice: Account login passwords seeded as 'password123' without plain prints in logs.

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()
        mongo_client.close()

if __name__ == "__main__":
    seed_data()
