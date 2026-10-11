from datetime import datetime, timezone
import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func, case

from app.models.entities import YarnItem, Machine, MachineDowntime, Order, Roll, StockMovement
from app.services.finance_service import calculate_order_risk


def _batch_yarn_health(db: Session) -> List[Dict[str, Any]]:
    """Compute health status for all yarn items in a single aggregated query."""
    rows = db.query(
        YarnItem.id,
        YarnItem.code,
        YarnItem.yarnType,
        YarnItem.count,
        YarnItem.colour,
        YarnItem.reorderThresholdKg,
        func.coalesce(func.sum(
            case((StockMovement.type == "RECEIPT", StockMovement.qtyKg), else_=0)
        ), 0).label("total_receipt"),
        func.coalesce(func.sum(
            case((StockMovement.type == "CONSUME", StockMovement.qtyKg), else_=0)
        ), 0).label("total_consume"),
        func.coalesce(func.sum(
            case((StockMovement.type == "ADJUST", StockMovement.qtyKg), else_=0)
        ), 0).label("total_adjust"),
        func.coalesce(func.sum(
            case((StockMovement.type == "RESERVE", StockMovement.qtyKg), else_=0)
        ), 0).label("total_reserve"),
        func.coalesce(func.sum(
            case((StockMovement.type == "RELEASE", StockMovement.qtyKg), else_=0)
        ), 0).label("total_release"),
    ).outerjoin(
        StockMovement, StockMovement.yarnItemId == YarnItem.id
    ).group_by(YarnItem.id).all()

    results = []
    for r in rows:
        on_hand = round(float(r.total_receipt) - float(r.total_consume) + float(r.total_adjust), 2)
        reserved = round(float(r.total_reserve) - float(r.total_release), 2)
        available = round(on_hand - reserved, 2)

        if available <= 0:
            health = "OUT"
        elif available < r.reorderThresholdKg:
            health = "LOW"
        else:
            health = "OK"

        results.append({
            "id": r.id,
            "code": r.code,
            "yarnType": r.yarnType,
            "count": r.count,
            "colour": r.colour,
            "health": health,
            "available": max(0.0, available),
            "threshold": r.reorderThresholdKg,
        })
    return results


