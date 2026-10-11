from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
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
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("createdAt"),
    sort_order: Optional[str] = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
    query = (
        select(Order)
        .outerjoin(Buyer, Order.buyerId == Buyer.id)
        .outerjoin(FabricType, Order.fabricTypeId == FabricType.id)
        .options(
            selectinload(Order.buyer),
            selectinload(Order.fabricType),
            selectinload(Order.workOrders).selectinload(WorkOrder.machine),
            selectinload(Order.rolls),
        )
    )

    if status_filter and status_filter != "ALL":
        if status_filter == "NEEDS_REVIEW":
            query = query.where(Order.status == "NEW")
        elif status_filter == "IN_PRODUCTION":
            query = query.where(Order.status.in_(["IN_PRODUCTION", "CONFIRMED"]))
        elif status_filter == "COMPLETED":
            query = query.where(Order.status.in_(["COMPLETED", "PARTIALLY_DISPATCHED"]))
        else:
            query = query.where(Order.status == status_filter)

    if search:
        search_term = f"%{search.lower()}%"
        from sqlalchemy import func, or_
        query = query.where(
            or_(
                func.lower(Order.orderNo).like(search_term),
                func.lower(Buyer.name).like(search_term),
                func.lower(FabricType.name).like(search_term),
                func.lower(Order.colour).like(search_term)
            )
        )

    # Safe column sorting mapping
    sort_col_map = {
        "orderNo": Order.orderNo,
        "buyer": Buyer.name,
        "fabricType": FabricType.name,
        "qtyMetres": Order.qtyMetres,
        "deadline": Order.deadline,
        "status": Order.status,
        "createdAt": Order.createdAt,
    }
    target_col = sort_col_map.get(sort_by, Order.createdAt)
    direction = sort_order.lower() if sort_order else "desc"
    order_clause = target_col.asc() if direction == "asc" else target_col.desc()

    query = query.order_by(order_clause, Order.id.desc())

    from sqlalchemy import func
    total = db.scalar(select(func.count()).select_from(query.with_only_columns(Order.id).subquery()))

    orders = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    now = datetime.now(timezone.utc)

    # Pre-fetch dispatch lines for all orders in one query to avoid N+1
    all_order_ids = [o.id for o in orders]
    dispatch_lines_by_order = {}
    if all_order_ids:
        from app.models.entities import DispatchLine
        dlines = db.execute(
            select(DispatchLine)
            .join(Roll, DispatchLine.rollId == Roll.id)
            .options(selectinload(DispatchLine.roll))
            .where(Roll.orderId.in_(all_order_ids))
        ).scalars().all()
        for dl in dlines:
            oid = dl.roll.orderId if dl.roll else None
            if oid:
                dispatch_lines_by_order.setdefault(oid, []).append(dl)

    result = []
    for ord in orders:
        # Inline progress calculation using already-loaded relationships
        work_orders = ord.workOrders or []
        rolls = ord.rolls or []

        # Production progress
        if work_orders:
            total_planned = sum(wo.plannedQtyMetres for wo in work_orders)
            total_produced = sum(min(wo.producedQtyMetres, wo.plannedQtyMetres) for wo in work_orders)
            production_pct = min(100, round((total_produced / total_planned * 100))) if total_planned > 0 else 0
        else:
            production_pct = 0

        # QC readiness
        reg_count = len(rolls)
        passed_count = sum(1 for r in rolls if r.qcStatus == "PASSED")
        rework_count = sum(1 for r in rolls if r.qcStatus == "REWORK")
        rejected_count = sum(1 for r in rolls if r.qcStatus == "REJECTED")
        pending_count = sum(1 for r in rolls if r.qcStatus == "PENDING")
        reg_metres = sum(r.lengthMetres for r in rolls)
        passed_metres = sum(r.lengthMetres for r in rolls if r.qcStatus == "PASSED")
        rejected_metres = sum(r.lengthMetres for r in rolls if r.qcStatus == "REJECTED")

        if reg_count == 0:
            qc_status_text = "Not started"
            qc_resolved_pct = 0.0
        else:
            resolved_metres = passed_metres + rejected_metres
            qc_resolved_pct = round((resolved_metres / reg_metres * 100), 1) if reg_metres > 0 else 0.0
            qc_status_text = f"{qc_resolved_pct}% resolved ({passed_count} Passed, {rework_count} Rework, {rejected_count} Rejected, {pending_count} Pending)"

        # Dispatch completion
        order_dls = dispatch_lines_by_order.get(ord.id, [])
        dispatched_roll_ids = {dl.rollId for dl in order_dls}
        dispatched_rolls = [r for r in rolls if r.stockStatus == "DISPATCHED" or r.id in dispatched_roll_ids]
        dispatched_metres = sum(r.lengthMetres for r in dispatched_rolls)
        dispatch_pct = round((dispatched_metres / ord.qtyMetres * 100), 1) if ord.qtyMetres > 0 else 0.0

        progress = {
            "productionProgressPercent": production_pct,
            "qcReadiness": {
                "statusText": qc_status_text,
                "qcResolvedPercent": qc_resolved_pct,
                "passedCount": passed_count,
                "reworkCount": rework_count,
                "rejectedCount": rejected_count,
                "pendingCount": pending_count,
            },
            "dispatchCompletion": {
                "summaryText": f"{dispatched_metres:.1f} m dispatched",
                "dispatchPercent": dispatch_pct,
                "shortfallNote": None,
            },
        }

        # Risk calculation (inline, uses already-loaded relationships)
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
            "progress": progress,
            "risk": risk,
            "riskReason": risk["reason"],
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "pageSize": page_size
    }


@router.get("/check-yarn")
def check_yarn_endpoint(
    fabricTypeId: str,
    qtyMetres: float,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    try:
        req = calculate_yarn_requirement(db, fabricTypeId, qtyMetres)
        return req
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/form-data")
def get_order_form_data(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
    from sqlalchemy.orm import selectinload
    ord = db.execute(
        select(Order)
        .where(Order.id == id)
        .options(
            selectinload(Order.buyer),
            selectinload(Order.fabricType),
            selectinload(Order.workOrders),
            selectinload(Order.rolls)
        )
    ).scalar_one_or_none()
    if not ord:
        raise HTTPException(status_code=404, detail=f"Order {id} not found")

    progress = get_order_progress(db=db, order=ord)
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
        "progress": dict(progress),
        "risk": risk,
        "riskReason": risk["reason"],
        "cost": cost,
    }


@router.post("")
def create_order_endpoint(
    req: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    if not req.buyerId:
        raise HTTPException(status_code=400, detail="buyerId is required")

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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
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
