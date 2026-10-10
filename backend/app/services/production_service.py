from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.entities import WorkOrder, Machine, Order, ProductionLog, MachineDowntime, StockMovement
from app.services.yarn_service import get_yarn_stock_summary, get_lot_remainings
from app.services.order_status_service import recompute_order_status


def assign_machine_to_work_order(
    db: Session,
    work_order_id: str,
    machine_id: str,
    assigned_by: str,
) -> WorkOrder:
    work_order = db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    ).scalar_one_or_none()
    if not work_order:
        raise ValueError(f"Work order {work_order_id} not found")

    order = db.execute(
        select(Order).where(Order.id == work_order.orderId)
    ).scalar_one()

    # BR-08 Stage Order Validation
    other_wos = db.execute(
        select(WorkOrder).where(WorkOrder.orderId == order.id)
    ).scalars().all()

    if work_order.stage == "WEAVING":
        spinning_wo = next((w for w in other_wos if w.stage == "SPINNING"), None)
        if not spinning_wo or spinning_wo.status != "COMPLETED":
            raise ValueError("Spinning stage must be completed before weaving can start")
    elif work_order.stage == "DYEING":
        weaving_wo = next((w for w in other_wos if w.stage == "WEAVING"), None)
        if not weaving_wo or weaving_wo.status != "COMPLETED":
            raise ValueError("Weaving stage must be completed before dyeing can start")

    machine = db.execute(
        select(Machine).where(Machine.id == machine_id)
    ).scalar_one_or_none()
    if not machine:
        raise ValueError(f"Machine {machine_id} not found")

    if machine.type != work_order.stage:
        raise ValueError(f"Machine {machine.code} ({machine.type}) cannot be assigned to {work_order.stage} stage")

    if machine.status != "IDLE":
        raise ValueError(f"Machine {machine.code} is not IDLE (current status: {machine.status})")

    work_order.machineId = machine.id
    work_order.status = "IN_PROGRESS"
    if not work_order.startedAt:
        work_order.startedAt = datetime.now(timezone.utc)

    machine.status = "RUNNING"
    order.status = "IN_PRODUCTION"
    order.currentStage = work_order.stage

    db.commit()
    db.refresh(work_order)
    return work_order


def log_production_output(
    db: Session,
    work_order_id: str,
    employee_id: str,
    qty_metres: float,
    hours: float,
    shift: str,
) -> ProductionLog:
    if qty_metres <= 0:
        raise ValueError("Produced metres must be greater than 0")
    if hours <= 0:
        raise ValueError("Hours must be greater than 0")
    if shift not in ["MORNING", "EVENING", "NIGHT"]:
        raise ValueError(f"Invalid shift: {shift}")

    work_order = db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    ).scalar_one_or_none()
    if not work_order:
        raise ValueError(f"Work order {work_order_id} not found")

    max_allowed = round(work_order.plannedQtyMetres * 1.05, 2)
    new_produced = round((work_order.producedQtyMetres + qty_metres), 2)

    if new_produced > max_allowed:
        raise ValueError(
            f"Logging {qty_metres} m would result in {new_produced} m, exceeding 5% tolerance limit ({max_allowed} m)"
        )

    log = ProductionLog(
        workOrderId=work_order.id,
        employeeId=employee_id,
        qtyMetres=qty_metres,
        hours=hours,
        shift=shift,
        loggedAt=datetime.now(timezone.utc),
    )
    db.add(log)
    work_order.producedQtyMetres = new_produced

    db.commit()
    db.refresh(log)
    return log


def complete_spinning_stage(
    db: Session,
    work_order_id: str,
    completed_by: str,
    actual_kg_used: Optional[float] = None,
) -> WorkOrder:
    work_order = db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    ).scalar_one_or_none()
    if not work_order or work_order.stage != "SPINNING":
        raise ValueError("Invalid work order or not a SPINNING stage")

    order = db.execute(
        select(Order).where(Order.id == work_order.orderId)
    ).scalar_one()

    # Calculate outstanding reservation for order: sum(RESERVE) - sum(RELEASE)
    movements = db.execute(
        select(StockMovement).where(StockMovement.orderId == order.id)
    ).scalars().all()

    outstanding_reserve = 0.0
    for m in movements:
        if m.type == "RESERVE":
            outstanding_reserve += m.qtyKg
        elif m.type == "RELEASE":
            outstanding_reserve -= m.qtyKg
    outstanding_reserve = round(outstanding_reserve, 2)

    yarn_item_id = order.fabricType.yarnItemId
    kg_to_consume = actual_kg_used if actual_kg_used is not None else outstanding_reserve

    if kg_to_consume <= 0:
        raise ValueError("Consumed yarn must be greater than 0 kg")

    # 1. Post RELEASE movement for full outstanding reservation
    if outstanding_reserve > 0:
        release_mov = StockMovement(
            yarnItemId=yarn_item_id,
            orderId=order.id,
            type="RELEASE",
            qtyKg=outstanding_reserve,
            reason=f"Release reservation upon spinning completion for Order {order.orderNo}",
            createdBy=completed_by,
        )
        db.add(release_mov)

    # 2. Verify on-hand can fulfill consumption
    stock = get_yarn_stock_summary(db, yarn_item_id)
    if stock.on_hand_kg < kg_to_consume:
        raise ValueError(
            f"Insufficient on-hand yarn to consume {kg_to_consume} kg (On-hand: {stock.on_hand_kg} kg)"
        )

    # 3. Consume FIFO from lots oldest-first
    lots = get_lot_remainings(db, yarn_item_id)
    remaining_to_consume = kg_to_consume

    for lot in lots:
        if remaining_to_consume <= 0:
            break
        if lot.remaining_kg <= 0:
            continue

        take_kg = min(lot.remaining_kg, remaining_to_consume)
        consume_mov = StockMovement(
            yarnItemId=yarn_item_id,
            lotId=lot.lot_id,
            orderId=order.id,
            type="CONSUME",
            qtyKg=take_kg,
            reason=f"Spinning consumption from Lot {lot.lot_code} for Order {order.orderNo}",
            createdBy=completed_by,
        )
        db.add(consume_mov)
        remaining_to_consume = round(remaining_to_consume - take_kg, 2)

    if remaining_to_consume > 0:
        raise ValueError(f"Unable to consume full quantity: {remaining_to_consume} kg unallocated across lots")

    work_order.status = "COMPLETED"
    work_order.completedAt = datetime.now(timezone.utc)

    if work_order.machineId:
        machine = db.execute(select(Machine).where(Machine.id == work_order.machineId)).scalar_one_or_none()
        if machine:
            machine.status = "IDLE"

    order.currentStage = "WEAVING"

    db.commit()
    db.refresh(work_order)
    return work_order


