from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Machine, WorkOrder, Employee, Order, MachineDowntime, ProductionLog
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
    search: str | None = None,
    sort_by: str | None = "stage",
    sort_order: str | None = "asc",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
    machines = db.execute(
        select(Machine)
        .options(
            selectinload(Machine.workOrders).selectinload(WorkOrder.order).selectinload(Order.buyer),
            selectinload(Machine.downtimes),
        )
        .order_by(Machine.code.asc())
    ).scalars().all()
    employees = db.execute(select(Employee).where(Employee.active == True).order_by(Employee.name.asc())).scalars().all()

    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    today_logs = db.execute(
        select(ProductionLog)
        .options(selectinload(ProductionLog.workOrder))
        .where(ProductionLog.loggedAt >= today_start)
    ).scalars().all()

    today_map = {}
    for log in today_logs:
        if log.workOrder and log.workOrder.machineId:
            mid = log.workOrder.machineId
            today_map[mid] = today_map.get(mid, 0.0) + log.qtyMetres

    # Work orders awaiting assignment (NOT_STARTED or BLOCKED)
    query = select(WorkOrder).outerjoin(Order, WorkOrder.orderId == Order.id).where(WorkOrder.status.in_(["NOT_STARTED", "BLOCKED"]))
    
    if search:
        search_term = f"%{search.lower()}%"
        from sqlalchemy import func, or_
        query = query.where(
            or_(
                func.lower(Order.orderNo).like(search_term),
                func.lower(WorkOrder.stage).like(search_term)
            )
        )
        
    sort_col_map = {
        "stage": WorkOrder.stage,
        "plannedQtyMetres": WorkOrder.plannedQtyMetres,
        "producedQtyMetres": WorkOrder.producedQtyMetres,
        "status": WorkOrder.status,
        "orderNo": Order.orderNo,
        "createdAt": WorkOrder.id,
    }
    target_col = sort_col_map.get(sort_by, WorkOrder.stage)
    direction = sort_order.lower() if sort_order else "asc"
    order_clause = target_col.asc() if direction == "asc" else target_col.desc()

    query = query.order_by(order_clause, WorkOrder.id.desc())
    
    from sqlalchemy import func
    total = db.scalar(select(func.count()).select_from(query.with_only_columns(WorkOrder.id).subquery()))
    queued_work_orders = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    machine_cards = []
    for m in machines:
        active_wo = next((wo for wo in m.workOrders if wo.status == "IN_PROGRESS"), None)

        downtime = None
        if m.status == "BREAKDOWN":
            open_dts = [dt for dt in m.downtimes if dt.endedAt is None]
            dt = sorted(open_dts, key=lambda d: d.startedAt, reverse=True)[0] if open_dts else None
            if dt:
                downtime = {"id": dt.id, "reason": dt.reason, "startedAt": dt.startedAt.isoformat()}

        wo_data = {
            "id": active_wo.id,
            "orderId": active_wo.orderId,
            "orderNo": active_wo.order.orderNo if active_wo.order else "",
            "buyerName": active_wo.order.buyer.name if active_wo.order and active_wo.order.buyer else "",
            "stage": active_wo.stage,
            "plannedQtyMetres": active_wo.plannedQtyMetres,
            "producedQtyMetres": active_wo.producedQtyMetres,
            "status": active_wo.status,
            "startedAt": active_wo.startedAt.isoformat() if active_wo.startedAt else None,
        } if active_wo else None

        machine_cards.append({
            "id": m.id,
            "code": m.code,
            "type": m.type,
            "status": m.status,
            "hourlyRate": m.hourlyRate,
            "todayOutputMetres": round(today_map.get(m.id, 0.0), 1),
            "downtime": downtime,
            "activeDowntime": downtime,
            "activeWorkOrder": wo_data,
            "currentWorkOrder": wo_data,
        })

    queued_list = []
    for w in queued_work_orders:
        order = w.order
        other_wos = order.workOrders if order else []
        can_start = False
        block_reason = None

        if order and order.status in ["CANCELLED", "AWAITING_YARN"]:
            can_start = False
            block_reason = "Order awaiting raw material or cancelled"
        elif w.stage == "SPINNING":
            can_start = True
            block_reason = None
        elif w.stage == "WEAVING":
            spinning_wo = next((o for o in other_wos if o.stage == "SPINNING"), None)
            if spinning_wo and spinning_wo.status == "COMPLETED":
                can_start = True
            else:
                can_start = False
                block_reason = "Spinning stage must be completed before weaving"
        elif w.stage == "DYEING":
            weaving_wo = next((o for o in other_wos if o.stage == "WEAVING"), None)
            if weaving_wo and weaving_wo.status == "COMPLETED":
                can_start = True
            else:
                can_start = False
                block_reason = "Weaving stage must be completed before dyeing"

        queued_list.append({
            "id": w.id,
            "orderId": w.orderId,
            "orderNo": w.order.orderNo if w.order else "",
            "buyerName": w.order.buyer.name if w.order and w.order.buyer else "",
            "stage": w.stage,
            "plannedQtyMetres": w.plannedQtyMetres,
            "producedQtyMetres": w.producedQtyMetres,
            "status": w.status,
            "canStart": can_start,
            "blockReason": block_reason,
        })

    return {
        "machines": machine_cards,
        "queuedWorkOrders": queued_list,
        "queuedTotal": total,
        "queuedPage": page,
        "queuedPageSize": page_size,
        "employees": [{"id": e.id, "name": e.name, "department": e.department} for e in employees],
    }


@router.post("/assign")
def assign_machine_endpoint(
    req: AssignMachineRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
