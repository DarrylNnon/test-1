import sys
import os
import time

# Add the project root to the Python path to allow for absolute imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from core.database import SessionLocal
from core import crud, models, schemas
from core.email import email_service

def dispatch_pending_notifications():
    """
    Fetches all pending notifications that are ready to be sent,
    dispatches them using the email service, and updates their status.
    This script is intended to be run frequently (e.g., every 5 minutes).
    """
    print(f"Starting notification dispatch run at {time.ctime()}...")
    db: Session = SessionLocal()
    try:
        pending_notifications = crud.get_pending_notifications(db)

        if not pending_notifications:
            print("  -> No pending notifications to send.")
            return

        print(f"  -> Found {len(pending_notifications)} pending notification(s).")

        for notification in pending_notifications:
            print(f"    - Processing notification ID: {notification.id} for user {notification.user.email}")
            try:
                # Use the mock email service to "send" the email
                email_service.send_milestone_reminder(notification)
                
                # Update the notification status to 'Sent'
                crud.update_notification_status(db, notification_id=notification.id, status=schemas.NotificationStatus.SENT)
                print(f"      + Successfully sent and marked as 'Sent'.")

            except Exception as e:
                print(f"      ! Failed to send notification {notification.id}: {e}")
                # Update the notification status to 'Failed'
                crud.update_notification_status(db, notification_id=notification.id, status=schemas.NotificationStatus.FAILED)
    finally:
        db.close()
        print("Notification dispatch run finished.")

if __name__ == "__main__":
    dispatch_pending_notifications()