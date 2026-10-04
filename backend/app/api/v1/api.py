"""API v1 Master Router Configuration."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    appointments,
    audit_logs,
    auth,
    departments,
    doctors,
    invoices,
    lab_reports,
    medical_records,
    notifications,
    patients,
    prescriptions,
    reports,
    schedules,
    users,
    dev,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(doctors.router, prefix="/doctors", tags=["Doctors"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["Schedules"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(medical_records.router, prefix="/medical-records", tags=["Medical Records"])
api_router.include_router(prescriptions.router, prefix="/prescriptions", tags=["Prescriptions"])
api_router.include_router(lab_reports.router, prefix="/lab-reports", tags=["Lab Reports"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(dev.router, prefix="/dev", tags=["Development & Seeding"])

