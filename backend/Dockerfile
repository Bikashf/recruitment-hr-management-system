FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1

# Install system dependencies needed for compiling psycopg2 or building tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

EXPOSE 8000

CMD ["sh", "-c", "python wait_for_db.py && alembic upgrade head && python seed.py && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
