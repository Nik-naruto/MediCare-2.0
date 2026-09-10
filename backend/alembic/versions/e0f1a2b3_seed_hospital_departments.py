"""seed master hospital departments list

Revision ID: e0f1a2b3_dept_master
Revises: d9f01e23_doc_photo_url
Create Date: 2026-09-05 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e0f1a2b3_dept_master'
down_revision: Union[str, None] = 'd9f01e23_doc_photo_url'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MASTER_DEPARTMENTS = [
    ("Cardiology", "Department for heart and cardiovascular care.", "Block A, Floor 2"),
    ("Neurology & Brain Sciences", "Comprehensive neurological care & neurosurgery.", "Block B, Floor 3"),
    ("Orthopedics", "Diagnosis, treatment & surgery of bone and joint disorders.", "Block C, Floor 1"),
    ("Pediatrics", "Specialized medical care for infants, children & adolescents.", "Block A, Floor 3"),
    ("Dermatology", "Treatment of skin, hair, nail disorders & cosmetic dermatology.", "Block D, Floor 1"),
    ("General Medicine", "Primary medical care, diagnosis & management of adult diseases.", "Block B, Floor 1"),
    ("General Surgery", "Surgical procedures for abdominal, soft tissue & emergency conditions.", "Block C, Floor 2"),
    ("Gynecology & Obstetrics", "Comprehensive women's reproductive health & maternal care.", "Block A, Floor 4"),
    ("ENT (Ear, Nose & Throat)", "Diagnosis & surgical treatment of otolaryngological disorders.", "Block D, Floor 2"),
    ("Ophthalmology", "Eye care, vision correction & ophthalmic surgery.", "Block D, Floor 3"),
    ("Psychiatry", "Mental health evaluation, therapy & psychiatric treatment.", "Block E, Floor 1"),
    ("Pulmonology", "Treatment of respiratory diseases, asthma & lung conditions.", "Block B, Floor 2"),
    ("Gastroenterology", "Digestive system, liver & gastrointestinal disorders management.", "Block B, Floor 4"),
    ("Nephrology", "Kidney care, renal disease management & dialysis support.", "Block C, Floor 3"),
    ("Urology", "Male & female urinary tract and male reproductive system care.", "Block C, Floor 4"),
    ("Oncology", "Cancer diagnosis, chemotherapy & multidisciplinary tumor care.", "Block E, Floor 2"),
    ("Endocrinology", "Hormonal, thyroid & metabolic disorder management.", "Block B, Floor 5"),
    ("Radiology", "Diagnostic imaging including X-Ray, CT, MRI & Ultrasound.", "Block F, Ground Floor"),
    ("Dentistry", "Comprehensive dental, oral & maxillofacial healthcare.", "Block D, Floor 4"),
    ("Emergency Medicine", "24/7 acute trauma response & emergency resuscitation.", "Emergency Wing, Ground Floor"),
    ("Anesthesiology", "Perioperative pain management, sedation & critical care.", "Operation Theatre Complex, Floor 2"),
    ("Pathology", "Laboratory diagnostics, blood analysis & tissue pathology.", "Block F, Floor 1"),
    ("Physiotherapy & Rehabilitation", "Physical therapy, injury recovery & mobility restoration.", "Block G, Ground Floor"),
    ("Rheumatology", "Treatment of autoimmune conditions, arthritis & joint pain.", "Block B, Floor 6"),
    ("Neurosurgery", "Surgical intervention for brain, spine & nerve disorders.", "Block B, Floor 3"),
    ("Cardiothoracic Surgery", "Surgical care for heart, lung & chest conditions.", "Block A, Floor 2"),
    ("Vascular Surgery", "Treatment & surgery for blood vessel & vascular diseases.", "Block C, Floor 5"),
    ("Plastic & Reconstructive Surgery", "Reconstructive, burn & aesthetic plastic surgery.", "Block C, Floor 6"),
    ("Infectious Diseases", "Diagnosis & management of complex viral, bacterial & fungal infections.", "Block E, Floor 3"),
    ("Internal Medicine", "Comprehensive adult disease prevention, diagnosis & care.", "Block B, Floor 1"),
]

def upgrade() -> None:
    conn = op.get_bind()
    # Fetch existing department names
    res = conn.execute(sa.text("SELECT name FROM departments"))
    existing = {row[0].strip().lower() for row in res.fetchall()}

    for name, desc, loc in MASTER_DEPARTMENTS:
        if name.strip().lower() not in existing:
            conn.execute(
                sa.text("INSERT INTO departments (name, description, location, created_at, updated_at) VALUES (:name, :desc, :loc, NOW(), NOW())"),
                {"name": name, "desc": desc, "loc": loc}
            )
            existing.add(name.strip().lower())

def downgrade() -> None:
    # Do not delete master departments on downgrade to prevent data loss or broken FK references
    pass
