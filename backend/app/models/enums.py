"""Domain Enumeration Types for MediCare 2.0."""

import enum


class UserRole(str, enum.Enum):
    """User account roles."""

    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    RECEPTIONIST = "RECEPTIONIST"
    ADMIN = "ADMIN"


class AppointmentStatus(str, enum.Enum):
    """Appointment consultation lifecycle statuses."""

    SCHEDULED = "SCHEDULED"
    CHECKED_IN = "CHECKED_IN"
    IN_CONSULTATION = "IN_CONSULTATION"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class PaymentStatus(str, enum.Enum):
    """Billing and invoice payment statuses."""

    PAID = "PAID"
    UNPAID = "UNPAID"
    REFUNDED = "REFUNDED"


class LabReportStatus(str, enum.Enum):
    """Pathology lab test diagnostic statuses."""

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    READY = "READY"
    CANCELLED = "CANCELLED"


class Gender(str, enum.Enum):
    """Gender classifications."""

    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
