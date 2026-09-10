# MediCare 2.0 Frontend Application

Modern, high-performance web interface built with **React 19**, **Vite 8**, **React Router v7**, **Tailwind CSS v4**, **Axios**, and **Lucide React**.

---

## 🏗 Frontend Structure & Architecture

```text
frontend/
├── src/
│   ├── api/
│   │   └── client.js         # Axios instance with JWT interceptors
│   ├── components/
│   │   ├── common/           # Reusable UI components (Button, Modal, Select, Table, Badge)
│   │   ├── dashboard/        # Dashboard stats, cards & status badges
│   │   └── layout/           # Navbar, Topbar, Sidebar, and Footer
│   ├── context/
│   │   ├── AuthContext.jsx   # User authentication & token persistence
│   │   ├── ThemeContext.jsx  # Light/Dark mode state management
│   │   └── ToastContext.jsx  # Global toast notification queue
│   ├── layouts/              # Role-tailored application layouts
│   ├── pages/
│   │   ├── admin/            # Admin dashboard, audit logs & user management
│   │   ├── doctor/           # Doctor schedule, appointments & consultations
│   │   ├── patient/          # Patient book appointment, records & invoices
│   │   ├── public/           # Landing page, doctor directory, login & register
│   │   └── receptionist/     # Check-in queue, walk-in registration & billing
│   ├── routes/
│   │   ├── AppRoutes.jsx     # Master application route tree
│   │   └── ProtectedRoute.jsx# Role-based route guard middleware
│   └── utils/
│       └── formatters.js     # 12-hour AM/PM time & currency formatters
├── index.html
├── package.json
└── vite.config.js
```

---

## 🚀 Setup & Local Development

### 1. Prerequisites
- Node.js (v18+ or v20+ LTS recommended)
- npm (v9+)

### 2. Installation

```bash
# Navigate to frontend directory
cd frontend

# Install Node modules
npm install
```

### 3. Environment Configuration

Copy `.env.example` to create your local `.env` file:

```bash
cp .env.example .env
```

Configure `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

---

## ⚡ Available Scripts

In the `frontend/` directory, you can run:

### `npm run dev`
Runs the application in development mode with Hot Module Replacement (HMR).  
Open `http://127.0.0.1:5173` to view it in your browser.

### `npm run build`
Builds the app for production to the `dist/` folder. It correctly bundles React in production mode and optimizes the build for performance.

### `npm run lint`
Runs `oxlint` to analyze source code for lint errors and code style issues.

### `npm run preview`
Locally previews the production build generated in `dist/`.

---

## 🔑 Authentication & Routing

- **AuthContext**: Manages `currentUser` state and persists JWT access tokens in browser local storage.
- **Axios Interceptor**: Automatically attaches `Authorization: Bearer <token>` headers to all outgoing API requests and handles 401 unauthorized redirects.
- **ProtectedRoute**: Guard component that validates user authentication and role permissions before rendering role-specific pages.
