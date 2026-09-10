"""Domain Enumeration Types for MediCare 2.0."""

import enum


class UserRole(str, enum.Enum):
    """User account roles."""

    PATIENT = "Patient"
    DOCTOR = "Doctor"
    RECEPTIONIST = "Receptionist"
    ADMIN = "Admin"


class AppointmentStatus(str, enum.Enum):
    """Appointment consultation lifecycle statuses."""

    SCHEDULED = "Scheduled"
    CHECKED_IN = "Checked In"
    IN_CONSULTATION = "In Consultation"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    NO_SHOW = "No Show"


class PaymentStatus(str, enum.Enum):
    """Billing and invoice payment statuses."""

    PAID = "Paid"
    UNPAID = "Unpaid"
    REFUNDED = "Refunded"


class LabReportStatus(str, enum.Enum):
    """Pathology lab test diagnostic statuses."""

    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    READY = "Ready"
    CANCELLED = "Cancelled"


class Gender(str, enum.Enum):
    """Gender classifications."""

    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"
