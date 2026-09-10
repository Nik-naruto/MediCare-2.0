# MediCare 2.0 Backend Service

High-concurrency, industry-grade RESTful API built with **Python 3.10+**, **FastAPI**, **Pydantic v2**, **SQLAlchemy 2.x**, **PostgreSQL**, and **Alembic**.

---

## 🏗 Architecture Overview

The backend follows a layered service-repository architecture pattern:

```text
app/
├── api/
│   └── v1/
│       ├── api.py            # Master API router aggregator
│       └── endpoints/        # Route controllers (auth, doctors, appointments, etc.)
├── core/                     # Application configuration & security utilities
│   ├── config.py             # Pydantic Settings & environment validation
│   └── security.py           # Password hashing & JWT token handling
├── db/                       # Database layer
│   ├── base_class.py         # SQLAlchemy Base class
│   └── session.py            # Engine & SessionLocal factory
├── models/                   # SQLAlchemy ORM database models
├── schemas/                  # Pydantic request/response schemas
├── services/                 # Core domain business logic layer
└── utils/                    # Utility formatters & date/time helpers
```

---

## 🚀 Setup & Local Development

### 1. Prerequisites
- Python 3.10, 3.11, or 3.12
- PostgreSQL 14+

### 2. Virtual Environment Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Windows (CMD):
.venv\Scripts\activate.bat

# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration

Copy the template environment configuration file:

```bash
cp .env.example .env
```

Configure `backend/.env`:

```env
PROJECT_NAME="MediCare 2.0 API"
API_V1_STR="/api/v1"
ENVIRONMENT="development"
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/medicare2_db"
SECRET_KEY="YOUR_SECURE_JWT_SECRET_KEY"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=120
```

---

## 🗄 Database & Alembic Migrations

### Apply Migrations to PostgreSQL
Ensure PostgreSQL database `medicare2_db` exists and run:

```bash
alembic upgrade head
```

### Useful Migration Commands
- **Check current revision**: `alembic current`
- **Revert last revision**: `alembic downgrade -1`
- **Generate new migration**: `alembic revision --autogenerate -m "migration_description"`

---

## ⚡ Running the Backend Server

Start the development server with Uvicorn:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **API Base URL**: `http://127.0.0.1:8000/api/v1`
- **Health Check**: `http://127.0.0.1:8000/health`
- **Swagger Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

---

## 🧪 Running Automated Tests

Run the complete test suite using `pytest`:

```bash
pytest tests
```

To run a specific test module:

```bash
pytest tests/test_appointments.py
```

---

## 🔒 Security & RBAC Enforcement

- **JWT Tokens**: Authenticated endpoints expect `Authorization: Bearer <token>`.
- **Role-Based Access Control**: Protected routes enforce user roles (`Admin`, `Doctor`, `Receptionist`, `Patient`).
- **Secret Protection**: Secrets are loaded exclusively from `.env`. Never commit `.env` to Git.
