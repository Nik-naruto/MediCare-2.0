import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import get_password_hash
from app.services.audit_log import AuditLogService

def seed_admin_user():
    db = SessionLocal()
    try:
        email = "admin@medicare.demo"
        raw_password = "Medicare@123"
        full_name = "MediCare System Administrator"
        
        # Check if Admin user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        
        hashed_password = get_password_hash(raw_password)

        if existing_user:
            print(f"[EXISTS] Admin account '{email}' found in database. Updating credentials and active status.")
            existing_user.hashed_password = hashed_password
            existing_user.full_name = full_name
            existing_user.role = UserRole.ADMIN
            existing_user.is_active = True
            db.commit()
            db.refresh(existing_user)
            print(f"[SUCCESS] Admin account '{email}' updated successfully -> User ID #{existing_user.id}")
            return False, existing_user.id
        else:
            print(f"[NEW] Creating new Admin account '{email}' in database.")
            admin_user = User(
                email=email,
                hashed_password=hashed_password,
                full_name=full_name,
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

            # Record audit log event for initial system admin bootstrap
            AuditLogService(db).log_action(
                action="USER_CREATE",
                user=admin_user,
                resource=f"User #{admin_user.id}",
                details=f"Bootstrapped System Administrator account '{email}'",
            )
            print(f"[SUCCESS] Admin account '{email}' created successfully -> User ID #{admin_user.id}")
            return True, admin_user.id
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed Admin user: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin_user()
