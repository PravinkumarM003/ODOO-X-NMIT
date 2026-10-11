from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func

from app.models.entities import Order, Roll, Machine, ProductionLog, QCRecord, Dispatch, WorkOrder
from app.services.notification_service import get_computed_notifications
from app.services.finance_service import calculate_order_risk


def get_overview_data(
    db: Session,
    user_role: str = "ADMINISTRATOR",
    buyer_id: Optional[str] = None,
    sort_by: str = "severity",
    sort_order: str = "desc"
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # 1. Fetch Active Orders with relations eager loaded
    stmt = select(Order).where(Order.status.notin_(["COMPLETED", "CANCELLED"])).options(
        selectinload(Order.buyer),
        selectinload(Order.workOrders),
        selectinload(Order.rolls),
    )
    if user_role == "BUYER" and buyer_id:
        stmt = stmt.where(Order.buyerId == buyer_id)
    orders = db.execute(stmt).scalars().all()

    all_notifications = get_computed_notifications(db, user_role=user_role, buyer_id=buyer_id, pre_fetched_orders=orders)
    total_attention_items = len(all_notifications)
    
    # Sort attention items dynamically with unique tie-breaker
    sev_map = {"CRITICAL": 3, "WARNING": 2, "INFO": 1}
    is_desc = sort_order.lower() == "desc"
    
    def sort_key(item: Dict[str, Any]):
        sev_val = sev_map.get(item.get("severity", "INFO"), 0)
        dt_val = item.get("date_ts", 0)
        item_id = item.get("id", "")
        if sort_by == "title":
            return (item.get("title", "").lower(), -sev_val if is_desc else sev_val, item_id)
        elif sort_by == "type":
            return (item.get("type", "").lower(), -sev_val if is_desc else sev_val, item_id)
        elif sort_by == "date":
            return (dt_val if not is_desc else -dt_val, -sev_val if is_desc else sev_val, item_id)
        else:
            return (sev_val if not is_desc else -sev_val, -dt_val if is_desc else dt_val, item_id)

    all_notifications.sort(key=sort_key)
    top_20_notifications = all_notifications[:20]
    active_orders_count = 0
    at_risk_orders_count = 0
    ready_to_ship_count = 0

    for ord in orders:
        if ord.status not in ["COMPLETED", "CANCELLED"]:
            active_orders_count += 1
        if ord.status == "READY_TO_SHIP":
            ready_to_ship_count += 1
        risk = calculate_order_risk(ord, now)
        if risk["risk"] != "ON_TRACK":
            at_risk_orders_count += 1

    # 2. Pending inspections
    pending_inspections_count = db.scalar(
        select(func.count(Roll.id)).where(
            Roll.qcStatus.in_(["PENDING", "REWORK"]),
            Roll.stockStatus == "IN_STORE"
        )
    ) or 0

    # 3. Finished metres on shelf
    shelf_metres_sum = db.scalar(
        select(func.sum(Roll.lengthMetres)).where(
            Roll.qcStatus == "PASSED",
            Roll.stockStatus == "IN_STORE"
        )
    )
    finished_metres_on_shelf = round(shelf_metres_sum or 0.0, 2)

    # 4. Machine status counts
    machines = db.execute(select(Machine)).scalars().all()
    machines_running = sum(1 for m in machines if m.status == "RUNNING")
    machines_idle = sum(1 for m in machines if m.status == "IDLE")
    machines_down = sum(1 for m in machines if m.status == "BREAKDOWN")

    # 5. Stage pipeline counts
    pipeline = {
        "spinning": sum(1 for o in orders if o.status == "IN_PRODUCTION" and o.currentStage == "SPINNING"),
        "weaving": sum(1 for o in orders if o.status == "IN_PRODUCTION" and o.currentStage == "WEAVING"),
        "dyeing": sum(1 for o in orders if o.status == "IN_PRODUCTION" and o.currentStage == "DYEING"),
        "qc": sum(1 for o in orders if o.status == "IN_QC"),
        "ready": ready_to_ship_count,
    }

    # 6. Today's output by machine
    # 6. Today's output by machine
    today_logs = db.execute(
        select(ProductionLog)
        .options(selectinload(ProductionLog.workOrder))
        .where(ProductionLog.loggedAt >= today_start)
    ).scalars().all()

    today_map: Dict[str, float] = {}
    for log in today_logs:
        if log.workOrder and log.workOrder.machineId:
            mid = log.workOrder.machineId
            today_map[mid] = today_map.get(mid, 0.0) + log.qtyMetres

    today_outputs = [
        {
            "code": m.code,
            "type": m.type,
            "outputMetres": round(today_map.get(m.id, 0.0), 1),
        }
        for m in machines
    ]

    # 7. Recent floor events
    from sqlalchemy.orm import joinedload
    recent_logs = db.execute(
        select(ProductionLog)
        .options(
            selectinload(ProductionLog.workOrder).selectinload(WorkOrder.order),
            selectinload(ProductionLog.employee)
        )
        .order_by(ProductionLog.loggedAt.desc()).limit(5)
    ).scalars().all()

    recent_qcs = db.execute(
        select(QCRecord)
        .options(selectinload(QCRecord.roll))
        .order_by(QCRecord.createdAt.desc()).limit(5)
    ).scalars().all()

    recent_dispatches = db.execute(
        select(Dispatch)
        .options(selectinload(Dispatch.lines), selectinload(Dispatch.order))
        .order_by(Dispatch.dispatchedAt.desc()).limit(5)
    ).scalars().all()

    events = []
    for l in recent_logs:
        events.append({
            "id": f"p-{l.id}",
            "type": "PRODUCTION",
            "title": f"{l.qtyMetres} m output logged on {l.workOrder.stage if l.workOrder else ''}",
            "description": f"Order {l.workOrder.order.orderNo if l.workOrder and l.workOrder.order else ''} by {l.employee.name if l.employee else ''} ({l.hours} hrs, {l.shift} shift)",
            "date": l.loggedAt,
            "link": "/production",
        })

    for q in recent_qcs:
        events.append({
            "id": f"q-{q.id}",
            "type": "QC",
            "title": f"Roll {q.roll.rollNo if q.roll else ''} marked {q.result}",
            "description": f"Defect: {q.defectType} ({q.severity}) · Notes: {q.notes or 'None'}" if q.defectType else "Passed inspection standards",
            "date": q.createdAt,
            "link": f"/rolls/{q.roll.id if q.roll else ''}",
        })

    for d in recent_dispatches:
        events.append({
            "id": f"d-{d.id}",
            "type": "DISPATCH",
            "title": f"Consignment {d.dispatchNo} shipped",
            "description": f"{len(d.lines)} rolls on truck {d.truckNo} for Order {d.order.orderNo if d.order else ''}",
            "date": d.dispatchedAt,
            "link": "/dispatch",
        })

    # Sort events desc
    events.sort(key=lambda x: x["date"].timestamp() if x["date"] else 0, reverse=True)
    recent_events = [
        {
            "id": e["id"],
            "type": e["type"],
            "title": e["title"],
            "description": e["description"],
            "timestamp": e["date"].strftime("%H:%M") if e["date"] else "",
            "link": e["link"],
        }
        for e in events[:10]
    ]

    return {
        "attentionItems": top_20_notifications,
        "totalAttentionItems": total_attention_items,
        "summaryTiles": {
            "activeOrdersCount": active_orders_count,
            "atRiskOrdersCount": at_risk_orders_count,
            "pendingInspectionsCount": pending_inspections_count,
            "readyToShipCount": ready_to_ship_count,
            "finishedMetresOnShelf": finished_metres_on_shelf,
            "machinesRunning": machines_running,
            "machinesIdle": machines_idle,
            "machinesDown": machines_down,
        },
        "pipeline": pipeline,
        "todayOutputs": today_outputs,
        "recentEvents": recent_events,
    }
