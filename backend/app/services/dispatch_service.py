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
    from sqlalchemy.orm import selectinload

    # Aggregate total counts and metres in the database
    stats = db.execute(
        select(
            Roll.qcStatus,
            Roll.stockStatus,
            func.count(Roll.id).label("count"),
            func.sum(Roll.lengthMetres).label("metres")
        ).group_by(Roll.qcStatus, Roll.stockStatus)
    ).all()
    
    counts = {"shelf": 0, "awaitingQC": 0, "quarantined": 0, "dispatched": 0}
    metres = {"shelf": 0.0, "awaitingQC": 0.0, "quarantined": 0.0, "dispatched": 0.0}
    
    for qcStatus, stockStatus, count, met in stats:
        met = met or 0.0
        if qcStatus == "PASSED" and stockStatus == "IN_STORE":
            counts["shelf"] += count
            metres["shelf"] += float(met)
        elif qcStatus in ["PENDING", "REWORK"] and stockStatus == "IN_STORE":
            counts["awaitingQC"] += count
            metres["awaitingQC"] += float(met)
        elif qcStatus == "REJECTED" and stockStatus == "IN_STORE":
            counts["quarantined"] += count
            metres["quarantined"] += float(met)
        elif stockStatus == "DISPATCHED":
            counts["dispatched"] += count
            metres["dispatched"] += float(met)
            
    # Helper to fetch top 20 efficiently with required relations
    def fetch_top_20(condition):
        return db.execute(
            select(Roll)
            .where(condition)
            .order_by(Roll.createdAt.desc())
            .limit(20)
            .options(
                selectinload(Roll.order).selectinload(Order.buyer),
                selectinload(Roll.qcRecords),
                selectinload(Roll.dispatchLine).selectinload(DispatchLine.dispatch).selectinload(Dispatch.invoice)
            )
        ).scalars().all()
        
    shelf = fetch_top_20((Roll.qcStatus == "PASSED") & (Roll.stockStatus == "IN_STORE"))
    awaiting_qc = fetch_top_20(Roll.qcStatus.in_(["PENDING", "REWORK"]) & (Roll.stockStatus == "IN_STORE"))
    quarantined = fetch_top_20((Roll.qcStatus == "REJECTED") & (Roll.stockStatus == "IN_STORE"))
    dispatched = fetch_top_20(Roll.stockStatus == "DISPATCHED")

    return {
        "shelf": {
            "rolls": shelf,
            "count": counts["shelf"],
            "metres": round(metres["shelf"], 2),
        },
        "awaitingQC": {
            "rolls": awaiting_qc,
            "count": counts["awaitingQC"],
            "metres": round(metres["awaitingQC"], 2),
        },
        "quarantined": {
            "rolls": quarantined,
            "count": counts["quarantined"],
            "metres": round(metres["quarantined"], 2),
        },
        "dispatched": {
            "rolls": dispatched,
            "count": counts["dispatched"],
            "metres": round(metres["dispatched"], 2),
        },
    }
