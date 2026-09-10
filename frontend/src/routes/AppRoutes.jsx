import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { PatientLayout } from '../layouts/PatientLayout';
import { DoctorLayout } from '../layouts/DoctorLayout';
import { ReceptionistLayout } from '../layouts/ReceptionistLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Route Protection Guard
import { ProtectedRoute } from './ProtectedRoute';

// Public Pages
import { Home } from '../pages/public/Home';
import { About } from '../pages/public/About';
import { Doctors } from '../pages/public/Doctors';
import { DoctorProfile as PublicDoctorProfile } from '../pages/public/DoctorProfile';
import { Services } from '../pages/public/Services';
import { Contact } from '../pages/public/Contact';
import { Login } from '../pages/public/Login';
import { Register } from '../pages/public/Register';
import { ForgotPassword } from '../pages/public/ForgotPassword';

// Patient Pages
import { PatientDashboard } from '../pages/patient/Dashboard';
import { PatientAppointments } from '../pages/patient/Appointments';
import { BookAppointment } from '../pages/patient/BookAppointment';
import { MedicalRecords } from '../pages/patient/MedicalRecords';
import { PatientPrescriptions } from '../pages/patient/Prescriptions';
import { LabReports } from '../pages/patient/LabReports';
import { PatientInvoices } from '../pages/patient/Invoices';
import { PatientNotifications } from '../pages/patient/Notifications';
import { PatientProfile } from '../pages/patient/Profile';

// Doctor Pages
import { DoctorDashboard } from '../pages/doctor/Dashboard';
import { DoctorAppointments } from '../pages/doctor/Appointments';
import { DoctorPatients } from '../pages/doctor/Patients';
import { PatientDetails } from '../pages/doctor/PatientDetails';
import { Consultation } from '../pages/doctor/Consultation';
import { DoctorPrescriptions } from '../pages/doctor/Prescriptions';
import { DoctorSchedule } from '../pages/doctor/Schedule';
import { DoctorProfile } from '../pages/doctor/Profile';

// Receptionist Pages
import { ReceptionistDashboard } from '../pages/receptionist/Dashboard';
import { ReceptionistPatients } from '../pages/receptionist/Patients';
import { WalkInRegistration } from '../pages/receptionist/WalkInRegistration';
import { ReceptionistAppointments } from '../pages/receptionist/Appointments';
import { CheckInQueue } from '../pages/receptionist/CheckInQueue';
import { Billing } from '../pages/receptionist/Billing';
import { ReceptionistProfile } from '../pages/receptionist/Profile';

// Admin Pages
import { AdminDashboard } from '../pages/admin/Dashboard';
import { UserManagement } from '../pages/admin/Users';
import { DoctorManagement } from '../pages/admin/Doctors';
import { PatientRegistry } from '../pages/admin/Patients';
import { DepartmentManagement } from '../pages/admin/Departments';
import { MasterAppointments } from '../pages/admin/Appointments';
import { Reports } from '../pages/admin/Reports';
import { AuditLogs } from '../pages/admin/AuditLogs';
import { SystemSettings } from '../pages/admin/SystemSettings';
import { AdminProfile } from '../pages/admin/Profile';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:id" element={<PublicDoctorProfile />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Patient Portal */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRole="Patient">
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="book-appointment" element={<BookAppointment />} />
        <Route path="medical-records" element={<MedicalRecords />} />
        <Route path="prescriptions" element={<PatientPrescriptions />} />
        <Route path="lab-reports" element={<LabReports />} />
        <Route path="invoices" element={<PatientInvoices />} />
        <Route path="notifications" element={<PatientNotifications />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>

      {/* Doctor Portal */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRole="Doctor">
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="patients/:id" element={<PatientDetails />} />
        <Route path="consultation/:appointmentId" element={<Consultation />} />
        <Route path="prescriptions" element={<DoctorPrescriptions />} />
        <Route path="schedule" element={<DoctorSchedule />} />
        <Route path="profile" element={<DoctorProfile />} />
      </Route>

      {/* Receptionist Portal */}
      <Route
        path="/receptionist"
        element={
          <ProtectedRoute allowedRole="Receptionist">
            <ReceptionistLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<ReceptionistDashboard />} />
        <Route path="patients" element={<ReceptionistPatients />} />
        <Route path="walk-in" element={<WalkInRegistration />} />
        <Route path="appointments" element={<ReceptionistAppointments />} />
        <Route path="queue" element={<CheckInQueue />} />
        <Route path="billing" element={<Billing />} />
        <Route path="profile" element={<ReceptionistProfile />} />
      </Route>

      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="Admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="doctors" element={<DoctorManagement />} />
        <Route path="patients" element={<PatientRegistry />} />
        <Route path="departments" element={<DepartmentManagement />} />
        <Route path="appointments" element={<MasterAppointments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      {/* Fallback Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
