from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.entities import Roll, QCRecord, Order, WorkOrder
from app.services.order_status_service import recompute_order_status


class RollInput(BaseModel):
    lengthMetres: float


def register_rolls(
    db: Session,
    order_id: str,
    rolls: List[RollInput],
    registered_by: str,
) -> List[Roll]:
    if not rolls:
        raise ValueError("At least one roll must be registered")

    order = db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
    if not order:
        raise ValueError(f"Order {order_id} not found")

    work_orders = db.execute(select(WorkOrder).where(WorkOrder.orderId == order.id)).scalars().all()
    weaving_wo = next((w for w in work_orders if w.stage == "WEAVING"), None)
    dyeing_wo = next((w for w in work_orders if w.stage == "DYEING"), None)

    existing_rolls = db.execute(select(Roll).where(Roll.orderId == order.id)).scalars().all()
    current_total_metres = sum(r.lengthMetres for r in existing_rolls)
    new_rolls_metres = sum(r.lengthMetres for r in rolls)
    combined_total = current_total_metres + new_rolls_metres
    max_allowed = round(order.qtyMetres * 1.05, 2)

    if combined_total > max_allowed:
        raise ValueError(
            f"Total registered roll length ({combined_total} m) exceeds order quantity + 5% tolerance ({max_allowed} m)"
        )

    total_roll_count = db.scalar(select(func.count(Roll.id))) or 0
    created_rolls: List[Roll] = []
    next_index = total_roll_count + 1

    for r_in in rolls:
        if r_in.lengthMetres <= 0:
            raise ValueError("Roll length must be greater than 0 metres")

        roll_no = f"ROLL-{str(next_index).zfill(4)}"
        next_index += 1

        roll = Roll(
            rollNo=roll_no,
            orderId=order.id,
            weavingMachineId=weaving_wo.machineId if weaving_wo else None,
            dyeingMachineId=dyeing_wo.machineId if dyeing_wo else None,
            lengthMetres=r_in.lengthMetres,
            qcStatus="PENDING",
            stockStatus="IN_STORE",
            createdAt=datetime.now(timezone.utc),
        )
        db.add(roll)
        created_rolls.append(roll)

    # If dyeing is completed or order in QC/shipped, recompute
    if order.status in ["IN_QC", "READY_TO_SHIP", "PARTIALLY_DISPATCHED"]:
        db.flush()
        recompute_order_status(db, order.id)

    db.commit()
    for r in created_rolls:
        db.refresh(r)
    return created_rolls


def inspect_roll(
    db: Session,
    roll_id: str,
    result: str,
    defect_type: Optional[str] = None,
    severity: Optional[str] = None,
    notes: Optional[str] = None,
    inspector_id: Optional[str] = None,
    inspector_name: Optional[str] = None,
) -> Roll:
    if result not in ["PASSED", "REWORK", "REJECTED"]:
        raise ValueError(f"Invalid inspection result: {result}")

    if result != "PASSED":
        if not defect_type:
            raise ValueError("Defect type is required when result is not PASSED")
        if not severity:
            raise ValueError("Severity is required when result is not PASSED")

    roll = db.execute(select(Roll).where(Roll.id == roll_id)).scalar_one_or_none()
    if not roll:
        raise ValueError(f"Roll {roll_id} not found")

    if roll.dispatchLine or roll.stockStatus == "DISPATCHED":
        raise ValueError(f"Dispatched rolls cannot be re-inspected (Roll {roll.rollNo})")

    if roll.qcStatus == "REJECTED":
        raise ValueError(f"Roll {roll.rollNo} is already Rejected (terminal state)")

    qc_count = db.scalar(select(func.count(QCRecord.id))) or 0
    qc_no = f"QC-{str(qc_count + 1).zfill(4)}"

    qc_record = QCRecord(
        qcNo=qc_no,
        rollId=roll.id,
        inspectorId=inspector_id,
        inspectorName=inspector_name,
        result=result,
        defectType=None if result == "PASSED" else defect_type,
        severity=None if result == "PASSED" else severity,
        notes=notes,
        createdAt=datetime.now(timezone.utc),
    )
    db.add(qc_record)
    roll.qcStatus = result

    db.flush()
    recompute_order_status(db, roll.orderId)

    db.commit()
    db.refresh(roll)
    return roll
