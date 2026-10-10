from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Order, Buyer, FabricType, Invoice
from app.core.dependencies import require_role
from app.services.order_service import create_order
from app.services.progress_service import get_order_progress
from app.services.finance_service import calculate_order_risk
from app.schemas.orders import CreateOrderRequest

router = APIRouter(prefix="/buyer", tags=["Buyer Portal"])


def get_buyer_status_wording(status: str, current_stage: Optional[str] = None) -> str:
    if status == "NEW":
        return "Order received"
    if status == "AWAITING_YARN":
        return "Waiting for raw material"
    if status == "CONFIRMED":
        return "Material reserved, scheduled"
    if status == "IN_PRODUCTION":
        if current_stage == "SPINNING":
            return "In spinning"
        if current_stage == "WEAVING":
            return "Being woven"
        if current_stage == "DYEING":
            return "Being dyed"
        return "In production"
    if status == "IN_QC":
        return "Being checked"
    if status == "READY_TO_SHIP":
        return "Ready to ship"
    if status == "PARTIALLY_DISPATCHED":
        return "Partly shipped"
    if status == "COMPLETED":
        return "Delivered / fully shipped"
    if status == "CANCELLED":
        return "Cancelled"
    return status


@router.get("/orders")
def get_buyer_orders(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["BUYER"])),
):
    if not current_user.buyerId:
        raise HTTPException(status_code=403, detail="User is not linked to any buyer entity")

    buyer = db.execute(select(Buyer).where(Buyer.id == current_user.buyerId)).scalar_one_or_none()
    orders = db.execute(
        select(Order)
        .where(Order.buyerId == current_user.buyerId)
        .order_by(Order.createdAt.desc())
    ).scalars().all()

    orders_data = []
    for ord in orders:
        progress = get_order_progress(db, ord.id)
        buyer_status_text = get_buyer_status_wording(ord.status, ord.currentStage)

        orders_data.append({
            "id": ord.id,
            "orderNo": ord.orderNo,
            "fabricName": ord.fabricType.name if ord.fabricType else "",
            "colour": ord.colour,
            "qtyMetres": ord.qtyMetres,
            "deadline": ord.deadline.isoformat(),
            "buyerStatusText": buyer_status_text,
            "internalStatus": ord.status,
            "productionProgressPercent": progress.production,
            "qcReadinessText": f"{progress.qc}% Ready",
            "dispatchSummaryText": f"{progress.dispatch}% Shipped",
        })

    fabric_types = db.execute(select(FabricType).order_by(FabricType.name.asc())).scalars().all()

    return {
        "orders": orders_data,
        "fabricTypes": [
            {"id": f.id, "name": f.name, "defaultPricePerMetre": f.defaultPricePerMetre}
            for f in fabric_types
        ],
        "buyerName": buyer.name if buyer else current_user.name,
    }


@router.get("/orders/{id}")
def get_buyer_order_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["BUYER"])),
):
    if not current_user.buyerId:
        raise HTTPException(status_code=403, detail="User is not linked to any buyer entity")

    ord = db.execute(select(Order).where(Order.id == id)).scalar_one_or_none()
    if not ord or ord.buyerId != current_user.buyerId:
        raise HTTPException(status_code=404, detail="Order not found")

    progress = get_order_progress(db, ord.id)
    buyer_status = get_buyer_status_wording(ord.status, ord.currentStage)

    # Estimate days
    stage_estimates = {"SPINNING": 2, "WEAVING": 3, "DYEING": 2}
    estimated_days = 1
    for wo in ord.workOrders:
        if wo.status != "COMPLETED":
            estimated_days += stage_estimates.get(wo.stage, 2)

    now = datetime.now(timezone.utc)
    est_ready_date = datetime.fromtimestamp(now.timestamp() + estimated_days * 86400, tz=timezone.utc)

    passed_rolls_count = sum(1 for r in ord.rolls if r.qcStatus == "PASSED")
    awaiting_check_count = sum(1 for r in ord.rolls if r.qcStatus in ["PENDING", "REWORK"])

    return {
        "order": {
            "id": ord.id,
            "orderNo": ord.orderNo,
            "fabricName": ord.fabricType.name if ord.fabricType else "",
            "colour": ord.colour,
            "qtyMetres": ord.qtyMetres,
            "createdAt": ord.createdAt.isoformat(),
            "deadline": ord.deadline.isoformat(),
            "status": ord.status,
            "currentStage": ord.currentStage,
            "buyerStatus": buyer_status,
            "estimatedCompletion": "Delivered" if ord.status == "COMPLETED" else f"~{est_ready_date.strftime('%Y-%m-%d')} (Estimate)",
        },
        "progress": {
            "productionProgressPercent": progress.production,
            "qcReadinessText": f"{progress.qc}% Ready",
            "passedRollsCount": passed_rolls_count,
            "awaitingCheckCount": awaiting_check_count,
            "dispatchSummaryText": f"{progress.dispatch}% Shipped",
        },
        "workOrders": [
            {"stage": w.stage, "status": w.status}
            for w in ord.workOrders
        ],
        "dispatches": [
            {
                "id": d.id,
                "dispatchNo": d.dispatchNo,
                "truckNo": d.truckNo,
                "driverName": d.driverName,
                "dispatchedAt": d.dispatchedAt.isoformat(),
                "rollCount": len(d.lines),
                "totalMetres": round(sum(l.lengthMetres for l in d.lines), 2),
            }
            for d in ord.dispatches
        ],
        "invoices": [
            {
                "id": inv.id,
                "invoiceNo": inv.invoiceNo,
                "amount": inv.amount,
                "status": inv.status,
            }
            for inv in ord.invoices
        ],
    }


@router.post("/orders")
def request_buyer_order_endpoint(
    req: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["BUYER"])),
):
    if not current_user.buyerId:
        raise HTTPException(status_code=403, detail="User is not linked to any buyer entity")

    try:
        deadline_dt = datetime.fromisoformat(req.deadline.replace("Z", "+00:00"))
        if deadline_dt.tzinfo is None:
            deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)

        order = create_order(
            db=db,
            buyer_id=current_user.buyerId,
            fabric_type_id=req.fabricTypeId,
            colour=req.colour,
            qty_metres=req.qtyMetres,
            deadline=deadline_dt,
            created_by=current_user.name,
            submitted_by_buyer=True,
        )

        return {
            "success": True,
            "orderId": order.id,
            "orderNo": order.orderNo,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoices")
def get_buyer_invoices(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["BUYER"])),
):
    if not current_user.buyerId:
        raise HTTPException(status_code=403, detail="User is not linked to any buyer entity")

    invoices = db.execute(
        select(Invoice)
        .join(Order, Invoice.orderId == Order.id)
        .where(Order.buyerId == current_user.buyerId)
        .order_by(Invoice.issuedAt.desc())
    ).scalars().all()

    invoices_data = []
    for inv in invoices:
        paid = sum(p.amount for p in inv.payments)
        invoices_data.append({
            "id": inv.id,
            "invoiceNo": inv.invoiceNo,
            "orderNo": inv.order.orderNo if inv.order else "",
            "dispatchNo": inv.dispatch.dispatchNo if inv.dispatch else "",
            "issuedAt": inv.issuedAt.isoformat(),
            "amount": inv.amount,
            "paidAmount": round(paid, 2),
            "status": inv.status,
        })

    return invoices_data
