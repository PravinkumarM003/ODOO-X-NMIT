from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Order, Buyer, FabricType, WorkOrder, Roll, StockMovement
from app.core.dependencies import require_role
from app.services.order_service import (
    create_order,
    review_buyer_order,
    cancel_order,
    calculate_yarn_requirement,
)
from app.services.progress_service import get_order_progress
from app.services.finance_service import calculate_order_risk, get_order_cost
from app.schemas.orders import (
    CreateOrderRequest,
    ReviewOrderRequest,
    CancelOrderRequest,
    YarnRequirementResponse,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("")
def list_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    query = select(Order).order_by(Order.createdAt.desc())
    if status_filter:
        query = query.where(Order.status == status_filter)

    orders = db.execute(query).scalars().all()
    now = datetime.now(timezone.utc)

    result = []
    for ord in orders:
        progress = get_order_progress(db, ord.id)
        risk = calculate_order_risk(ord, now)

        result.append({
            "id": ord.id,
            "orderNo": ord.orderNo,
            "buyer": {"id": ord.buyer.id, "name": ord.buyer.name} if ord.buyer else None,
            "fabricType": {"id": ord.fabricType.id, "name": ord.fabricType.name} if ord.fabricType else None,
            "colour": ord.colour,
            "qtyMetres": ord.qtyMetres,
            "deadline": ord.deadline.isoformat(),
            "pricePerMetre": ord.pricePerMetre,
            "status": ord.status,
            "currentStage": ord.currentStage,
            "shortageKg": ord.shortageKg,
            "submittedByBuyer": ord.submittedByBuyer,
            "createdAt": ord.createdAt.isoformat(),
            "progress": {
                "production": progress.production,
                "qc": progress.qc,
                "dispatch": progress.dispatch,
            },
            "risk": risk["risk"],
            "riskReason": risk["reason"],
        })

    return result


@router.get("/check-yarn")
def check_yarn_endpoint(
    fabricTypeId: str,
    qtyMetres: float,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    try:
        req = calculate_yarn_requirement(db, fabricTypeId, qtyMetres)
        return req
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/form-data")
def get_order_form_data(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    buyers = db.execute(select(Buyer).order_by(Buyer.name.asc())).scalars().all()
    fabric_types = db.execute(select(FabricType).order_by(FabricType.name.asc())).scalars().all()

    return {
        "buyers": [{"id": b.id, "name": b.name} for b in buyers],
        "fabricTypes": [
            {
                "id": f.id,
                "name": f.name,
                "gsm": f.gsm,
                "widthCm": f.widthCm,
                "yarnKgPerMetre": f.yarnKgPerMetre,
                "defaultPricePerMetre": f.defaultPricePerMetre,
            }
            for f in fabric_types
        ],
    }


@router.get("/{id}")
def get_order_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    ord = db.execute(select(Order).where(Order.id == id)).scalar_one_or_none()
    if not ord:
        raise HTTPException(status_code=404, detail=f"Order {id} not found")

    progress = get_order_progress(db, ord.id)
    risk = calculate_order_risk(ord, datetime.now(timezone.utc))
    cost = get_order_cost(db, ord.id)

    work_orders = db.execute(select(WorkOrder).where(WorkOrder.orderId == ord.id)).scalars().all()
    rolls = db.execute(select(Roll).where(Roll.orderId == ord.id)).scalars().all()
    movements = db.execute(select(StockMovement).where(StockMovement.orderId == ord.id)).scalars().all()

    return {
        "order": {
            "id": ord.id,
            "orderNo": ord.orderNo,
            "buyer": {
                "id": ord.buyer.id,
                "name": ord.buyer.name,
                "email": ord.buyer.email,
                "phone": ord.buyer.phone,
                "contactPerson": ord.buyer.contactPerson,
            } if ord.buyer else None,
            "fabricType": {
                "id": ord.fabricType.id,
                "name": ord.fabricType.name,
                "gsm": ord.fabricType.gsm,
                "widthCm": ord.fabricType.widthCm,
            } if ord.fabricType else None,
            "colour": ord.colour,
            "qtyMetres": ord.qtyMetres,
            "deadline": ord.deadline.isoformat(),
            "pricePerMetre": ord.pricePerMetre,
            "status": ord.status,
            "currentStage": ord.currentStage,
            "yarnRequiredKg": ord.yarnRequiredKg,
            "shortageKg": ord.shortageKg,
            "submittedByBuyer": ord.submittedByBuyer,
            "reviewedBy": ord.reviewedBy,
            "reviewedAt": ord.reviewedAt.isoformat() if ord.reviewedAt else None,
            "cancelReason": ord.cancelReason,
            "cancelledAt": ord.cancelledAt.isoformat() if ord.cancelledAt else None,
            "cancelledBy": ord.cancelledBy,
            "createdAt": ord.createdAt.isoformat(),
            "createdBy": ord.createdBy,
        },
        "workOrders": [
            {
                "id": w.id,
                "stage": w.stage,
                "machine": {"id": w.machine.id, "code": w.machine.code, "status": w.machine.status} if w.machine else None,
                "plannedQtyMetres": w.plannedQtyMetres,
                "producedQtyMetres": w.producedQtyMetres,
                "status": w.status,
                "startedAt": w.startedAt.isoformat() if w.startedAt else None,
                "completedAt": w.completedAt.isoformat() if w.completedAt else None,
            }
            for w in work_orders
        ],
        "rolls": [
            {
                "id": r.id,
                "rollNo": r.rollNo,
                "lengthMetres": r.lengthMetres,
                "qcStatus": r.qcStatus,
                "stockStatus": r.stockStatus,
                "weavingMachineCode": r.weavingMachine.code if r.weavingMachine else None,
                "dyeingMachineCode": r.dyeingMachine.code if r.dyeingMachine else None,
                "createdAt": r.createdAt.isoformat(),
            }
            for r in rolls
        ],
        "stockMovements": [
            {
                "id": m.id,
                "type": m.type,
                "qtyKg": m.qtyKg,
                "lotCode": m.lot.lotCode if m.lot else None,
                "reason": m.reason,
                "createdAt": m.createdAt.isoformat(),
                "createdBy": m.createdBy,
            }
            for m in movements
        ],
        "progress": {
            "production": progress.production,
            "qc": progress.qc,
            "dispatch": progress.dispatch,
        },
        "risk": risk["risk"],
        "riskReason": risk["reason"],
        "cost": cost,
    }


@router.post("")
def create_order_endpoint(
    req: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    try:
        deadline_dt = datetime.fromisoformat(req.deadline.replace("Z", "+00:00"))
        if deadline_dt.tzinfo is None:
            deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)

        order = create_order(
            db=db,
            buyer_id=req.buyerId,
            fabric_type_id=req.fabricTypeId,
            colour=req.colour,
            qty_metres=req.qtyMetres,
            deadline=deadline_dt,
            price_per_metre=req.pricePerMetre,
            created_by=current_user.name,
            submitted_by_buyer=bool(req.submittedByBuyer),
        )

        return {
            "success": True,
            "orderId": order.id,
            "orderNo": order.orderNo,
            "status": order.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{id}/review")
def review_order_endpoint(
    id: str,
    req: ReviewOrderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    try:
        order = review_buyer_order(
            db=db,
            order_id=id,
            action=req.action,
            reviewed_by=current_user.name,
            adjusted_price_per_metre=req.adjustedPricePerMetre,
            cancel_reason=req.cancelReason,
        )
        return {"success": True, "status": order.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{id}/cancel")
def cancel_order_endpoint(
    id: str,
    req: CancelOrderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    try:
        order = cancel_order(
            db=db,
            order_id=id,
            cancel_reason=req.cancelReason,
            cancelled_by=current_user.name,
        )
        return {"success": True, "status": order.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
