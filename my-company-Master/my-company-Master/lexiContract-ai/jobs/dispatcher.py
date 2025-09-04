import httpx
import asyncio
from sqlalchemy.orm import Session
from core.database import SessionLocal
from core import crud, models, email_service, schemas

EXPO_PUSH_URL = "https://api.expo.dev/v2/push/send"

async def send_push_notification(token: str, title: str, body: str, data: dict):
    """Sends a single push notification via Expo's push service."""
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "data": data,
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(EXPO_PUSH_URL, json=payload, headers={"Content-Type": "application/json"})
            response.raise_for_status()
            print(f"Successfully sent push notification to token: {token}")
            return True
        except httpx.HTTPStatusError as e:
            print(f"Error sending push notification to {token}: {e.response.status_code} - {e.response.text}")
            return False
        except Exception as e:
            print(f"An unexpected error occurred while sending push notification: {e}")
            return False

async def dispatch_pending_notifications():
    """
    Fetches pending notifications from the database and dispatches them
    via email and push notification channels.
    """
    print("Running notification dispatcher job...")
    db = SessionLocal()
    try:
        pending_notifications = crud.get_pending_notifications(db)
        if not pending_notifications:
            print("No pending notifications to dispatch.")
            return

        print(f"Found {len(pending_notifications)} pending notifications.")
        for notification in pending_notifications:
            success = True
            email_service.send_milestone_reminder(notification)

            if notification.user.devices:
                push_title = f"Contract Milestone: {notification.milestone.milestone_type.value}"
                push_body = f"'{notification.contract.filename}' is due on {notification.milestone.milestone_date.strftime('%Y-%m-%d')}."
                push_data = {"contractId": str(notification.contract.id)}

                for device in notification.user.devices:
                    if not await send_push_notification(token=device.device_token, title=push_title, body=push_body, data=push_data):
                        success = False

            final_status = schemas.NotificationStatus.SENT if success else schemas.NotificationStatus.FAILED
            crud.update_notification_status(db, notification_id=notification.id, status=final_status)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(dispatch_pending_notifications())