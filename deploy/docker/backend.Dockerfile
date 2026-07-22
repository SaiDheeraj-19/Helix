# =============================================================================
# Helix Backend — Dockerfile
# Multi-stage: development + production
# =============================================================================

# ──────────────────────────────────────────
# Stage 1: Base
# ──────────────────────────────────────────
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry==1.8.3

# Copy dependency files
COPY pyproject.toml poetry.lock* ./

# ──────────────────────────────────────────
# Stage 2: Dependencies
# ──────────────────────────────────────────
FROM base AS dependencies

RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# ──────────────────────────────────────────
# Stage 3: Development
# ──────────────────────────────────────────
FROM dependencies AS development

COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--log-level", "info"]

# ──────────────────────────────────────────
# Stage 4: Production
# ──────────────────────────────────────────
FROM dependencies AS production

# Install only production dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root --only main

COPY . .

# Non-root user for security
RUN addgroup --gid 1001 --system helix \
    && adduser --uid 1001 --system --gid 1001 helix \
    && chown -R helix:helix /app

USER helix

EXPOSE 8000

# Gunicorn with Uvicorn workers for production
CMD ["gunicorn", "src.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
