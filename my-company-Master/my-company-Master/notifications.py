from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from core import crud, models, schemas
from api.v1 import dependencies
from core.database import get_db, SessionLocal
from core.websockets import user_manager

router = APIRouter()

@router.get("/", response_model=List[schemas.Notification])
def list_notifications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Retrieve all notifications for the current user.
    """
    notifications = crud.get_notifications_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return notifications

@router.patch("/{notification_id}/read", response_model=schemas.Notification)
def mark_notification_as_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user),
):
    """
    Mark a notification as read.
    """
    notification = crud.get_notification(db, notification_id=notification_id)

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found"
        )

    if notification.recipient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this notification",
        )

    updated_notification = crud.mark_notification_as_read(db, notification=notification)
    return updated_notification

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    current_user: models.User = Depends(dependencies.get_current_user_ws),
):
    """
    Handles WebSocket connections for user-specific notifications.
    """
    user_id = str(current_user.id)
    await user_manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive to receive broadcasts.
            await websocket.receive_text()
    except WebSocketDisconnect:
        user_manager.disconnect(user_id)