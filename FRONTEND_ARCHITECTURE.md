# MediCare 2.0 - Frontend Architecture Document
## Phase 2: Standalone React + Vite + Tailwind CSS Architecture

---

## 1. Complete Frontend Folder Structure

The frontend application is structured as a modular, decoupled Single Page Application (SPA) using React, Vite, React Router, and Tailwind CSS. The folder hierarchy enforces clean separation between UI presentation, layout shells, routing, mock data, and utility logic.

```
MediCare2.0/
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── assets/
        │   ├── images/          # Healthcare banners, placeholders, hospital logos
        │   ├── icons/           # Custom SVG icons (if not using Lucide/Heroicons)
        │   └── styles/          # index.css with Tailwind directives & design tokens
        ├── components/
        │   ├── common/          # Atomic reusable UI elements
        │   │   ├── Button.jsx
        │   │   ├── Input.jsx
        │   │   ├── Select.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Table.jsx
        │   │   ├── Card.jsx
        │   │   ├── Badge.jsx
        │   │   ├── Alert.jsx
        │   │   ├── LoadingSpinner.jsx
        │   │   ├── EmptyState.jsx
        │   │   ├── ConfirmDialog.jsx
        │   │   └── Pagination.jsx
        │   ├── form/            # Form container & field components
        │   │   ├── FormField.jsx
        │   │   ├── FormSelect.jsx
        │   │   ├── Checkbox.jsx
        │   │   └── DatePicker.jsx
        │   ├── layout/          # Layout-specific header/navigation elements
        │   │   ├── Navbar.jsx
        │   │   ├── Sidebar.jsx
        │   │   ├── Footer.jsx
        │   │   ├── Topbar.jsx
        │   │   └── UserDropdown.jsx
        │   ├── patient/         # Patient role specialized components
        │   │   ├── AppointmentCard.jsx
        │   │   ├── PrescriptionCard.jsx
        │   │   └── MedicalRecordRow.jsx
        │   ├── doctor/          # Doctor role specialized components
        │   │   ├── QueueCard.jsx
        │   │   ├── ConsultationForm.jsx
        │   │   └── PatientSummaryCard.jsx
        │   ├── receptionist/    # Receptionist role specialized components
        │   │   ├── WalkInForm.jsx
        │   │   ├── QueueManagerTable.jsx
        │   │   └── PaymentModal.jsx
        │   └── admin/           # Admin role specialized components
        │       ├── UserTable.jsx
        │       ├── StatsWidget.jsx
        │       └── AuditLogViewer.jsx
        ├── layouts/             # Master layout containers
        │   ├── PublicLayout.jsx
        │   ├── PatientLayout.jsx
        │   ├── DoctorLayout.jsx
        │   ├── ReceptionistLayout.jsx
        │   └── AdminLayout.jsx
        ├── pages/
        │   ├── public/          # Publicly accessible pages
        │   │   ├── Home.jsx
        │   │   ├── About.jsx
        │   │   ├── Doctors.jsx
        │   │   ├── Services.jsx
        │   │   ├── Contact.jsx
        │   │   ├── Login.jsx
        │   │   └── Register.jsx
        │   ├── patient/         # Authenticated Patient portal
        │   │   ├── Dashboard.jsx
        │   │   ├── Appointments.jsx
        │   │   ├── BookAppointment.jsx
        │   │   ├── MedicalRecords.jsx
        │   │   ├── Prescriptions.jsx
        │   │   ├── LabReports.jsx
        │   │   ├── Invoices.jsx
        │   │   └── Profile.jsx
        │   ├── doctor/          # Authenticated Doctor portal
        │   │   ├── Dashboard.jsx
        │   │   ├── Appointments.jsx
        │   │   ├── Patients.jsx
        │   │   ├── PatientDetails.jsx
        │   │   ├── Consultation.jsx
        │   │   ├── Prescriptions.jsx
        │   │   ├── Schedule.jsx
        │   │   └── Profile.jsx
        │   ├── receptionist/    # Authenticated Receptionist portal
        │   │   ├── Dashboard.jsx
        │   │   ├── Patients.jsx
        │   │   ├── WalkInRegistration.jsx
        │   │   ├── Appointments.jsx
        │   │   ├── CheckInQueue.jsx
        │   │   ├── Billing.jsx
        │   │   └── Profile.jsx
        │   └── admin/           # Authenticated Admin portal
        │       ├── Dashboard.jsx
        │       ├── Users.jsx
        │       ├── Doctors.jsx
        │       ├── Patients.jsx
        │       ├── Departments.jsx
        │       ├── Appointments.jsx
        │       ├── Reports.jsx
        │       ├── AuditLogs.jsx
        │       └── SystemSettings.jsx
        ├── routes/              # Routing configuration
        │   ├── AppRoutes.jsx
        │   ├── ProtectedRoute.jsx
        │   └── routeConfig.js
        ├── data/                # Static Mock Data Datasets
        │   ├── mockUsers.js
        │   ├── mockDoctors.js
        │   ├── mockPatients.js
        │   ├── mockAppointments.js
        │   ├── mockPrescriptions.js
        │   ├── mockMedicalRecords.js
        │   ├── mockLabReports.js
        │   ├── mockInvoices.js
        │   ├── mockDepartments.js
        │   └── mockAuditLogs.js
        ├── services/            # Phase 2 Mock Service Layer
        │   └── mockApiService.js
        ├── context/             # UI State Contexts (Phase 2)
        │   ├── MockAuthContext.jsx
        │   ├── ThemeContext.jsx
        │   └── ToastContext.jsx
        ├── hooks/               # Custom React Hooks
        │   ├── useMockData.js
        │   ├── useMockAuth.js
        │   ├── useForm.js
        │   └── useModal.js
        └── utils/               # Pure helper utilities
            ├── formatters.js    # Date, currency, badge color formatting
            ├── validators.js    # Form input validation rules
            └── constants.js     # UI constants, role definitions, status codes
```

