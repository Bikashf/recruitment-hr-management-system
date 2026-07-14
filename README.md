# TalentForce - Recruitment & HR Management System

TalentForce is a production-ready, full-stack recruitment and human resources management platform. It facilitates Job Posting creation, Candidate Applications with resume analysis, Application Tracking, and Interview Scheduling under a role-based access model.

---

## Technical Stack & Architecture

### Stack Components
- **Frontend**: Next.js 14 (App Router) with Tailwind CSS styling and client-side JWT route guarding.
- **Backend**: FastAPI (Python 3.10) with asynchronous database connections.
- **Primary Database**: PostgreSQL (relational storage of operational details).
- **Secondary Database**: MongoDB GridFS (unstructured binary chunked storage for PDF/DOCX resumes).
- **ORM / Migrations**: SQLAlchemy & Alembic schema management.
- **Auth**: JWT (Access and Refresh token rotation) with password hashing using bcrypt.

### System Architecture
```
                     +---------------------------------------+
                     |         Next.js 14 Frontend           |
                     |   (Port 3000: User Login/Dashboard)   |
                     +-------------------+-------------------+
                                         |
                                         | REST HTTP & JWT Auth
                                         v
                     +-------------------+-------------------+
                     |          FastAPI Backend              |
                     |          (Port 8000: API)             |
                     +---------+-------------------+---------+
                               |                   |
               SQLAlchemy ORM  |                   | Motor Async Client
                               v                   v
                     +---------+---------+  +------+-----------------+
                     |    PostgreSQL     |  |     MongoDB            |
                     |  (Structured DB)  |  |  (Resumes GridFS Bucket)|
                     +-------------------+  +------------------------+
```

### Database Split Rationale
1. **PostgreSQL**: Handles structured business entities (`users`, `jobs`, `applications`, `interviews`) that require strict integrity, transaction safety (ACID), foreign keys, and complex join queries (e.g., matching candidates with scheduled interviews).
2. **MongoDB GridFS**: Stores unstructured resume binary files. GridFS splits files (which must be PDF or DOCX format, up to 5MB in size) into chunks (default 255KB) to allow efficient binary streaming. By offloading heavy resume blobs to MongoDB GridFS, PostgreSQL tables remain lightweight, highly indexed, and fast for joins and transactional metadata queries.

---

## Configuration & Environment Setup

A `.env` configuration file must reside in the `/backend` directory. Refer to `/backend/.env.example`:

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_system
MONGODB_URL=mongodb://localhost:27017/hr_system_resumes
MONGODB_DB_NAME=hr_system_resumes
SECRET_KEY=supersecretjwtkeythatshouldbechangedinproduction12345!
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

---

## Getting Started

### Run with Docker Compose (Recommended)
This launches PostgreSQL, MongoDB, runs database migrations, runs the seed script, and starts both the FastAPI backend and Next.js frontend.
1. Make sure Docker is running on your machine.
2. Run the following command from the project root:
   ```bash
   docker compose up --build
   ```
3. Access:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Seed Accounts Created
The system seeds 100 mock candidates, 15 mock jobs, and mock application pipelines automatically. You can use these pre-made accounts to log in immediately:
- **Admin**: `admin@system.com` / `password123`
- **HR Officer**: `hr1@system.com` / `password123` or `hr2@system.com` / `password123`
- **Candidates**: `candidate1@system.com` to `candidate100@system.com` / `password123`

---

## API Endpoints List

### Authentication Router (`/api/auth`)
* `POST /api/auth/register` - Registers a candidate account
* `POST /api/auth/login` - Authenticates credentials, returns Access & Refresh tokens
* `POST /api/auth/refresh` - Generates a new Access token using a Refresh token

### Jobs Router (`/api/jobs`)
* `POST /api/jobs` - Create job opening (HR / Admin)
* `GET /api/jobs` - List jobs with offset/limit pagination (Public / Read-only)
* `GET /api/jobs/{id}` - Details of a single job opening
* `PUT /api/jobs/{id}` - Update a job posting (HR / Admin)
* `DELETE /api/jobs/{id}` - Delete a job posting (HR / Admin)

### Applications Router (`/api/applications`)
* `POST /api/applications/apply/{job_id}` - Apply to job, uploads resume (Candidate, PDF/DOCX up to 5MB)
* `GET /api/applications` - List applications (Candidate sees own, HR/Admin see all, paginated)
* `PUT /api/applications/{id}/status` - Promotes/changes candidate pipeline status (HR / Admin)
* `GET /api/applications/{id}/resume` - Downloads/streams resume binary from MongoDB (HR / Admin / Candidate)

### Interviews Router (`/api/interviews`)
* `POST /api/interviews/schedule/{application_id}` - Schedules interview & auto-promotes status (HR / Admin)
* `GET /api/interviews` - Lists interviews (Candidate sees own, HR/Admin see all)

### Admin Router (`/api/admin`)
* `POST /api/admin/hr` - Register a new HR user account (Admin only)
* `GET /api/admin/hr` - View list of all active HR accounts (Admin only)
* `DELETE /api/admin/hr/{id}` - Delete an HR user account (Admin only)
* `GET /api/admin/stats` - Fetch aggregate platform stats & status breakdown (Admin only)
