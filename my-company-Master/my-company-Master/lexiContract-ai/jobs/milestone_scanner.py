import sys
import os
from datetime import date, timedelta, datetime, timezone

# Add the project root to the Python path to allow for absolute imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session, joinedload
from core.database import SessionLocal
from core import crud, models, schemas

# --- Configuration ---
NOTIFICATION_WINDOWS = [90, 60, 30, 7, 1]

def scan_for_upcoming_milestones():
    """
    Scans for contract milestones that are due in the predefined windows
    and creates notification records for them if they don't already exist.
    This script is intended to be run once daily.
    """
    print("Starting daily milestone scan for notifications...")
    db: Session = SessionLocal()
    try:
        today = date.today()

        for days_out in NOTIFICATION_WINDOWS:
            target_date = today + timedelta(days=days_out)
            print(f"  - Scanning for milestones due on {target_date} ({days_out} days out)...")

            # Find all milestones matching the target date, pre-loading related data
            milestones = db.query(models.ContractMilestone).options(
                joinedload(models.ContractMilestone.contract)
                .joinedload(models.Contract.organization)
                .joinedload(models.Organization.users)
            ).filter(models.ContractMilestone.milestone_date == target_date).all()

            if not milestones:
                print(f"    -> No milestones found for {target_date}.")
                continue

            for milestone in milestones:
                contract = milestone.contract
                organization = contract.organization
                
                if not organization or not organization.users:
                    print(f"    ! Milestone {milestone.id} for contract {contract.id} has no organization or users to notify. Skipping.")
                    continue

                print(f"    -> Found milestone '{milestone.milestone_type.value}' for contract '{contract.filename}'.")
                
                for user in organization.users:
                    details_substring = f"{days_out}-day reminder"
                    details_full = f"{details_substring} for {milestone.milestone_type.value}."

                    exists = crud.check_if_notification_exists(db, user_id=user.id, milestone_id=milestone.id, details_substring=details_substring)

                    if not exists:
                        notification_to_create = schemas.NotificationCreate(user_id=user.id, contract_id=contract.id, milestone_id=milestone.id, send_at=datetime.now(timezone.utc), details=details_full)
                        crud.create_notification(db, notification=notification_to_create)
                        print(f"      + Created '{details_substring}' notification for user {user.email}.")
                    else:
                        print(f"      = Notification for user {user.email} already exists. Skipping.")
    except Exception as e:
        print(f"An error occurred during the milestone scan: {e}")
    finally:
        db.close()
        print("Milestone scan finished.")

if __name__ == "__main__":
    scan_for_upcoming_milestones()