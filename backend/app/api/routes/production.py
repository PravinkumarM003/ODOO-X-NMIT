from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Machine, WorkOrder, Employee, Order, MachineDowntime
from app.core.dependencies import require_role
from app.services.production_service import (
    assign_machine_to_work_order,
    log_production_output,
    complete_spinning_stage,
    complete_stage,
    report_machine_breakdown,
    resolve_machine_breakdown,
    reassign_blocked_work_order,
)
from app.schemas.production import (
    AssignMachineRequest,
    LogOutputRequest,
    CompleteStageRequest,
    ReportBreakdownRequest,
    ResolveBreakdownRequest,
    ReassignWorkOrderRequest,
)

router = APIRouter(prefix="/production", tags=["Production"])


@router.get("/board")
def get_production_board(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    machines = db.execute(select(Machine).order_by(Machine.code.asc())).scalars().all()
    employees = db.execute(select(Employee).where(Employee.active == True).order_by(Employee.name.asc())).scalars().all()

    # Work orders awaiting assignment (NOT_STARTED or BLOCKED)
    queued_work_orders = db.execute(
        select(WorkOrder)
        .where(WorkOrder.status.in_(["NOT_STARTED", "BLOCKED"]))
        .order_by(WorkOrder.stage.asc())
    ).scalars().all()

    machine_cards = []
    for m in machines:
        active_wo = db.execute(
            select(WorkOrder)
            .where(WorkOrder.machineId == m.id, WorkOrder.status == "IN_PROGRESS")
        ).scalar_one_or_none()

        downtime = None
        if m.status == "BREAKDOWN":
            dt = db.execute(
                select(MachineDowntime)
                .where(MachineDowntime.machineId == m.id, MachineDowntime.endedAt == None)
                .order_by(MachineDowntime.startedAt.desc())
            ).scalars().first()
            if dt:
                downtime = {"id": dt.id, "reason": dt.reason, "startedAt": dt.startedAt.isoformat()}

        machine_cards.append({
            "id": m.id,
            "code": m.code,
            "type": m.type,
            "status": m.status,
            "hourlyRate": m.hourlyRate,
            "downtime": downtime,
            "activeWorkOrder": {
                "id": active_wo.id,
                "orderId": active_wo.orderId,
                "orderNo": active_wo.order.orderNo if active_wo.order else "",
                "stage": active_wo.stage,
                "plannedQtyMetres": active_wo.plannedQtyMetres,
                "producedQtyMetres": active_wo.producedQtyMetres,
                "status": active_wo.status,
                "startedAt": active_wo.startedAt.isoformat() if active_wo.startedAt else None,
            } if active_wo else None,
        })

    return {
        "machines": machine_cards,
        "queuedWorkOrders": [
            {
                "id": w.id,
                "orderId": w.orderId,
                "orderNo": w.order.orderNo if w.order else "",
                "buyerName": w.order.buyer.name if w.order and w.order.buyer else "",
                "stage": w.stage,
                "plannedQtyMetres": w.plannedQtyMetres,
                "status": w.status,
            }
            for w in queued_work_orders
        ],
        "employees": [{"id": e.id, "name": e.name, "department": e.department} for e in employees],
    }


@router.post("/assign")
def assign_machine_endpoint(
    req: AssignMachineRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        wo = assign_machine_to_work_order(
            db=db,
            work_order_id=req.workOrderId,
            machine_id=req.machineId,
            assigned_by=current_user.name,
        )
        return {"success": True, "workOrderId": wo.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/log-output")
def log_output_endpoint(
    req: LogOutputRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        log = log_production_output(
            db=db,
            work_order_id=req.workOrderId,
            employee_id=req.employeeId,
            qty_metres=req.qtyMetres,
            hours=req.hours,
            shift=req.shift,
        )
        return {"success": True, "logId": log.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/complete-stage")
def complete_stage_endpoint(
    req: CompleteStageRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        if req.stage == "SPINNING":
            wo = complete_spinning_stage(
                db=db,
                work_order_id=req.workOrderId,
                completed_by=current_user.name,
                actual_kg_used=req.actualKgUsed,
            )
        else:
            wo = complete_stage(
                db=db,
                work_order_id=req.workOrderId,
                completed_by=current_user.name,
            )
        return {"success": True, "workOrderId": wo.id, "status": wo.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/breakdown")
def report_breakdown_endpoint(
    req: ReportBreakdownRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        mach = report_machine_breakdown(
            db=db,
            machine_id=req.machineId,
            reason=req.reason,
        )
        return {"success": True, "machineId": mach.id, "status": mach.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/resolve-breakdown")
def resolve_breakdown_endpoint(
    req: ResolveBreakdownRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        mach = resolve_machine_breakdown(
            db=db,
            machine_id=req.machineId,
        )
        return {"success": True, "machineId": mach.id, "status": mach.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reassign")
def reassign_work_order_endpoint(
    req: ReassignWorkOrderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        wo = reassign_blocked_work_order(
            db=db,
            work_order_id=req.workOrderId,
            new_machine_id=req.newMachineId,
        )
        return {"success": True, "workOrderId": wo.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