def get_computed_notifications(
    db: Session,
    user_role: str = "ADMINISTRATOR",
    buyer_id: Optional[str] = None,
    pre_fetched_orders=None
) -> List[Dict[str, Any]]:
    items = []
    now = datetime.now(timezone.utc)
    now_ts = now.timestamp()
    now_iso = now.isoformat()

    # 1. Yarn Low & Out items — single aggregated query instead of per-item
    yarn_health = _batch_yarn_health(db)
    for yarn in yarn_health:
        if yarn["health"] == "OUT":
            items.append({
                "id": f"yarn-out-{yarn['id']}",
                "type": "YARN_OUT",
                "severity": "CRITICAL",
                "title": f"Yarn Out of Stock: {yarn['code']}",
                "description": f"{yarn['yarnType']} ({yarn['count']}, {yarn['colour']}) has 0 kg available stock",
                "link": f"/yarn/{yarn['id']}",
                "date": now_iso,
                "date_ts": now_ts,
            })
        elif yarn["health"] == "LOW":
            items.append({
                "id": f"yarn-low-{yarn['id']}",
                "type": "YARN_LOW",
                "severity": "WARNING",
                "title": f"Low Yarn Stock: {yarn['code']}",
                "description": f"Available {yarn['available']} kg is below reorder threshold ({yarn['threshold']} kg)",
                "link": f"/yarn/{yarn['id']}",
                "date": now_iso,
                "date_ts": now_ts,
            })

    # 2. Machine Breakdowns — eager-load downtimes
    broken_machines = db.execute(
        select(Machine)
        .where(Machine.status == "BREAKDOWN")
        .options(selectinload(Machine.downtimes))
    ).scalars().all()
    for mach in broken_machines:
        open_dt = next(
            (dt for dt in sorted(mach.downtimes, key=lambda d: d.startedAt, reverse=True) if dt.endedAt is None),
            None,
        )
        reason = open_dt.reason if open_dt else "Machine fault reported"
        dt_obj = open_dt.startedAt if (open_dt and open_dt.startedAt) else now
        items.append({
            "id": f"breakdown-{mach.id}",
            "type": "BREAKDOWN",
            "severity": "CRITICAL",
            "title": f"Machine Breakdown: {mach.code}",
            "description": f"{mach.type} machine down. Reason: {reason}",
            "link": "/production",
            "date": dt_obj.isoformat() if isinstance(dt_obj, datetime) else now_iso,
            "date_ts": dt_obj.timestamp() if isinstance(dt_obj, datetime) else now_ts,
        })

    # 3. Orders: Needs Review, Overdue, At Risk, Ready to Ship, No Shippable rolls
    # Eager-load buyer, workOrders, rolls to avoid N+1
    orders = pre_fetched_orders
    if orders is None:
        stmt = (
            select(Order)
            .where(Order.status.notin_(["COMPLETED", "CANCELLED"]))
            .options(
                selectinload(Order.buyer),
                selectinload(Order.workOrders),
                selectinload(Order.rolls),
            )
        )
        if user_role == "BUYER" and buyer_id:
            stmt = stmt.where(Order.buyerId == buyer_id)
        orders = db.execute(stmt).scalars().all()

    for ord in orders:
        if user_role == "BUYER" and buyer_id and ord.buyerId != buyer_id:
            continue

        dt_obj = ord.createdAt if ord.createdAt else now
        dt_iso = dt_obj.isoformat() if isinstance(dt_obj, datetime) else now_iso
        dt_ts = dt_obj.timestamp() if isinstance(dt_obj, datetime) else now_ts

        if ord.status == "NEW":
            items.append({
                "id": f"review-{ord.id}",
                "type": "NEEDS_REVIEW",
                "severity": "WARNING",
                "title": f"Order Awaiting Review: {ord.orderNo}",
                "description": f"Submitted by {ord.buyer.name if ord.buyer else 'Buyer'} for {ord.qtyMetres} m. Requires Manager review",
                "link": f"/orders/{ord.id}",
                "date": dt_iso,
                "date_ts": dt_ts,
            })

        if ord.rolls and len(ord.rolls) > 0 and all(r.qcStatus == "REJECTED" for r in ord.rolls):
            items.append({
                "id": f"no-ship-{ord.id}",
                "type": "NO_SHIPPABLE_ROLLS",
                "severity": "CRITICAL",
                "title": f"All Rolls Rejected: {ord.orderNo}",
                "description": f"All {len(ord.rolls)} rolls failed QC. Zero shippable meters available",
                "link": f"/orders/{ord.id}",
                "date": dt_iso,
                "date_ts": dt_ts,
            })

        if ord.status == "READY_TO_SHIP":
            items.append({
                "id": f"ready-{ord.id}",
                "type": "READY_DISPATCH",
                "severity": "INFO",
                "title": f"Ready for Dispatch: {ord.orderNo}",
                "description": f"All QC inspections complete for {ord.buyer.name if ord.buyer else 'Buyer'}. Ready to schedule truck",
                "link": "/dispatch",
                "date": dt_iso,
                "date_ts": dt_ts,
            })

        risk_result = calculate_order_risk(ord, now)
        if risk_result["risk"] == "OVERDUE":
            items.append({
                "id": f"overdue-{ord.id}",
                "type": "OVERDUE",
                "severity": "CRITICAL",
                "title": f"Overdue Order: {ord.orderNo}",
                "description": f"{ord.buyer.name if ord.buyer else 'Buyer'} ({ord.qtyMetres} m): {risk_result['reason']}",
                "link": f"/orders/{ord.id}",
                "date": dt_iso,
                "date_ts": dt_ts,
            })
        elif risk_result["risk"] == "AT_RISK":
            items.append({
                "id": f"at-risk-{ord.id}",
                "type": "AT_RISK",
                "severity": "WARNING",
                "title": f"At Risk Order: {ord.orderNo}",
                "description": f"{ord.buyer.name if ord.buyer else 'Buyer'}: {risk_result['reason']}",
                "link": f"/orders/{ord.id}",
                "date": dt_iso,
                "date_ts": dt_ts,
            })

    # 4. Pending QC Rolls (Staff only)
    if user_role != "BUYER":
        pending_qc_count = db.scalar(
            select(func.count(Roll.id)).where(
                Roll.qcStatus.in_(["PENDING", "REWORK"]),
                Roll.stockStatus == "IN_STORE"
            )
        ) or 0
        if pending_qc_count > 0:
            items.append({
                "id": "pending-qc-queue",
                "type": "PENDING_QC",
                "severity": "INFO",
                "title": f"{pending_qc_count} Rolls Awaiting QC Inspection",
                "description": "Rolls in store awaiting examination or rework clearance",
                "link": "/rolls",
                "date": now_iso,
                "date_ts": now_ts,
            })

    # Filter by user role permissions
    filtered_items = []
    for item in items:
        # Mechanics only see breakdowns
        if user_role == "MECHANIC":
            if item["type"] == "BREAKDOWN":
                filtered_items.append(item)
            continue

        # Production Supervisors don't see breakdowns (goes to mechanic directly)
        if user_role == "PRODUCTION_SUPERVISOR" and item["type"] == "BREAKDOWN":
            continue

        filtered_items.append(item)

    return filtered_items


