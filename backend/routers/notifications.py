# ============================================================
# routers/notifications.py — In-App Notifications
# ============================================================
# GET /api/notifications              → list current user's notifications
# PUT /api/notifications/{id}/read     → mark one as read
# PUT /api/notifications/read-all      → mark all as read
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models.notification import Notification
from models.user import User
from routers.auth import get_current_user
from schemas.notification import NotificationListResponse, NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse, summary="List the current user's notifications")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
        .all()
    )
    unread_count = (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .scalar()
        or 0
    )
    return NotificationListResponse(items=notifications, total=len(notifications), unread_count=unread_count)


@router.put("/read-all", response_model=NotificationListResponse, summary="Mark all notifications as read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
        .all()
    )
    return NotificationListResponse(items=notifications, total=len(notifications), unread_count=0)


@router.put("/{notification_id}/read", response_model=NotificationResponse, summary="Mark one notification as read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification
