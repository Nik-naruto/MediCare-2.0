"""Development & Production Seed Endpoint."""

from fastapi import APIRouter, HTTPException, status
from app.db.seed_demo_data import seed_demo_dataset

router = APIRouter()


@router.get("/seed-demo-data", tags=["Development & Seeding"])
@router.post("/seed-demo-data", tags=["Development & Seeding"])
def seed_production_demo_data():
    """Seed complete demo dataset into production database (60 Doctors, 5 Receptionists, 20 Patients, Schedules, Appointments)."""
    try:
        seed_demo_dataset()
        return {
            "status": "success",
            "message": "Successfully seeded demo dataset into production database (60 Doctors, 5 Receptionists, 20 Patients, Schedules, Appointments).",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Production seeding failed: {str(e)}",
        )