def get_paginated_notifications(
    db: Session,
    user_role: str = "ADMINISTRATOR",
    buyer_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    severity: Optional[str] = None,
    type_filter: Optional[str] = None,
    sort_by: str = "severity",
    sort_order: str = "desc",
) -> Dict[str, Any]:
    all_items = get_computed_notifications(db=db, user_role=user_role, buyer_id=buyer_id)

    # 1. Apply Search
    filtered = all_items
    if search and search.strip():
        term = search.strip().lower()
        filtered = [
            i for i in filtered
            if term in i["title"].lower() or term in i["description"].lower() or term in i["type"].lower()
        ]

    # 2. Apply Severity Filter
    if severity and severity.strip().upper() != "ALL":
        sev_target = severity.strip().upper()
        filtered = [i for i in filtered if i["severity"] == sev_target]

    # 3. Apply Type Filter
    if type_filter and type_filter.strip().upper() != "ALL":
        type_target = type_filter.strip().upper()
        filtered = [i for i in filtered if i["type"] == type_target]

    total = len(filtered)
    sev_map = {"CRITICAL": 3, "WARNING": 2, "INFO": 1}
    is_desc = sort_order.lower() == "desc"

    # 4. Sort with Unique Tie-breaker
    def sort_key(item: Dict[str, Any]):
        sev_val = sev_map.get(item["severity"], 0)
        dt_val = item.get("date_ts", 0)
        item_id = item["id"]

        if sort_by == "title":
            return (item["title"].lower(), -sev_val if is_desc else sev_val, item_id)
        elif sort_by == "type":
            return (item["type"].lower(), -sev_val if is_desc else sev_val, item_id)
        elif sort_by == "date":
            return (dt_val if not is_desc else -dt_val, -sev_val if is_desc else sev_val, item_id)
        else:
            # Default: Severity
            return (sev_val if not is_desc else -sev_val, -dt_val if is_desc else dt_val, item_id)

    filtered.sort(key=sort_key)

    # 5. Paginate
    start = (page - 1) * page_size
    end = start + page_size
    items_page = filtered[start:end]
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return {
        "items": items_page,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": total_pages,
    }
