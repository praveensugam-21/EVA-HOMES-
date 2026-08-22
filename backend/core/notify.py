from sqlalchemy.orm import Session

from models.notification import Notification


def notify(db: Session, user_id: int, title: str, message: str, link: str | None = None) -> Notification:
    """
    Create an in-app notification row for a user. Called from other routers
    on key events (new enquiry, visit/offer response, verification decision).

    This only writes to the notifications table — it does not send email/SMS.
    Wiring an external channel later means reading NotificationPreference
    here and dispatching accordingly; the call sites below don't need to change.
    """
    notification = Notification(user_id=user_id, title=title, message=message, link=link)
    db.add(notification)
    return notification
