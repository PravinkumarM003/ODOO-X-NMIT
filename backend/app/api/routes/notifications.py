from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.services.notification_service import get_computed_notifications

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def get_notifications_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notifications = get_computed_notifications(db)
    return notifications
