"""initial medicare 2.0 schema

Revision ID: ade8b7d80c08
Revises: 
Create Date: 2026-09-03 09:43:03.779775

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ade8b7d80c08'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema in strict dependency order."""
    # 1. Create users table FIRST (no foreign key dependencies)
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('full_name', sa.String(length=255), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('role', sa.Enum('PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN', name='userrole'), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # 2. Create departments table WITHOUT inline foreign key to doctors (to break circular dependency)
    op.create_table('departments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('location', sa.String(length=150), nullable=True),
    sa.Column('head_doctor_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_departments_id'), 'departments', ['id'], unique=False)
    op.create_index(op.f('ix_departments_name'), 'departments', ['name'], unique=True)

    # 3. Create doctors table (depends on users and departments)
    op.create_table('doctors',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('department_id', sa.Integer(), nullable=True),
    sa.Column('qualification', sa.String(length=200), nullable=False),
    sa.Column('specialty', sa.String(length=100), nullable=False),
    sa.Column('experience_years', sa.Integer(), nullable=False),
    sa.Column('consultation_fee', sa.Float(), nullable=False),
    sa.Column('room_no', sa.String(length=50), nullable=False),
    sa.Column('bio', sa.Text(), nullable=True),
    sa.Column('is_available', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_doctors_id'), 'doctors', ['id'], unique=False)

    # 4. Add head_doctor_id -> doctors.id constraint AFTER doctors table exists
    op.create_foreign_key(
        'fk_departments_head_doctor_id_doctors',
        'departments', 'doctors',
        ['head_doctor_id'], ['id'],
        ondelete='SET NULL'
    )

    # 5. Create patients table (depends on users)
    op.create_table('patients',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('gender', sa.Enum('MALE', 'FEMALE', 'OTHER', name='gender'), nullable=False),
    sa.Column('date_of_birth', sa.Date(), nullable=True),
    sa.Column('blood_group', sa.String(length=10), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('emergency_contact', sa.String(length=150), nullable=True),
    sa.Column('allergies', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_patients_id'), 'patients', ['id'], unique=False)

    # 6. Create doctor_schedules table (depends on doctors)
    op.create_table('doctor_schedules',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('doctor_id', sa.Integer(), nullable=False),
    sa.Column('day_of_week', sa.String(length=20), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.Column('slot_duration_minutes', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_doctor_schedules_id'), 'doctor_schedules', ['id'], unique=False)

    # 7. Create appointments table (depends on patients and doctors)
    op.create_table('appointments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('doctor_id', sa.Integer(), nullable=False),
    sa.Column('appointment_date', sa.Date(), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=True),
    sa.Column('status', sa.Enum('SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW', name='appointmentstatus'), nullable=False),
    sa.Column('token_no', sa.String(length=20), nullable=True),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('fee', sa.Float(), nullable=False),
    sa.Column('payment_status', sa.Enum('PAID', 'UNPAID', 'REFUNDED', name='paymentstatus'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_appointments_appointment_date'), 'appointments', ['appointment_date'], unique=False)
    op.create_index(op.f('ix_appointments_id'), 'appointments', ['id'], unique=False)

    # 8. Create medical_records table (depends on patients)
    op.create_table('medical_records',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('doctor_name', sa.String(length=150), nullable=True),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('category', sa.String(length=100), nullable=False),
    sa.Column('summary', sa.Text(), nullable=True),
    sa.Column('document_url', sa.String(length=500), nullable=True),
    sa.Column('record_date', sa.Date(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_medical_records_id'), 'medical_records', ['id'], unique=False)

    # 9. Create lab_reports table (depends on patients)
    op.create_table('lab_reports',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('test_name', sa.String(length=200), nullable=False),
    sa.Column('prescribed_by', sa.String(length=150), nullable=True),
    sa.Column('lab_technician', sa.String(length=150), nullable=True),
    sa.Column('request_date', sa.Date(), nullable=False),
    sa.Column('completion_date', sa.Date(), nullable=True),
    sa.Column('status', sa.Enum('PENDING', 'IN_PROGRESS', 'READY', 'CANCELLED', name='labreportstatus'), nullable=False),
    sa.Column('results_summary', sa.Text(), nullable=True),
    sa.Column('document_url', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_reports_id'), 'lab_reports', ['id'], unique=False)

    # 10. Create prescriptions table (depends on appointments, patients, doctors)
    op.create_table('prescriptions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('appointment_id', sa.Integer(), nullable=True),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('doctor_id', sa.Integer(), nullable=False),
    sa.Column('diagnosis', sa.Text(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('appointment_id')
    )
    op.create_index(op.f('ix_prescriptions_id'), 'prescriptions', ['id'], unique=False)

    # 11. Create prescription_items table (depends on prescriptions)
    op.create_table('prescription_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('prescription_id', sa.Integer(), nullable=False),
    sa.Column('medicine_name', sa.String(length=200), nullable=False),
    sa.Column('dosage', sa.String(length=100), nullable=False),
    sa.Column('frequency', sa.String(length=100), nullable=False),
    sa.Column('duration_days', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['prescription_id'], ['prescriptions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_prescription_items_id'), 'prescription_items', ['id'], unique=False)

    # 12. Create invoices table (depends on appointments, patients)
    op.create_table('invoices',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('appointment_id', sa.Integer(), nullable=True),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('invoice_date', sa.Date(), nullable=False),
    sa.Column('subtotal', sa.Float(), nullable=False),
    sa.Column('tax', sa.Float(), nullable=False),
    sa.Column('total_amount', sa.Float(), nullable=False),
    sa.Column('payment_status', sa.Enum('PAID', 'UNPAID', 'REFUNDED', name='paymentstatus'), nullable=False),
    sa.Column('payment_method', sa.String(length=100), nullable=True),
    sa.Column('transaction_id', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('appointment_id')
    )
    op.create_index(op.f('ix_invoices_id'), 'invoices', ['id'], unique=False)

    # 13. Create invoice_items table (depends on invoices)
    op.create_table('invoice_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('invoice_id', sa.Integer(), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=False),
    sa.Column('amount', sa.Float(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_invoice_items_id'), 'invoice_items', ['id'], unique=False)

    # 14. Create notifications table (depends on users)
    op.create_table('notifications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=False),
    sa.Column('notification_type', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)

    # 15. Create audit_logs table (depends on users)
    op.create_table('audit_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('user_name', sa.String(length=150), nullable=True),
    sa.Column('role', sa.String(length=50), nullable=True),
    sa.Column('action', sa.String(length=100), nullable=False),
    sa.Column('resource', sa.String(length=200), nullable=True),
    sa.Column('details', sa.Text(), nullable=True),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema in strict reverse dependency order."""
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')

    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')

    op.drop_index(op.f('ix_invoice_items_id'), table_name='invoice_items')
    op.drop_table('invoice_items')

    op.drop_index(op.f('ix_invoices_id'), table_name='invoices')
    op.drop_table('invoices')

    op.drop_index(op.f('ix_prescription_items_id'), table_name='prescription_items')
    op.drop_table('prescription_items')

    op.drop_index(op.f('ix_prescriptions_id'), table_name='prescriptions')
    op.drop_table('prescriptions')

    op.drop_index(op.f('ix_lab_reports_id'), table_name='lab_reports')
    op.drop_table('lab_reports')

    op.drop_index(op.f('ix_medical_records_id'), table_name='medical_records')
    op.drop_table('medical_records')

    op.drop_index(op.f('ix_appointments_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_appointment_date'), table_name='appointments')
    op.drop_table('appointments')

    op.drop_index(op.f('ix_doctor_schedules_id'), table_name='doctor_schedules')
    op.drop_table('doctor_schedules')

    op.drop_index(op.f('ix_patients_id'), table_name='patients')
    op.drop_table('patients')

    # Drop head_doctor_id constraint on departments BEFORE dropping doctors
    op.drop_constraint('fk_departments_head_doctor_id_doctors', 'departments', type_='foreignkey')

    op.drop_index(op.f('ix_doctors_id'), table_name='doctors')
    op.drop_table('doctors')

    op.drop_index(op.f('ix_departments_name'), table_name='departments')
    op.drop_index(op.f('ix_departments_id'), table_name='departments')
    op.drop_table('departments')

    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
