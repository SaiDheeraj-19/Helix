# Helix Backend

Backend API for Helix Project Manage    ment Platform.

## Project Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/helix

# Authentication
SECRET_KEY=your_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Rate limiting
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=1000

# MinIO (optional)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=False
```

3. Run the development server:
```bash
export DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/helix
export SECRET_KEY=your_secret_key_here
export RATE_LIMIT_WINDOW_SECONDS=60
export RATE_LIMIT_MAX_REQUESTS=1000
uvicorn src.main:app --reload --port 8000
```

## Development

- API Documentation: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

## License

AGPL-3.0 License
