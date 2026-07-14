from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

# 1. PostgreSQL Relational Database Setup (SQLAlchemy)
# We use a sessionmaker for Postgres to provide thread-local scoped transactions
# and connection pooling for relational data.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Detects and discards stale connections automatically
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency generator to yield a Postgres session and close it after request lifecycle."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 2. MongoDB Document Database Setup (Motor Async Driver)
# We use MongoDB GridFS or collections for storing CVs/resumes (binary files)
# which are unstructured and can grow large, keeping them out of relational storage.
mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
mongo_db = mongo_client[settings.MONGODB_DB_NAME]

def get_mongo_db():
    """Dependency generator to return the MongoDB database client connection."""
    return mongo_db
