# MediCare 2.0 Backend Service

High-concurrency, industry-grade RESTful API built with **Python 3.10+**, **FastAPI**, **Pydantic v2**, **SQLAlchemy 2.x**, and **Alembic**.

## Project Architecture

```
backend/
├── app/
│   ├── api/          # Route controllers & API v1 routers
│   ├── core/         # Configuration settings & security utilities
│   ├── db/           # SQLAlchemy base models & session factory
│   ├── models/       # Database ORM entity models (Phase 7+)
│   ├── schemas/      # Pydantic request/response validation schemas
│   ├── services/     # Core domain business logic layer
│   ├── repositories/ # Database CRUD abstraction layer
│   └── utils/        # Pure helper functions & formatters
└── tests/            # Automated test suite with Pytest & HTTPX
```

## Running the Backend (Development)

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch development server:
   ```bash
   uvicorn app.main:app --reload
   ```

4. Interactive Swagger documentation:
   `http://localhost:8000/docs`