---

## 2. Page Architecture

The application defines **39 dedicated pages** grouped logically into 5 distinct access areas:

### A. Public Pages (7 Pages)
1. **Home (`/`)**: Landing page with hero banner, hospital stats counter, clinical specialty highlights, featured doctors, and patient testaments.
2. **About (`/about`)**: Hospital story, vision, mission, accreditation badges, executive board, and medical facility photo gallery.
3. **Doctors (`/doctors`)**: Public doctor directory with specialty filters, search bar, experience tags, and profile detail view modals.
4. **Services (`/services`)**: Clinical departments overview (Cardiology, OPD, IPD, ICU, Pediatrics, Oncology, Emergency 24/7).
5. **Contact (`/contact`)**: Interactive inquiry form, clinic location address, emergency hotline phone numbers, and operational hours.
6. **Login (`/login`)**: Single login page with role-selector radio options (Patient, Doctor, Receptionist, Admin) for testing Phase 2 mock logins.
7. **Register (`/register`)**: Patient self-registration multi-step form (Account info -> Personal details -> Emergency contact).

### B. Patient Pages (8 Pages)
1. **Dashboard (`/patient/dashboard`)**: Personal greeting, upcoming appointment card, recent prescriptions widget, and quick action buttons.
2. **Appointments (`/patient/appointments`)**: Tabbed list of appointments (Upcoming, Past, Cancelled) with cancel/reschedule actions.
3. **Book Appointment (`/patient/book-appointment`)**: Wizard workflow (Select Department -> Choose Doctor -> Pick Date & Slot -> Review & Confirm).
4. **Medical Records (`/patient/medical-records`)**: Timeline view of past consultations, clinical diagnoses, and downloadable record files.
5. **Prescriptions (`/patient/prescriptions`)**: Digital prescription list with medication breakdowns, dosage schedules, and PDF preview modals.
6. **Lab Reports (`/patient/lab-reports`)**: Diagnostic test result cards (Blood Test, MRI, X-Ray) with status tags (*Ready*, *Pending*).
7. **Invoices (`/patient/invoices`)**: Financial history table displaying consultation fees, payment status (*Paid*, *Unpaid*), and invoice view buttons.
8. **Profile (`/patient/profile`)**: Personal details form, emergency contact management, blood group indicator, and password reset form.

