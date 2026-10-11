from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.core.dependencies import require_role, get_current_user
from app.services.overview_service import get_overview_data
from app.services.notification_service import get_paginated_notifications
from app.models.entities import Roll, Order, YarnItem, User

router = APIRouter(prefix="/overview", tags=["Overview Dashboard"])


@router.get("")
def get_overview_endpoint(
    sort_by: str = "severity",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
    data = get_overview_data(
        db,
        user_role=current_user.role,
        buyer_id=current_user.buyerId,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return {
        **data,
        "userRole": current_user.role,
    }


@router.get("/action-required")
def get_action_required_endpoint(
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    type: Optional[str] = Query(None, alias="type"),
    sort_by: str = Query("severity"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
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


@router.get("/search")
def global_search(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = q.strip().lower()
    if not q or len(q) < 2:
        return {"results": []}
        
    results = []
    
    # 1. Search Rolls
    rolls = db.execute(select(Roll).where(Roll.rollNo.ilike(f"%{q}%")).limit(5)).scalars().all()
    for r in rolls:
        results.append({
            "id": r.id,
            "type": "ROLL",
            "title": f"Roll {r.rollNo}",
            "subtitle": f"Status: {r.qcStatus} | Location: {r.stockStatus}",
            "link": f"/rolls/{r.id}"
        })
        
    # 2. Search Orders
    orders = db.execute(select(Order).where(Order.orderNo.ilike(f"%{q}%")).limit(5)).scalars().all()
    for o in orders:
        if current_user.role == "BUYER" and o.buyerId != current_user.buyerId:
            continue
            
        link = f"/buyer/orders/{o.id}" if current_user.role == "BUYER" else f"/orders/{o.id}"
        results.append({
            "id": o.id,
            "type": "ORDER",
            "title": f"Order {o.orderNo}",
            "subtitle": f"Status: {o.status} | Color: {o.colour}",
            "link": link
        })
        
    # 3. Search Yarn (Staff only)
    if current_user.role != "BUYER":
        yarns = db.execute(select(YarnItem).where(
            (YarnItem.code.ilike(f"%{q}%")) | (YarnItem.colour.ilike(f"%{q}%"))
        ).limit(5)).scalars().all()
        for y in yarns:
            results.append({
                "id": y.id,
                "type": "YARN",
                "title": f"Yarn {y.code}",
                "subtitle": f"Type: {y.yarnType} | Color: {y.colour}",
                "link": f"/yarn"
            })
            
    return {"results": results}
