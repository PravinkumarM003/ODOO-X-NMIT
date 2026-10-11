from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.entities import Order, Roll, DispatchLine

def derive_order_status_from_rolls(
    rolls: List[Dict[str, Any]],
    order_qty_metres: float
) -> Dict[str, Any]:
    total_registered = len(rolls)
    total_registered_metres = sum(r.get("lengthMetres", 0) for r in rolls)

    eligible_rolls = [
        r for r in rolls
        if r.get("qcStatus") == "PASSED" and r.get("stockStatus") == "IN_STORE" and not r.get("dispatchLine")
    ]
    unresolved_rolls = [
        r for r in rolls
        if r.get("qcStatus") in ("PENDING", "REWORK")
    ]
    dispatched_rolls = [
        r for r in rolls
        if r.get("dispatchLine") or r.get("stockStatus") == "DISPATCHED"
    ]
    rejected_rolls = [
        r for r in rolls
        if r.get("qcStatus") == "REJECTED"
    ]

    eligible_count = len(eligible_rolls)
    unresolved_count = len(unresolved_rolls)
    dispatched_count = len(dispatched_rolls)
    dispatched_metres = sum(r.get("lengthMetres", 0) for r in dispatched_rolls)
    rejected_metres = sum(r.get("lengthMetres", 0) for r in rejected_rolls)

    # 1. At least one roll dispatched
    if dispatched_count > 0:
        if eligible_count > 0 or unresolved_count > 0:
            return {
                "status": "PARTIALLY_DISPATCHED",
                "explanation": f"Dispatched {dispatched_metres:.1f} m of {order_qty_metres:.1f} m ordered ({eligible_count} rolls ready on shelf)",
                "dispatchedMetres": dispatched_metres,
                "shortfallNote": None,
            }
        else:
            # eligible == 0 and unresolved == 0
            shortfall_note = (
                f"Delivered {dispatched_metres:.1f} of {order_qty_metres:.1f} m ({rejected_metres:.1f} m rejected)"
                if rejected_metres > 0
                else f"Delivered {dispatched_metres:.1f} of {order_qty_metres:.1f} m"
            )
            return {
                "status": "COMPLETED",
                "explanation": shortfall_note,
                "dispatchedMetres": dispatched_metres,
                "shortfallNote": shortfall_note if rejected_metres > 0 else None,
            }

    # 2. Nothing dispatched yet
    if unresolved_count > 0:
        return {
            "status": "IN_QC",
            "explanation": f"{unresolved_count} rolls awaiting inspection or rework",
            "dispatchedMetres": 0,
            "shortfallNote": None,
        }
    elif total_registered == 0:
        return {
            "status": "IN_QC",
            "explanation": "No rolls registered yet",
            "dispatchedMetres": 0,
            "shortfallNote": None,
        }
    elif eligible_count > 0:
        return {
            "status": "READY_TO_SHIP",
            "explanation": f"{eligible_count} rolls passed QC ({sum(r.get('lengthMetres', 0) for r in eligible_rolls):.1f} m) ready for dispatch",
            "dispatchedMetres": 0,
            "shortfallNote": None,
        }
    else:
        # Every registered roll is rejected
        return {
            "status": "IN_QC",
            "explanation": f"No dispatch-eligible rolls. All {total_registered} registered rolls ({total_registered_metres:.1f} m) were rejected. Rejected quantity: {rejected_metres:.1f} m of {order_qty_metres:.1f} m ordered. Nothing can be shipped.",
            "dispatchedMetres": 0,
            "shortfallNote": f"All {total_registered} rolls rejected ({rejected_metres:.1f} m)",
        }

def recompute_order_status(arg1: Any, arg2: Any = None) -> Dict[str, Any]:
    if isinstance(arg1, str):
        order_id = arg1
        db = arg2
    else:
        db = arg1
        order_id = arg2

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"status": "NEW", "explanation": "Order not found"}

    # Recompute only applies once order has reached QC or production finished
    if order.status in ("NEW", "AWAITING_YARN", "CONFIRMED", "CANCELLED"):
        return {"status": order.status, "explanation": ""}

    if order.status == "IN_PRODUCTION" and order.currentStage is not None:
        return {"status": "IN_PRODUCTION", "explanation": f"In {order.currentStage.lower()}"}

    rolls = db.query(Roll).filter(Roll.orderId == order_id).all()
    rolls_data = []
    for r in rolls:
        dl = db.query(DispatchLine).filter(DispatchLine.rollId == r.id).first()
        rolls_data.append({
            "id": r.id,
            "qcStatus": r.qcStatus,
            "stockStatus": r.stockStatus,
            "lengthMetres": r.lengthMetres,
            "dispatchLine": {"id": dl.id} if dl else None,
        })

    result = derive_order_status_from_rolls(rolls_data, order.qtyMetres)
    order.status = result["status"]
    db.commit()
    return result