### C. Doctor Pages (8 Pages)
1. **Dashboard (`/doctor/dashboard`)**: Daily schedule timeline, active queue metric cards, emergency flags, and daily patient count.
2. **Appointments (`/doctor/appointments`)**: Master appointment roster filterable by date and status (*Scheduled*, *In-Progress*, *Completed*).
3. **Patients (`/doctor/patients`)**: Searchable list of assigned patients with quick profile preview drawers.
4. **Patient Details (`/doctor/patients/:id`)**: Comprehensive medical chart of a selected patient (vitals history, past prescriptions, lab tests).
5. **Consultation Workspace (`/doctor/consultation/:appointmentId`)**: Active consultation workspace for recording symptoms, vital signs, clinical diagnosis, and prescribing drugs.
6. **Prescriptions (`/doctor/prescriptions`)**: Master list of prescriptions issued by the doctor with edit/re-issue options.
7. **Schedule Management (`/doctor/schedule`)**: Slot config grid to toggle working days, set slot intervals (15/30 min), and mark leaves.
8. **Profile (`/doctor/profile`)**: Professional bio editor, specialty details, consultation fee configuration, and shift timings.

### D. Receptionist Pages (7 Pages)
1. **Dashboard (`/receptionist/dashboard`)**: Real-time desk summary (Today's arrivals, pending check-ins, active doctor room statuses).
2. **Patients (`/receptionist/patients`)**: Master patient database search with quick registration and edit capabilities.
3. **Walk-in Registration (`/receptionist/walk-in`)**: On-the-spot registration form for walk-in patients seeking immediate OPD consultation.
4. **Appointments (`/receptionist/appointments`)**: Desk appointment manager to book, reschedule, or cancel on behalf of patients.
5. **Check-in / Queue (`/receptionist/queue`)**: Live queue controller to mark patient arrival, assign queue numbers, and update room statuses.
6. **Billing & Counter (`/receptionist/billing`)**: Payment desk counter to generate physical bills, collect cash/card payments, and issue receipts.
7. **Profile (`/receptionist/profile`)**: Desk operator profile and shift assignment view.

### E. Admin Pages (9 Pages)
1. **Dashboard (`/admin/dashboard`)**: Master system dashboard with executive KPI cards, daily revenue graph, role distribution chart, and system logs.
2. **User Management (`/admin/users`)**: Full CRUD table for managing platform accounts across all roles (Activate, Deactivate, Reset Password).
3. **Doctor Onboarding (`/admin/doctors`)**: Directory & onboarding portal to add new doctors, assign departments, and set fees.
4. **Patient Registry (`/admin/patients`)**: Global patient records viewer with administrative override capabilities.
5. **Departments (`/admin/departments`)**: Management interface for hospital departments, clinical services, and head-of-department assignments.
6. **Master Appointments (`/admin/appointments`)**: Platform-wide appointment log with advanced multi-filter controls.
7. **Financial & Operational Reports (`/admin/reports`)**: Operational analytics generator (Revenue by department, doctor occupancy rates, patient volume).
8. **Audit Logs (`/admin/audit-logs`)**: Security event trail table monitoring login events, record edits, and role changes.
9. **System Settings (`/admin/settings`)**: Platform configuration settings (Clinic operating hours, system maintenance mode, alert banners).

---

## 3. Reusable UI Components Specification

All components are strictly atomized, receiving explicit props, maintaining clean styling via Tailwind CSS, and avoiding inline hardcoded data.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           COMMON UI COMPONENTS                          │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│    Button    │    Input     │    Select    │    Modal     │    Table    │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│     Card     │    Badge     │    Alert     │ LoadingState │ EmptyState  │
├──────────────┴──────────────┴──────────────┴──────────────┴─────────────┤
│                     ConfirmDialog & Form Components                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Components Interface Specification:

1. **`Button`**: Supports variants (`primary`, `secondary`, `outline`, `danger`, `ghost`), sizes (`sm`, `md`, `lg`), `isLoading` spinner state, `disabled` state, and `icon` slots.
2. **`Input`**: Standardized text/number/email/password input with label, helper text, error state styling, left/right icon support, and accessible ARIA attributes.
3. **`Select`**: Dropdown select wrapper with search filtering, placeholder text, label, error handling, and option array rendering.
4. **`Modal`**: Backdrop-overlayed dialog with customizable size (`sm`, `md`, `lg`, `xl`), header title, sticky footer buttons, and `onClose` backdrop click listener.
5. **`Table`**: Generic data table component accepting `columns` configuration, `data` arrays, sortable header columns, row action rendering, and built-in pagination controls.
6. **`Card`**: Elevated surface box with optional header, footer, border accent options, and responsive padding options.
7. **`Badge`**: Status indicator pill with color themes mapped to statuses (`success` = Green, `warning` = Amber, `danger` = Red, `info` = Blue, `neutral` = Gray).
8. **`Alert`**: Notification banner displaying context messages (`info`, `success`, `warning`, `error`) with optional dismiss icon.
9. **`LoadingState`**: Skeleton loader or centered spinner block displayed while async mock data promise resolves.
10. **`EmptyState`**: Friendly visual container displayed when table or list datasets return empty (includes icon, heading, subtext, and call-to-action button).
11. **`ConfirmDialog`**: Dedicated modal prompt for destructive or critical actions ("Are you sure you want to cancel this appointment?") with explicit Confirm and Cancel handlers.
12. **`Form Components`**: Form container wrappers handling standard validation feedback messages, required field indicators (*), and submit state disabling.

---

## 4. Layout Architecture

Layouts act as structural shells containing topbars, sidebars, dynamic main content areas, and footers.

```
+-------------------------------------------------------------------------+
|                              PUBLIC LAYOUT                              |
| +---------------------------------------------------------------------+ |
| | Navbar (Brand Logo | Nav Links | Login / Register Buttons)          | |
| +---------------------------------------------------------------------+ |
| |                                                                     | |
| | Main Page Content Container (<Outlet />)                            | |
| |                                                                     | |
| +---------------------------------------------------------------------+ |
| | Footer (Links | Emergency Numbers | Copyright)                      | |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
|                        AUTHENTICATED ROLE LAYOUT                        |
|                     (Patient / Doctor / Rec / Admin)                    |
| +-------------------+-+-----------------------------------------------+ |
| | Sidebar           | | Topbar (Role Badge | Notifications | Profile) | |
| |                   | +-----------------------------------------------+ |
| | - Brand Logo      | |                                               | |
| | - Role Nav Links  | | Main Content Container (<Outlet />)           | |
| | - Active Indicator| |                                               | |
| | - Logout Button   | |                                               | |
| +-------------------+-------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

### Layout Specifications:

1. **`PublicLayout`**:
   - Header: Responsive `Navbar` with brand logo, public page links, and quick action buttons.
   - Content: Flexible `<Outlet />` container for public pages.
   - Footer: Full-width hospital footer with contact details, quick links, and legal disclaimers.

2. **`PatientLayout`**:
   - Left Sidebar: Patient portal links (Dashboard, Appointments, Records, Prescriptions, Billing, Profile).
   - Topbar: Patient welcome message, notification bell dropdown, and quick profile avatar.
   - Main Body: High-readability container for patient workflow pages.

3. **`DoctorLayout`**:
   - Left Sidebar: Doctor portal links (Dashboard, Schedule, Appointments, Patient Queue, Prescriptions).
   - Topbar: Doctor shift status badge (*On Duty*, *In Consultation*), current time clock, and profile menu.
   - Main Body: Optimized for clinical workspace efficiency.

4. **`ReceptionistLayout`**:
   - Left Sidebar: Desk links (Dashboard, Walk-in, Check-in Queue, Billing, Appointments).
   - Topbar: Desk counter indicator, quick patient lookup search bar, and emergency call button.
   - Main Body: Compact density layout for rapid front-desk operations.

5. **`AdminLayout`**:
   - Left Sidebar: Enterprise links (Dashboard, User Management, Doctors, Patients, Departments, Reports, Audit Logs, Settings).
   - Topbar: Master system health indicator, pending alert flag, and super-admin avatar.
   - Main Body: Full-width data container optimized for large tables and charts.

---

## 5. Routing Architecture (React Router)

Routing will be managed using **React Router (v6+)**. Routes are organized declaratively, wrapping pages within their designated Layout containers.

```jsx
// Conceptual Route Structure (src/routes/AppRoutes.jsx)
<Routes>
  {/* Public Routes */}
  <Route element={<PublicLayout />}>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
    <Route path="/doctors" element={<Doctors />} />
    <Route path="/services" element={<Services />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
  </Route>

  {/* Patient Portal Routes */}
  <Route path="/patient" element={<PatientLayout />}>
    <Route path="dashboard" element={<PatientDashboard />} />
    <Route path="appointments" element={<PatientAppointments />} />
    <Route path="book-appointment" element={<BookAppointment />} />
    <Route path="medical-records" element={<MedicalRecords />} />
    <Route path="prescriptions" element={<PatientPrescriptions />} />
    <Route path="lab-reports" element={<LabReports />} />
    <Route path="invoices" element={<PatientInvoices />} />
    <Route path="profile" element={<PatientProfile />} />
  </Route>

  {/* Doctor Portal Routes */}
  <Route path="/doctor" element={<DoctorLayout />}>
    <Route path="dashboard" element={<DoctorDashboard />} />
    <Route path="appointments" element={<DoctorAppointments />} />
    <Route path="patients" element={<DoctorPatients />} />
    <Route path="patients/:id" element={<PatientDetails />} />
    <Route path="consultation/:appointmentId" element={<Consultation />} />
    <Route path="prescriptions" element={<DoctorPrescriptions />} />
    <Route path="schedule" element={<DoctorSchedule />} />
    <Route path="profile" element={<DoctorProfile />} />
  </Route>

  {/* Receptionist Portal Routes */}
  <Route path="/receptionist" element={<ReceptionistLayout />}>
    <Route path="dashboard" element={<ReceptionistDashboard />} />
    <Route path="patients" element={<ReceptionistPatients />} />
    <Route path="walk-in" element={<WalkInRegistration />} />
    <Route path="appointments" element={<ReceptionistAppointments />} />
    <Route path="queue" element={<CheckInQueue />} />
    <Route path="billing" element={<Billing />} />
    <Route path="profile" element={<ReceptionistProfile />} />
  </Route>

  {/* Admin Portal Routes */}
  <Route path="/admin" element={<AdminLayout />}>
    <Route path="dashboard" element={<AdminDashboard />} />
    <Route path="users" element={<UserManagement />} />
    <Route path="doctors" element={<DoctorManagement />} />
    <Route path="patients" element={<PatientRegistry />} />
    <Route path="departments" element={<DepartmentManagement />} />
    <Route path="appointments" element={<MasterAppointments />} />
    <Route path="reports" element={<Reports />} />
    <Route path="audit-logs" element={<AuditLogs />} />
    <Route path="settings" element={<SystemSettings />} />
  </Route>

  {/* Fallback 404 Route */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

> **Note on Authentication**: In Phase 2, a lightweight `MockAuthContext` will allow switching active roles via a simple dropdown in the topbar or login screen to simulate navigation across roles without real backend validation.

---

## 6. State & Mock Data Strategy

Because the backend is not built in Phase 2, the application will use a robust, decoupled Mock Data Strategy.

### Mock Data Isolation Rules:
1. **Never Hardcode Datasets in Components**: UI components must receive data via custom hooks or service functions, never directly inline as hardcoded static arrays.
2. **Centralized Data Directory (`src/data/`)**: All mock records are stored in dedicated mock files (`mockDoctors.js`, `mockAppointments.js`, `mockPatients.js`, etc.).
3. **Phase 2 Mock Service Layer (`src/services/mockApiService.js`)**: 
   - A standalone service module that exports asynchronous functions returning JavaScript Promises.
   - Uses artificial network delay (`setTimeout` of 300ms–600ms) to simulate realistic network latency.
   - Allows UI components to natively test and render **Loading States**, **Empty States**, and **Error States** before backend integration.

```javascript
// Example Mock Service Pattern (src/services/mockApiService.js)
import { mockAppointments } from '../data/mockAppointments';

export const mockApiService = {
  getAppointments: async (role, userId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ status: 200, data: mockAppointments });
      }, 400);
    });
  },
  
  createAppointment: async (appointmentData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newRecord = { id: Date.now(), ...appointmentData, status: 'Scheduled' };
        mockAppointments.push(newRecord);
        resolve({ status: 201, data: newRecord });
      }, 500);
    });
  }
};
```

---

## 7. Responsive Design Strategy

The interface will be fully responsive, tailored for three target screen tiers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       RESPONSIVE LAYOUT MATRIX                          │
├──────────────────┬──────────────────────┬───────────────────────────────┤
│ Tier             │ Screen Width         │ Layout Adaptations            │
├──────────────────┼──────────────────────┼───────────────────────────────┤
│ Desktop          │ 1280px+ / 1024px+    │ Expanded Sidebar, Multi-col   │
│ Tablet           │ 768px - 1023px       │ Collapsed Rail, 2-col Grids   │
│ Mobile           │ < 768px              │ Off-canvas Drawer, 1-col Cards│
└──────────────────┴──────────────────────┴───────────────────────────────┘
```

### Adaptations per Device Class:
- **Desktop (1024px and above)**: Fixed left sidebar navigation, multi-column metric grids (4 columns), side-by-side forms, and comprehensive data tables.
- **Tablet (768px to 1023px)**: Left sidebar collapses into an icon rail or hamburger menu, metric cards adjust to a 2-column grid, tables enable horizontal scrolling.
- **Mobile (Below 768px)**: Navigation transforms into a slide-over drawer triggered by a topbar hamburger icon. Multi-column tables automatically transform into stacked card views for optimal mobile touch usability.

---

## 8. UI/UX Standards for Industry-Grade Healthcare Application

To achieve an authoritative, trustworthy, premium medical visual design:

### 1. Curated Healthcare Color Palette
- **Primary / Trust Blue**: Slate Blue / Healthcare Teal (`#0284c7` / `#0f766e`) representing precision and cleanliness.
- **Backgrounds**: Soft Cool Gray / Off-White (`#f8fafc` / `#f1f5f9`) reducing eye strain during long clinical shifts.
- **Surfaces**: Pure White (`#ffffff`) with subtle card borders (`#e2e8f0`) and soft shadows (`shadow-sm`).
- **Typography**: Dark Slate Charcoal (`#0f172a`) for high contrast readability.

### 2. Status Color Conventions
- **Success / Completed / Paid**: Emerald Green (`#10b981`)
- **Warning / Pending / Scheduled**: Amber (`#f59e0b`)
- **Danger / Urgent / Cancelled / Emergency**: Crimson Red (`#ef4444`)
- **Neutral / Draft / Archived**: Cool Gray (`#64748b`)

### 3. Healthcare Usability Principles
- **Clean Dashboard Density**: Ample white space, clear section headings, distinct card borders, and bold metric numbers.
- **Accessible Forms**: Prominent field labels, visible focus rings (`focus:ring-2 focus:ring-sky-500`), explicit required field indicators, and inline validation error text below inputs.
- **Responsive Data Tables**: Alternating row highlights, clear table headers, explicit empty states, row action buttons, and pagination footers.
- **Interactive Feedback**: Hover state transitions (`transition-all duration-200`), click feedback, toast alerts for actions, and explicit confirmation modals prior to destructive operations.

---

## 9. Naming Conventions

Consistency across all codebase artifacts will be enforced strictly:

| Artifact Type | Case Convention | Example |
| :--- | :--- | :--- |
| **Component Files** | PascalCase | `AppointmentCard.jsx`, `Modal.jsx` |
| **Page Files** | PascalCase | `BookAppointment.jsx`, `Dashboard.jsx` |
| **Layout Files** | PascalCase | `PatientLayout.jsx`, `AdminLayout.jsx` |
| **Hook Files** | camelCase (prefixed with `use`) | `useMockData.js`, `useForm.js` |
| **Utility Files** | camelCase | `formatters.js`, `validators.js` |
| **Mock Data Files** | camelCase (prefixed with `mock`) | `mockAppointments.js`, `mockDoctors.js` |
| **Asset Files** | kebab-case | `hospital-logo.svg`, `hero-banner.png` |
| **CSS Classes** | Tailwind Utility / kebab-case | `bg-sky-600 text-white p-4 rounded-lg` |

---

## 10. Future API Integration Points

Every mock service method created in Phase 2 is mapped directly to a future FastAPI endpoint (Phase 6):

| Frontend Mock Method | Target FastAPI REST Endpoint | HTTP Method |
| :--- | :--- | :--- |
| `mockApiService.login(credentials)` | `/api/v1/auth/login` | `POST` |
| `mockApiService.registerPatient(data)` | `/api/v1/auth/register` | `POST` |
| `mockApiService.getDoctors()` | `/api/v1/doctors` | `GET` |
| `mockApiService.getDoctorById(id)` | `/api/v1/doctors/{id}` | `GET` |
| `mockApiService.getAppointments(filter)` | `/api/v1/appointments` | `GET` |
| `mockApiService.createAppointment(payload)` | `/api/v1/appointments` | `POST` |
| `mockApiService.updateAppointmentStatus(id, status)`| `/api/v1/appointments/{id}/status` | `PATCH` |
| `mockApiService.getPrescriptions(patientId)` | `/api/v1/prescriptions` | `GET` |
| `mockApiService.createPrescription(payload)` | `/api/v1/prescriptions` | `POST` |
| `mockApiService.getMedicalRecords(patientId)` | `/api/v1/medical-records` | `GET` |
| `mockApiService.getInvoices(patientId)` | `/api/v1/invoices` | `GET` |
| `mockApiService.getAuditLogs()` | `/api/v1/admin/audit-logs` | `GET` |

---

## 11. Phase 2 Data Flow Architecture

In Phase 2, the data flow operates entirely within the browser context:

```
                  User Action (e.g., Clicks "Book Slot")
                                     │
                                     ▼
                   React Component (BookAppointment.jsx)
                                     │
                                     ▼
                  Component Local State / Custom Hook
                                     │
                                     ▼
             Mock Service Layer (mockApiService.createAppointment)
                                     │
                                     ▼
            Async Promise + Delay (setTimeout 400ms simulation)
                                     │
                                     ▼
                    Static Mock Dataset (mockAppointments.js)
                                     │
                                     ▼
             State Update Triggered in React Component
                                     │
                                     ▼
                  UI Rendered with New Appointment Card!
```

---

## 12. Future Data Flow Architecture (Phase 6+)

When the frontend and backend are manually connected in Phase 6, the data flow will seamlessly extend over the network:

```
                  User Action (e.g., Clicks "Book Slot")
                                     │
                                     ▼
                   React Component (BookAppointment.jsx)
                                     │
                                     ▼
               Axios HTTP Service Client (apiClient.post)
                                     │
                                     ▼
         HTTP Network Request (Authorization: Bearer <JWT>)
                                     │
                                     ▼
              FastAPI Backend Server (http://localhost:8000)
                                     │
                                     ▼
          API Router ──► Auth/Validation ──► Service ──► DB
                                     │
                                     ▼
                   HTTP JSON Response (Status 201 Created)
                                     │
                                     ▼
                     Axios Resolves Promise in Browser
                                     │
                                     ▼
                 React Component State Updates & Re-renders UI
```

---

## 13. Manual Integration Tasks (Planned for Phase 6)

During Phase 6 (Manual Connection Phase), we will execute the following explicit steps to transition from mock data to the live backend:

1. **Replace Mock Service File**: Swap `mockApiService.js` implementations with real Axios HTTP calls using an `apiClient.js` instance configured with `baseURL: 'http://localhost:8000/api/v1'`.
2. **Configure Axios Interceptors**: Add request interceptors to automatically attach the JWT access token stored in `localStorage` or `MockAuthContext` to the `Authorization` header of outgoing requests.
3. **Implement Real Error Handling**: Replace simulated mock error delays with explicit Axios `catch` blocks handling HTTP error response statuses (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `422 Unprocessable Entity`, `500 Server Error`).
4. **CORS Alignment**: Verify that the FastAPI backend explicitly permits requests originating from the frontend Vite server origin (`http://localhost:5173`).

---

## 14. Phase 2 Execution Rules & Boundaries

- **NO Backend Code**: No Python, FastAPI, or server code will be generated during Phase 2.
- **NO Database Setup**: No PostgreSQL, connection strings, or database schemas will be created.
- **NO Real API Network Calls**: All data will pass through the mock service layer.
- **NO Docker Configurations**: Docker files remain excluded until Phase 16.
- **Phase 2 Target**: Produce a standalone, interactive, visually complete React frontend application driven by mock datasets and clean UI components.

---
*End of Frontend Architecture Document - MediCare 2.0*
