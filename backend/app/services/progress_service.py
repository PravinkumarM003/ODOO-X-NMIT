from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Order, WorkOrder, Roll, DispatchLine


class OrderProgressResult(dict):
    """Dict subclass allowing attribute access for convenience."""
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(name)


def get_order_progress(*args, **kwargs) -> OrderProgressResult:
    """
    Accepts (db, order_id) or (order_id, db).
    """
    if len(args) == 2:
        if isinstance(args[0], Session):
            db = args[0]
            order_id = args[1]
        else:
            order_id = args[0]
            db = args[1]
    elif "db" in kwargs and "order_id" in kwargs:
        db = kwargs["db"]
        order_id = kwargs["order_id"]
    else:
        raise ValueError("Both db and order_id are required")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return OrderProgressResult({
            "orderId": order_id,
            "productionProgressPercent": 0,
            "production": 0,
            "qc": 0,
            "dispatch": 0,
            "totalPlannedMetres": 0,
            "totalProducedMetres": 0,
            "workOrdersBreakdown": [],
            "qcReadiness": {"statusText": "Not started", "qcResolvedPercent": 0},
            "dispatchCompletion": {"dispatchPercent": 0, "dispatchedMetres": 0, "orderQtyMetres": 0, "summaryText": "0 m dispatched"},
        })

    work_orders = db.query(WorkOrder).filter(WorkOrder.orderId == order_id).all()
    rolls = db.query(Roll).filter(Roll.orderId == order_id).all()

    # 1. Production progress % (BR-25.1)
    if work_orders:
        total_planned = sum(wo.plannedQtyMetres for wo in work_orders)
        total_produced = sum(min(wo.producedQtyMetres, wo.plannedQtyMetres) for wo in work_orders)
        production_pct = round((total_produced / total_planned * 100)) if total_planned > 0 else 0
        production_pct = min(100, production_pct)
    else:
        production_pct = 0
        total_planned = 0
        total_produced = 0

    work_orders_breakdown = [
        {
            "stage": wo.stage,
            "plannedMetres": wo.plannedQtyMetres,
            "producedMetres": wo.producedQtyMetres,
            "status": wo.status,
            "machineCode": wo.machine.code if wo.machine else None,
        }
        for wo in work_orders
    ]

    # 2. QC readiness (BR-25.2)
    reg_count = len(rolls)
    reg_metres = sum(r.lengthMetres for r in rolls)
    passed_rolls = [r for r in rolls if r.qcStatus == "PASSED"]
    rework_rolls = [r for r in rolls if r.qcStatus == "REWORK"]
    rejected_rolls = [r for r in rolls if r.qcStatus == "REJECTED"]
    pending_rolls = [r for r in rolls if r.qcStatus == "PENDING"]

    passed_metres = sum(r.lengthMetres for r in passed_rolls)
    rejected_metres = sum(r.lengthMetres for r in rejected_rolls)

    if reg_count == 0:
        qc_status_text = "Not started"
        qc_resolved_pct = 0.0
    else:
        resolved_metres = passed_metres + rejected_metres
        qc_resolved_pct = round((resolved_metres / reg_metres * 100), 1) if reg_metres > 0 else 0.0
        qc_status_text = f"{qc_resolved_pct}% resolved ({len(passed_rolls)} Passed, {len(rework_rolls)} Rework, {len(rejected_rolls)} Rejected, {len(pending_rolls)} Pending)"

    # 3. Dispatch completion (BR-25.3)
    dispatched_rolls = [
        r for r in rolls
        if r.stockStatus == "DISPATCHED" or db.query(DispatchLine).filter(DispatchLine.rollId == r.id).first()
    ]
    dispatched_metres = sum(r.lengthMetres for r in dispatched_rolls)
    dispatch_pct = round((dispatched_metres / order.qtyMetres * 100), 1) if order.qtyMetres > 0 else 0.0
    dispatch_summary = f"{dispatched_metres:.1f} m dispatched of {order.qtyMetres:.1f} m ordered"

    shortfall_note = None
    if order.status == "COMPLETED" and len(rejected_rolls) > 0:
        shortfall_note = f"Delivered {dispatched_metres:.1f} of {order.qtyMetres:.1f} m ({rejected_metres:.1f} m rejected)"

    return OrderProgressResult({
        "orderId": order.id,
        "productionProgressPercent": production_pct,
        "production": production_pct,
        "qc": qc_resolved_pct,
        "dispatch": dispatch_pct,
        "totalPlannedMetres": total_planned,
        "totalProducedMetres": total_produced,
        "workOrdersBreakdown": work_orders_breakdown,
        "qcReadiness": {
            "statusText": qc_status_text,
            "qcResolvedPercent": qc_resolved_pct,
            "registeredRollCount": reg_count,
            "registeredRollMetres": reg_metres,
            "passedCount": len(passed_rolls),
            "passedMetres": passed_metres,
            "reworkCount": len(rework_rolls),
            "reworkMetres": sum(r.lengthMetres for r in rework_rolls),
            "rejectedCount": len(rejected_rolls),
            "rejectedMetres": rejected_metres,
            "pendingCount": len(pending_rolls),
            "pendingMetres": sum(r.lengthMetres for r in pending_rolls),
        },
        "dispatchCompletion": {
            "dispatchPercent": dispatch_pct,
            "dispatchedMetres": dispatched_metres,
            "orderQtyMetres": order.qtyMetres,
            "summaryText": dispatch_summary,
            "shortfallNote": shortfall_note,
        },
    })