def complete_stage(
    db: Session,
    work_order_id: str,
    completed_by: str,
) -> WorkOrder:
    work_order = db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    ).scalar_one_or_none()
    if not work_order:
        raise ValueError(f"Work order {work_order_id} not found")

    if work_order.stage == "SPINNING":
        raise ValueError("Use complete_spinning_stage for SPINNING stage")

    order = db.execute(select(Order).where(Order.id == work_order.orderId)).scalar_one()

    work_order.status = "COMPLETED"
    work_order.completedAt = datetime.now(timezone.utc)

    if work_order.machineId:
        machine = db.execute(select(Machine).where(Machine.id == work_order.machineId)).scalar_one_or_none()
        if machine:
            machine.status = "IDLE"

    if work_order.stage == "WEAVING":
        order.currentStage = "DYEING"
    elif work_order.stage == "DYEING":
        order.currentStage = None
        order.status = "IN_QC"
        recompute_order_status(db, order.id)

    db.commit()
    db.refresh(work_order)
    return work_order


def report_machine_breakdown(
    db: Session,
    machine_id: str,
    reason: str,
) -> Machine:
    machine = db.execute(select(Machine).where(Machine.id == machine_id)).scalar_one_or_none()
    if not machine:
        raise ValueError(f"Machine {machine_id} not found")

    machine.status = "BREAKDOWN"
    downtime = MachineDowntime(
        machineId=machine.id,
        reason=reason,
        startedAt=datetime.now(timezone.utc),
    )
    db.add(downtime)

    # Block any in-progress work orders on this machine
    active_wos = db.execute(
        select(WorkOrder).where(WorkOrder.machineId == machine.id, WorkOrder.status == "IN_PROGRESS")
    ).scalars().all()
    for wo in active_wos:
        wo.status = "BLOCKED"

    db.commit()
    db.refresh(machine)
    return machine


def resolve_machine_breakdown(
    db: Session,
    machine_id: str,
) -> Machine:
    machine = db.execute(select(Machine).where(Machine.id == machine_id)).scalar_one_or_none()
    if not machine:
        raise ValueError(f"Machine {machine_id} not found")

    open_downtime = db.execute(
        select(MachineDowntime)
        .where(MachineDowntime.machineId == machine_id, MachineDowntime.endedAt == None)
        .order_by(MachineDowntime.startedAt.desc())
    ).scalars().first()

    if open_downtime:
        open_downtime.endedAt = datetime.now(timezone.utc)

    machine.status = "IDLE"
    db.commit()
    db.refresh(machine)
    return machine


def reassign_blocked_work_order(
    db: Session,
    work_order_id: str,
    new_machine_id: str,
) -> WorkOrder:
    work_order = db.execute(select(WorkOrder).where(WorkOrder.id == work_order_id)).scalar_one_or_none()
    if not work_order:
        raise ValueError(f"Work order {work_order_id} not found")

    new_machine = db.execute(select(Machine).where(Machine.id == new_machine_id)).scalar_one_or_none()
    if not new_machine:
        raise ValueError(f"Machine {new_machine_id} not found")

    if new_machine.type != work_order.stage:
        raise ValueError(f"Machine {new_machine.code} ({new_machine.type}) cannot be assigned to {work_order.stage} stage")
    if new_machine.status != "IDLE":
        raise ValueError(f"Machine {new_machine.code} is not IDLE")

    work_order.machineId = new_machine.id
    work_order.status = "IN_PROGRESS"
    new_machine.status = "RUNNING"

    db.commit()
    db.refresh(work_order)
    return work_order
