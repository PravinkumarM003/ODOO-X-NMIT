from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Order, Dispatch, Invoice, Roll
from app.core.dependencies import require_role
from app.services.dispatch_service import create_dispatch, record_payment
from app.schemas.dispatch import CreateDispatchRequest, RecordPaymentRequest

router = APIRouter(prefix="/dispatch", tags=["Dispatch & Invoices"])


@router.get("")
def get_dispatch_data(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    # Orders ready for dispatch
    orders = db.execute(
        select(Order)
        .where(Order.status.in_(["READY_TO_SHIP", "PARTIALLY_DISPATCHED"]))
        .order_by(Order.orderNo.asc())
    ).scalars().all()

    ready_orders = []
    for ord in orders:
        passed_rolls = [
            {
                "id": r.id,
                "rollNo": r.rollNo,
                "lengthMetres": r.lengthMetres,
            }
            for r in ord.rolls
            if r.qcStatus == "PASSED" and r.stockStatus == "IN_STORE"
        ]

        if passed_rolls:
            ready_orders.append({
                "id": ord.id,
                "orderNo": ord.orderNo,
                "buyerName": ord.buyer.name if ord.buyer else "",
                "fabricName": ord.fabricType.name if ord.fabricType else "",
                "colour": ord.colour,
                "pricePerMetre": ord.pricePerMetre,
                "status": ord.status,
                "rolls": passed_rolls,
            })

    # Recent dispatches
    recent_dispatches = db.execute(
        select(Dispatch).order_by(Dispatch.dispatchedAt.desc()).limit(15)
    ).scalars().all()

    dispatches_data = [
        {
            "id": d.id,
            "dispatchNo": d.dispatchNo,
            "orderNo": d.order.orderNo if d.order else "",
            "buyerName": d.buyer.name if d.buyer else "",
            "truckNo": d.truckNo,
            "driverName": d.driverName,
            "dispatchedAt": d.dispatchedAt.isoformat(),
            "dispatchedBy": d.dispatchedBy,
            "rollCount": len(d.lines),
            "totalMetres": round(sum(l.lengthMetres for l in d.lines), 2),
            "invoiceNo": d.invoice.invoiceNo if d.invoice else None,
            "invoiceAmount": d.invoice.amount if d.invoice else None,
            "invoiceStatus": d.invoice.status if d.invoice else None,
        }
        for d in recent_dispatches
    ]

    # Invoices list
    invoices = db.execute(select(Invoice).order_by(Invoice.issuedAt.desc())).scalars().all()
    invoices_data = []
    for inv in invoices:
        paid = sum(p.amount for p in inv.payments)
        invoices_data.append({
            "id": inv.id,
            "invoiceNo": inv.invoiceNo,
            "orderNo": inv.order.orderNo if inv.order else "",
            "buyerName": inv.order.buyer.name if inv.order and inv.order.buyer else "",
            "amount": inv.amount,
            "paidAmount": round(paid, 2),
            "balance": round(inv.amount - paid, 2),
            "status": inv.status,
            "issuedAt": inv.issuedAt.isoformat(),
        })

    return {
        "readyOrders": ready_orders,
        "dispatches": dispatches_data,
        "invoices": invoices_data,
    }


@router.post("/create")
def create_dispatch_endpoint(
    req: CreateDispatchRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    try:
        result = create_dispatch(
            db=db,
            order_id=req.orderId,
            roll_ids=req.rollIds,
            truck_no=req.truckNo,
            driver_name=req.driverName,
            dispatched_by=current_user.name,
        )
        return {
            "success": True,
            "dispatchNo": result["dispatch"].dispatchNo,
            "invoiceNo": result["invoice"].invoiceNo,
            "rollCount": result["rollCount"],
            "totalMetres": result["totalMetres"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payment")
def record_payment_endpoint(
    req: RecordPaymentRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    try:
        payment = record_payment(
            db=db,
            invoice_id=req.invoiceId,
            amount=req.amount,
            method=req.method,
            reference=req.reference,
        )
        return {"success": True, "paymentId": payment.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
