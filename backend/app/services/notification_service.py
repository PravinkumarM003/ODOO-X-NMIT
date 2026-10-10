from datetime import datetime, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.entities import YarnItem, Machine, MachineDowntime, Order, Roll
from app.services.yarn_service import get_yarn_stock_summary
from app.services.finance_service import calculate_order_risk


def get_computed_notifications(db: Session) -> List[Dict[str, Any]]:
    items = []
    now = datetime.now(timezone.utc)

    # 1. Yarn Low & Out items
    yarn_items = db.execute(select(YarnItem)).scalars().all()
    for yarn in yarn_items:
        stock = get_yarn_stock_summary(db, yarn.id)
        if stock.health == "OUT":
            items.append({
                "id": f"yarn-out-{yarn.id}",
                "type": "YARN_OUT",
                "severity": "CRITICAL",
                "title": f"Yarn Out of Stock: {yarn.code}",
                "description": f"{yarn.yarnType} ({yarn.count}, {yarn.colour}) has 0 kg available stock",
                "link": f"/yarn/{yarn.id}",
            })
        elif stock.health == "LOW":
            items.append({
                "id": f"yarn-low-{yarn.id}",
                "type": "YARN_LOW",
                "severity": "WARNING",
                "title": f"Low Yarn Stock: {yarn.code}",
                "description": f"Available {stock.available_kg} kg is below reorder threshold ({stock.threshold_kg} kg)",
                "link": f"/yarn/{yarn.id}",
            })

    # 2. Machine Breakdowns
    broken_machines = db.execute(select(Machine).where(Machine.status == "BREAKDOWN")).scalars().all()
    for mach in broken_machines:
        open_dt = db.execute(
            select(MachineDowntime)
            .where(MachineDowntime.machineId == mach.id, MachineDowntime.endedAt == None)
            .order_by(MachineDowntime.startedAt.desc())
        ).scalars().first()
        reason = open_dt.reason if open_dt else "Machine fault reported"
        items.append({
            "id": f"breakdown-{mach.id}",
            "type": "BREAKDOWN",
            "severity": "CRITICAL",
            "title": f"Machine Breakdown: {mach.code}",
            "description": f"{mach.type} machine down. Reason: {reason}",
            "link": "/production",
        })

    # 3. Orders: Needs Review, Overdue, At Risk, Ready to Ship, No Shippable rolls
    orders = db.execute(select(Order)).scalars().all()
    for ord in orders:
        if ord.status == "NEW":
            items.append({
                "id": f"review-{ord.id}",
                "type": "NEEDS_REVIEW",
                "severity": "WARNING",
                "title": f"Order Awaiting Review: {ord.orderNo}",
                "description": f"Submitted by {ord.buyer.name if ord.buyer else 'Buyer'} for {ord.qtyMetres} m. Requires Office review",
                "link": f"/orders/{ord.id}",
            })

        if ord.rolls and len(ord.rolls) > 0 and all(r.qcStatus == "REJECTED" for r in ord.rolls):
            items.append({
                "id": f"no-ship-{ord.id}",
                "type": "NO_SHIPPABLE_ROLLS",
                "severity": "CRITICAL",
                "title": f"All Rolls Rejected: {ord.orderNo}",
                "description": f"All {len(ord.rolls)} rolls failed QC. Zero shippable meters available",
                "link": f"/orders/{ord.id}",
            })

        if ord.status == "READY_TO_SHIP":
            items.append({
                "id": f"ready-{ord.id}",
                "type": "READY_DISPATCH",
                "severity": "INFO",
                "title": f"Ready for Dispatch: {ord.orderNo}",
                "description": f"All QC inspections complete for {ord.buyer.name if ord.buyer else 'Buyer'}. Ready to schedule truck",
                "link": "/dispatch",
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
            })
        elif risk_result["risk"] == "AT_RISK":
            items.append({
                "id": f"at-risk-{ord.id}",
                "type": "AT_RISK",
                "severity": "WARNING",
                "title": f"At Risk Order: {ord.orderNo}",
                "description": f"{ord.buyer.name if ord.buyer else 'Buyer'}: {risk_result['reason']}",
                "link": f"/orders/{ord.id}",
            })

    # 4. Pending QC Rolls
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
        })

    return items
