# MediCare 2.0

> An industry-grade, full-stack healthcare management application built with **React 19**, **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.x**, and **Tailwind CSS**. Designed for high concurrency, real-time doctor availability scheduling, multi-role access control, and complete patient lifecycle management.

[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-61DAFB?logo=react)](frontend/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.10+-009688?logo=fastapi)](backend/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)](backend/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Major User Roles](#-major-user-roles)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Repository Structure](#-repository-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup Guide](#-installation--setup-guide)
  - [Step 1: Clone Repository](#step-1-clone-repository)
  - [Step 2: Backend Setup & Virtual Environment](#step-2-backend-setup--virtual-environment)
  - [Step 3: Backend Environment Configuration](#step-3-backend-environment-configuration)
  - [Step 4: PostgreSQL & Database Migrations](#step-4-postgresql--database-migrations)
  - [Step 5: Run Backend Server](#step-5-run-backend-server)
  - [Step 6: Frontend Setup & Dev Server](#step-6-frontend-setup--dev-server)
- [Running the Complete Application](#-running-the-complete-application)
- [Database & Migrations](#-database--migrations)
- [Demo Data & Testing Credentials](#-demo-data--testing-credentials)
- [Automated Testing](#-automated-testing)
- [API Documentation](#-api-documentation)
- [Doctor Profile Photos Architecture](#-doctor-profile-photos-architecture)
- [Security Features](#-security-features)
- [Troubleshooting](#-troubleshooting)
- [Project Roadmap](#-project-roadmap)

---

## 🏥 Project Overview

**MediCare 2.0** is an enterprise-grade hospital management and patient portal platform. It streamlines clinical workflows across four primary healthcare stakeholders—Patients, Doctors, Receptionists, and Hospital Administrators.

The platform includes real-time doctor availability engine (Asia/Kolkata IST timezone), OPD shift generation, appointment booking, medical records, digital prescriptions, lab test reports, billing/invoices, check-in queues, audit logs, and responsive role-tailored dashboards with dark mode support.

---

## 👥 Major User Roles

| Role | Key Capabilities |
| :--- | :--- |
| **Patient** | Browse 60+ specialists by department, view real-time morning/afternoon 15-min consultation slots, book appointments, track active bookings, view medical history, prescriptions, lab reports, and pay invoices. |
| **Doctor** | View daily appointment schedules, update consultation status (Checked In, In Consultation, Completed), write digital prescriptions, attach medical records, and manage availability shifts. |
| **Receptionist** | Walk-in patient registration, manage check-in queues, create appointments on behalf of patients, issue billing invoices, and oversee front-desk operations. |
| **Admin** | System-wide analytics, department management, doctor roster management, user role assignment, audit logs, and global system configuration. |

---

## ✨ Key Features

- **Authentication & Security**: JWT bearer token authentication, BCrypt password hashing, role-based access control (RBAC).
- **Doctor Directory & Profiles**: Browse 60 demo doctors across 30+ clinical departments, search by name or specialty, view room numbers, experience, and consultation fees.
- **Real-Time Doctor Availability Engine**: 
  - Operating in Indian Standard Time (`Asia/Kolkata` / IST).
  - Generates 15-minute slot intervals for Morning OPD (`09:00 AM`–`01:00 PM`) and Afternoon OPD (`02:00 PM`–`05:00 PM`).
  - Automatic exclusion of booked slots and 1-hour lunch break (`01:00 PM`–`02:00 PM`).
  - Sunday day-off handling (0 slots).
- **Patient Book Appointment**:
  - Availability-first 10-day date card picker.
  - 12-hour AM/PM time slot dropdown formatting (`09:00 AM`, `12:00 PM`, `02:00 PM`, `04:45 PM`).
  - Conditional pagination UI (hidden when total appointments $\le 10$, active when $> 10$).
- **Clinical Records & Prescriptions**: Digital prescription authoring, lab report attachments, and diagnosis history.
- **Billing & Invoices**: Itemized invoice generation, payment status tracking, and printable invoice views.
- **Responsive UI & Dark Mode**: Full support for 390px mobile, 768px tablet, and 1440px desktop viewports with dark mode toggle.

---

## 🛠 Tech Stack

### Frontend
- **Core Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite 8
- **Routing**: React Router v7 (`react-router-dom`)
- **HTTP Client**: Axios (with JWT interceptors)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: Lucide React (`lucide-react`)
- **Linter**: Oxlint

### Backend
- **Core Framework**: Python 3.10+ with FastAPI
- **ASGI Server**: Uvicorn
- **ORM & Database Abstraction**: SQLAlchemy 2.x
- **Schema Validation**: Pydantic v2 & `pydantic-settings`
- **Database Migrations**: Alembic
- **Security & Auth**: `python-jose` (JWT), `passlib` with `bcrypt`
- **Test Suite**: Pytest, HTTPX

### Database
- **Primary Database**: PostgreSQL (Production) / SQLite (Local testing fallback)

---

## 📐 System Architecture

```text
React 19 (Vite)
     │
     ▼
Axios HTTP Client (JWT Bearer Token)
     │
     ▼
FastAPI Application (app/main.py)
     │
     ▼
API v1 Routers (app/api/v1/endpoints/)
     │
     ▼
Service Domain Layer (app/services/)
     │
     ▼
SQLAlchemy 2.x ORM & Session (app/db/)
     │
     ▼
PostgreSQL Database
```

---

## 📁 Repository Structure

```text
MediCare-2.0/
├── README.md                     # Root project documentation
├── PROJECT_PLAN.md               # Master technical plan
├── FRONTEND_ARCHITECTURE.md      # Frontend architecture specification
├── .gitignore                    # Root Git protection rules
│
├── backend/                      # FastAPI Backend Application
│   ├── .env.example              # Backend environment template
│   ├── .gitignore                # Backend-specific ignore rules
│   ├── alembic.ini               # Alembic configuration
│   ├── alembic/                  # Database migration scripts
│   ├── app/                      # Application source code
│   │   ├── api/v1/endpoints/     # REST API route handlers
│   │   ├── core/                 # Config settings & security module
│   │   ├── db/                   # SQLAlchemy engine & base models
│   │   ├── models/               # ORM database entities
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Business logic layer
│   │   └── main.py               # FastAPI application entrypoint
│   ├── requirements.txt          # Python dependencies
│   └── tests/                    # Pytest test suite (85+ tests)
│
└── frontend/                     # React 19 Frontend Application
    ├── .env.example              # Frontend environment template
    ├── .gitignore                # Frontend-specific ignore rules
    ├── index.html                # HTML entrypoint
    ├── package.json              # Node.js dependencies & scripts
    ├── vite.config.js            # Vite build configuration
    └── src/
        ├── api/                  # Axios client configuration
        ├── components/           # Reusable UI components
        ├── context/              # Auth, Theme, and Toast state providers
        ├── layouts/              # Role-specific dashboard layouts
        ├── pages/                # Public & Role-specific page views
        └── utils/                # Date/Time formatters & helpers
```

---

## ⚡ Prerequisites

Before installing, ensure your machine has the following tools installed:

- **Git** (v2.30+)
- **Node.js** (v18.x or v20.x LTS recommended)
- **npm** (v9.x or v10.x)
- **Python** (v3.10, v3.11, or v3.12)
- **PostgreSQL** (v14+ recommended)

---

## 🚀 Installation & Setup Guide

### Step 1: Clone Repository

```bash
git clone https://github.com/Nik-naruto/MediCare-2.0.git
cd MediCare-2.0
```

---

### Step 2: Backend Setup & Virtual Environment

Navigate to the `backend/` directory and set up a Python virtual environment:

```bash
cd backend

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

---

### Step 3: Backend Environment Configuration

Copy the sample environment file `.env.example` to create your local `.env`:

```bash
cp .env.example .env
```

Open `backend/.env` and configure your environment variables:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PROJECT_NAME` | API Application Title | `"MediCare 2.0 API"` |
| `API_V1_STR` | API Version Prefix | `"/api/v1"` |
| `ENVIRONMENT` | Runtime Environment (`development` / `production`) | `"development"` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://postgres:YOUR_PASSWORD@localhost:5432/medicare2_db` |
| `SECRET_KEY` | JWT Signing Key | `YOUR_SECURE_SECRET_KEY` |
| `ALGORITHM` | JWT Encryption Algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token Expiry Duration | `120` |

> [!WARNING]
> Never commit your `.env` file to source control. The root `.gitignore` protects `.env` automatically.

---

### Step 4: PostgreSQL & Database Migrations

1. Ensure PostgreSQL is running on your machine.
2. Create the target database in PostgreSQL:
   ```sql
   CREATE DATABASE medicare2_db;
   ```
3. Run Alembic migrations to create database tables:
   ```bash
   alembic upgrade head
   ```

---

### Step 5: Run Backend Server

Launch the FastAPI development server with Uvicorn:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Backend Base URL**: `http://127.0.0.1:8000`
- **API Base Path**: `http://127.0.0.1:8000/api/v1`
- **Health Endpoint**: `http://127.0.0.1:8000/health`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`

---

### Step 6: Frontend Setup & Dev Server

Open a new terminal window, navigate to the `frontend/` directory, and install dependencies:

```bash
cd frontend

# Install Node dependencies
npm install

# Create local environment file from template
cp .env.example .env
```

Verify `frontend/.env` contains the backend API base path:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Launch the Vite development server:

```bash
npm run dev
```

- **Frontend Application URL**: `http://127.0.0.1:5173`

---

## 🖥 Running the Complete Application

To run the complete application locally, keep two terminal sessions active:

```bash
# Terminal 1: Backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 🗄 Database & Migrations

Database schema modifications are managed via **Alembic**.

- **Apply all migrations**: `alembic upgrade head`
- **Revert last migration**: `alembic downgrade -1`
- **Check current revision**: `alembic current`

---

## 🔐 Demo Data & Testing Credentials

For local evaluation, the database contains pre-configured demo users across all roles:

| Role | Demo Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@medicare.demo` | `Password123!` |
| **Doctor** | `dr.rajesh.sharma@medicare.demo` | `Password123!` |
| **Receptionist** | `reception.priya@medicare.demo` | `Password123!` |
| **Patient** | `patient.aarav@medicare.demo` | `Password123!` |

> [!NOTE]
> All passwords above are intended for local development and demonstration testing only.

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests
The backend features 85+ automated tests covering RBAC, authentication, slot scheduling, patient ownership, and authorization endpoints.

```bash
cd backend
pytest tests
```

### Frontend Production Build & Linting
Validate frontend compilation and Oxlint rules:

```bash
cd frontend
npm run build
npm run lint
```

---

## 📚 API Documentation

When `ENVIRONMENT=development` is configured in `backend/.env`, interactive OpenAPI documentation is automatically available at:

- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`
- **OpenAPI Schema**: `http://127.0.0.1:8000/api/v1/openapi.json`

---

## 🖼 Doctor Profile Photos Architecture

To keep the version-control repository lightweight and clean, uploaded media assets are excluded from Git via `.gitignore`:

```text
# backend/.gitignore
uploads/
```

- When the backend starts up, `app/main.py` automatically creates the static upload directories (`uploads/doctors/`) if they do not exist.
- Uploaded doctor profile portraits are served statically via FastAPI at `/uploads/doctors/{filename}`.
- Default SVG avatars are generated dynamically for doctors if local upload files are not present.

---

## 🔒 Security Features

- **No Secrets in Repository**: `.env` files are excluded via `.gitignore`. Sample templates `.env.example` contain non-sensitive placeholders.
- **JWT Authentication**: Secure Bearer tokens with configurable expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Role-Based Access Control (RBAC)**: Strict role validation middleware on every protected route.
- **CORS Protection**: Environment-controlled origins configuration (`BACKEND_CORS_ORIGINS`).

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `psycopg2.OperationalError: connection to server failed` | PostgreSQL service not running or invalid credentials in `.env` | Ensure PostgreSQL service is active and update `DATABASE_URL` in `backend/.env`. |
| `401 Unauthorized` on API requests | Invalid or expired JWT token | Re-login via the application or check system local time. |
| `Network Error` in frontend | Backend server not running or CORS blocked | Ensure backend is running on `http://127.0.0.1:8000` and check `VITE_API_BASE_URL` in `frontend/.env`. |
| Doctor images return 404 | Local `uploads/` directory does not contain local media file | The application will automatically fallback to colored doctor SVG avatars. |

---

## 🗺 Project Roadmap

### Completed Features ✅
- [x] JWT Authentication & Role-Based Access Control (RBAC)
- [x] 60 Specialist Doctors Roster across 30+ Departments
- [x] Real-time Doctor Availability Engine (Asia/Kolkata IST)
- [x] 15-minute slot generation with Morning & Afternoon OPD shifts
- [x] Patient Book Appointment with 10-day date card picker
- [x] Conditional Pagination UI (Patient My Appointments)
- [x] Medical Records, Prescriptions, Lab Reports, Invoices & Billing
- [x] Dark Mode support & Responsive Viewports (390px, 768px, 1440px)
- [x] Pytest backend suite (85 tests passing) & Vite production build

### Planned / Future Roadmap 🚀
- [ ] Docker & Docker Compose setup for containerized deployment
- [ ] Tele-consultation video integration (WebRTC)
- [ ] Automated SMS/Email appointment reminders
- [ ] Multi-language support (Hindi / Regional languages)

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
