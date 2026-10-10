from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.entities import Dispatch, DispatchLine, Invoice, Payment, Roll, Order
from app.services.order_status_service import recompute_order_status


def create_dispatch(
    db: Session,
    order_id: str,
    roll_ids: List[str],
    truck_no: str,
    driver_name: str,
    dispatched_by: str,
) -> Dict[str, Any]:
    if not roll_ids:
        raise ValueError("At least one roll must be selected for dispatch")
    if not truck_no or not truck_no.strip():
        raise ValueError("Truck number is required")
    if not driver_name or not driver_name.strip():
        raise ValueError("Driver name is required")

    order = db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
    if not order:
        raise ValueError(f"Order {order_id} not found")

    selected_rolls = db.execute(select(Roll).where(Roll.id.in_(roll_ids))).scalars().all()
    if len(selected_rolls) != len(roll_ids):
        raise ValueError("One or more selected rolls could not be found")

    total_metres = 0.0

    for roll in selected_rolls:
        if roll.orderId != order.id:
            raise ValueError(f"Roll {roll.rollNo} does not belong to Order {order.orderNo}")

        if roll.dispatchLine or roll.stockStatus == "DISPATCHED":
            raise ValueError(f"Roll {roll.rollNo} has already been dispatched")

        if roll.qcStatus == "REJECTED":
            raise ValueError(f"Roll {roll.rollNo} is Rejected (quarantined) and cannot be dispatched")

        if roll.qcStatus != "PASSED" or roll.stockStatus != "IN_STORE":
            raise ValueError(f"Roll {roll.rollNo} is not ready for dispatch (QC: {roll.qcStatus}, Stock: {roll.stockStatus})")

        total_metres += roll.lengthMetres

    total_metres = round(total_metres, 2)

    dispatch_count = db.scalar(select(func.count(Dispatch.id))) or 0
    dispatch_no = f"DSP-{str(dispatch_count + 1).zfill(4)}"

    dispatch = Dispatch(
        dispatchNo=dispatch_no,
        orderId=order.id,
        buyerId=order.buyerId,
        truckNo=truck_no.strip(),
        driverName=driver_name.strip(),
        dispatchedBy=dispatched_by,
        dispatchedAt=datetime.now(timezone.utc),
    )
    db.add(dispatch)
    db.flush()

    for roll in selected_rolls:
        line = DispatchLine(
            dispatchId=dispatch.id,
            rollId=roll.id,
            lengthMetres=roll.lengthMetres,
        )
        db.add(line)
        roll.stockStatus = "DISPATCHED"

    # BR-17 Matching invoice creation in same transaction
    invoice_amount = round(total_metres * order.pricePerMetre, 2)
    invoice_count = db.scalar(select(func.count(Invoice.id))) or 0
    invoice_no = f"INV-{str(invoice_count + 1).zfill(4)}"

    invoice = Invoice(
        invoiceNo=invoice_no,
        orderId=order.id,
        dispatchId=dispatch.id,
        amount=invoice_amount,
        status="UNPAID",
        issuedAt=datetime.now(timezone.utc),
    )
    db.add(invoice)
    db.flush()

    # BR-16 Status recomputation
    recompute_order_status(db, order.id)

    db.commit()
    db.refresh(dispatch)
    db.refresh(invoice)

    return {
        "dispatch": dispatch,
        "invoice": invoice,
        "totalMetres": total_metres,
        "rollCount": len(selected_rolls),
    }


def record_payment(
    db: Session,
    invoice_id: str,
    amount: float,
    method: str,
    reference: Optional[str] = None,
) -> Payment:
    if amount <= 0:
        raise ValueError("Payment amount must be greater than 0")
    if method not in ["BANK", "CASH", "UPI"]:
        raise ValueError(f"Invalid payment method: {method}")

    invoice = db.execute(select(Invoice).where(Invoice.id == invoice_id)).scalar_one_or_none()
    if not invoice:
        raise ValueError(f"Invoice {invoice_id} not found")

    payments = db.execute(select(Payment).where(Payment.invoiceId == invoice.id)).scalars().all()
    total_paid = sum(p.amount for p in payments)
    balance = round(invoice.amount - total_paid, 2)

    if amount > balance:
        raise ValueError(f"Payment amount (₹{amount}) exceeds outstanding balance (₹{balance})")

    payment = Payment(
        invoiceId=invoice.id,
        amount=amount,
        method=method,
        reference=reference,
        receivedAt=datetime.now(timezone.utc),
    )
    db.add(payment)

    new_total_paid = round(total_paid + amount, 2)
    if new_total_paid >= invoice.amount:
        invoice.status = "PAID"
    elif new_total_paid > 0:
        invoice.status = "PARTIAL"
    else:
        invoice.status = "UNPAID"

    db.commit()
    db.refresh(payment)
    return payment


def get_store_rolls(db: Session) -> Dict[str, Any]:
    rolls = db.execute(select(Roll).order_by(Roll.createdAt.desc())).scalars().all()

    shelf = [r for r in rolls if r.qcStatus == "PASSED" and r.stockStatus == "IN_STORE"]
    awaiting_qc = [r for r in rolls if r.qcStatus in ["PENDING", "REWORK"] and r.stockStatus == "IN_STORE"]
    quarantined = [r for r in rolls if r.qcStatus == "REJECTED" and r.stockStatus == "IN_STORE"]
    dispatched = [r for r in rolls if r.stockStatus == "DISPATCHED"]

    return {
        "shelf": {
            "rolls": shelf,
            "count": len(shelf),
            "metres": round(sum(r.lengthMetres for r in shelf), 2),
        },
        "awaitingQC": {
            "rolls": awaiting_qc,
            "count": len(awaiting_qc),
            "metres": round(sum(r.lengthMetres for r in awaiting_qc), 2),
        },
        "quarantined": {
            "rolls": quarantined,
            "count": len(quarantined),
            "metres": round(sum(r.lengthMetres for r in quarantined), 2),
        },
        "dispatched": {
            "rolls": dispatched,
            "count": len(dispatched),
            "metres": round(sum(r.lengthMetres for r in dispatched), 2),
        },
    }
