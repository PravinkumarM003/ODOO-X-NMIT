from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.services.notification_service import get_computed_notifications, get_paginated_notifications

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def get_notifications_endpoint(
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    type: Optional[str] = Query(None, alias="type"),
    sort_by: str = Query("severity"),
    sort_order: str = Query("desc"),
    page: Optional[int] = Query(None),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if page is not None:
        return get_paginated_notifications(
            db=db,
            user_role=current_user.role,
            buyer_id=current_user.buyerId,
            page=page,
            page_size=page_size,
            search=search,
            severity=severity,
            type_filter=type,
            sort_by=sort_by,
            sort_order=sort_order,
        )
    return get_computed_notifications(db, user_role=current_user.role, buyer_id=current_user.buyerId)
