from fastapi import FastAPI, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging

from app.routers import auth, jobs, applications, interviews, admin

# Setup logger for production observability
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Recruitment & HR Management System API",
    version="1.0.0",
    docs_url="/docs"
)

# CORS Configuration
# Rationale: Allows the frontend client (local or production) to invoke API requests.
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
if allowed_origins_str == "*":
    origins = ["*"]
else:
    origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized Router Registration
app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(interviews.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    from app.database import mongo_client, settings
    try:
        await mongo_client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB Atlas database: {settings.MONGODB_DB_NAME}")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB Atlas: {e}")

# Centralized Error Handling & Exception Middleware (Requirement 4)
# Rationale: Standardizes API error structures, preventing backend trace leakage while ensuring predictable client-side error parsing.

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Intercepts custom HTTPExceptions and shapes them uniformly."""
    code_mapping = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT"
    }
    error_code = code_mapping.get(exc.status_code, "HTTP_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": error_code}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Intercepts Pydantic schema validation failures (422) and lists details cleanly."""
    errors = exc.errors()
    # Flatten validation messages into a single string for display simplicity
    details = "; ".join([f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in errors])
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": f"Validation failed: {details}", "code": "VALIDATION_ERROR"}
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catches unhandled errors (500) to keep the app running and hide stack traces."""
    logger.exception("Unhandled Server Exception:")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred. Please contact system support.",
            "code": "INTERNAL_SERVER_ERROR"
        }
    )

@app.get("/health")
def health_check():
    """Simple status check endpoint."""
    return {"status": "healthy", "service": "hr_recruitment_api"}
