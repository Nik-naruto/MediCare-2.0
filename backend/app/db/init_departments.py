"""Idempotent seed script for Hospital Department Master List."""

import sys
import os
from typing import Tuple, List, Dict, Any

# Ensure backend root is on sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.db.session import SessionLocal
from app.models.department import Department

MASTER_DEPARTMENTS: List[Dict[str, str]] = [
    {
        "name": "Cardiology",
        "description": "Department for heart and cardiovascular care.",
        "location": "Block A, Floor 2",
    },
    {
        "name": "Neurology & Brain Sciences",
        "description": "Comprehensive neurological care & neurosurgery.",
        "location": "Block B, Floor 3",
    },
    {
        "name": "Orthopedics",
        "description": "Diagnosis, treatment & surgery of bone and joint disorders.",
        "location": "Block C, Floor 1",
    },
    {
        "name": "Pediatrics",
        "description": "Specialized medical care for infants, children & adolescents.",
        "location": "Block A, Floor 3",
    },
    {
        "name": "Dermatology",
        "description": "Treatment of skin, hair, nail disorders & cosmetic dermatology.",
        "location": "Block D, Floor 1",
    },
    {
        "name": "General Medicine",
        "description": "Primary medical care, diagnosis & management of adult diseases.",
        "location": "Block B, Floor 1",
    },
    {
        "name": "General Surgery",
        "description": "Surgical procedures for abdominal, soft tissue & emergency conditions.",
        "location": "Block C, Floor 2",
    },
    {
        "name": "Gynecology & Obstetrics",
        "description": "Comprehensive women's reproductive health & maternal care.",
        "location": "Block A, Floor 4",
    },
    {
        "name": "ENT (Ear, Nose & Throat)",
        "description": "Diagnosis & surgical treatment of otolaryngological disorders.",
        "location": "Block D, Floor 2",
    },
    {
        "name": "Ophthalmology",
        "description": "Eye care, vision correction & ophthalmic surgery.",
        "location": "Block D, Floor 3",
    },
    {
        "name": "Psychiatry",
        "description": "Mental health evaluation, therapy & psychiatric treatment.",
        "location": "Block E, Floor 1",
    },
    {
        "name": "Pulmonology",
        "description": "Treatment of respiratory diseases, asthma & lung conditions.",
        "location": "Block B, Floor 2",
    },
    {
        "name": "Gastroenterology",
        "description": "Digestive system, liver & gastrointestinal disorders management.",
        "location": "Block B, Floor 4",
    },
    {
        "name": "Nephrology",
        "description": "Kidney care, renal disease management & dialysis support.",
        "location": "Block C, Floor 3",
    },
    {
        "name": "Urology",
        "description": "Male & female urinary tract and male reproductive system care.",
        "location": "Block C, Floor 4",
    },
    {
        "name": "Oncology",
        "description": "Cancer diagnosis, chemotherapy & multidisciplinary tumor care.",
        "location": "Block E, Floor 2",
    },
    {
        "name": "Endocrinology",
        "description": "Hormonal, thyroid & metabolic disorder management.",
        "location": "Block B, Floor 5",
    },
    {
        "name": "Radiology",
        "description": "Diagnostic imaging including X-Ray, CT, MRI & Ultrasound.",
        "location": "Block F, Ground Floor",
    },
    {
        "name": "Dentistry",
        "description": "Comprehensive dental, oral & maxillofacial healthcare.",
        "location": "Block D, Floor 4",
    },
    {
        "name": "Emergency Medicine",
        "description": "24/7 acute trauma response & emergency resuscitation.",
        "location": "Emergency Wing, Ground Floor",
    },
    {
        "name": "Anesthesiology",
        "description": "Perioperative pain management, sedation & critical care.",
        "location": "Operation Theatre Complex, Floor 2",
    },
    {
        "name": "Pathology",
        "description": "Laboratory diagnostics, blood analysis & tissue pathology.",
        "location": "Block F, Floor 1",
    },
    {
        "name": "Physiotherapy & Rehabilitation",
        "description": "Physical therapy, injury recovery & mobility restoration.",
        "location": "Block G, Ground Floor",
    },
    {
        "name": "Rheumatology",
        "description": "Treatment of autoimmune conditions, arthritis & joint pain.",
        "location": "Block B, Floor 6",
    },
    {
        "name": "Neurosurgery",
        "description": "Surgical intervention for brain, spine & nerve disorders.",
        "location": "Block B, Floor 3",
    },
    {
        "name": "Cardiothoracic Surgery",
        "description": "Surgical care for heart, lung & chest conditions.",
        "location": "Block A, Floor 2",
    },
    {
        "name": "Vascular Surgery",
        "description": "Treatment & surgery for blood vessel & vascular diseases.",
        "location": "Block C, Floor 5",
    },
    {
        "name": "Plastic & Reconstructive Surgery",
        "description": "Reconstructive, burn & aesthetic plastic surgery.",
        "location": "Block C, Floor 6",
    },
    {
        "name": "Infectious Diseases",
        "description": "Diagnosis & management of complex viral, bacterial & fungal infections.",
        "location": "Block E, Floor 3",
    },
    {
        "name": "Internal Medicine",
        "description": "Comprehensive adult disease prevention, diagnosis & care.",
        "location": "Block B, Floor 1",
    },
]


def seed_departments() -> Dict[str, Any]:
    """
    Idempotently seed the hospital department master list.
    Preserves existing records, avoids duplicates, returns status report.
    """
    db = SessionLocal()
    added_depts = []
    skipped_depts = []

    try:
        existing = db.query(Department).all()
        existing_names_lower = {d.name.strip().lower(): d for d in existing}

        for dept_data in MASTER_DEPARTMENTS:
            name = dept_data["name"].strip()
            name_lower = name.lower()

            if name_lower in existing_names_lower:
                skipped_depts.append(name)
            else:
                new_dept = Department(
                    name=name,
                    description=dept_data["description"],
                    location=dept_data["location"],
                )
                db.add(new_dept)
                added_depts.append(name)
                # Keep tracking locally to avoid duplicates in the same batch
                existing_names_lower[name_lower] = new_dept

        if added_depts:
            db.commit()
            print(f"[SUCCESS] Added {len(added_depts)} new hospital departments.")
        else:
            print("[INFO] All master departments already exist in database. No new additions needed.")

        total_in_db = db.query(Department).count()

        result = {
            "added_count": len(added_depts),
            "added_departments": added_depts,
            "skipped_count": len(skipped_depts),
            "skipped_departments": skipped_depts,
            "total_in_db": total_in_db,
        }

        print(f"[SUMMARY] Added: {len(added_depts)} | Skipped (already existed): {len(skipped_depts)} | Total DB records: {total_in_db}")
        return result

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed departments: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_departments()
