from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Roll, Order, QCRecord, WorkOrder
from app.core.dependencies import require_role
from app.services.qc_service import register_rolls, inspect_roll, RollInput
from app.services.dispatch_service import get_store_rolls
from app.schemas.rolls import RegisterRollsRequest, InspectRollRequest

router = APIRouter(prefix="/rolls", tags=["Quality Control & Rolls"])


@router.get("")
def list_rolls_and_store(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    store_data = get_store_rolls(db)

    # Orders eligible for roll registration: IN_QC or IN_PRODUCTION
    eligible_orders = db.execute(
        select(Order)
        .where(Order.status.in_(["IN_PRODUCTION", "IN_QC", "READY_TO_SHIP"]))
        .order_by(Order.orderNo.asc())
    ).scalars().all()

    def serialize_roll(r: Roll):
        return {
            "id": r.id,
            "rollNo": r.rollNo,
            "orderId": r.orderId,
            "orderNo": r.order.orderNo if r.order else "",
            "buyerName": r.order.buyer.name if r.order and r.order.buyer else "",
            "lengthMetres": r.lengthMetres,
            "qcStatus": r.qcStatus,
            "stockStatus": r.stockStatus,
            "createdAt": r.createdAt.isoformat(),
            "latestQC": {
                "qcNo": r.qcRecords[0].qcNo,
                "result": r.qcRecords[0].result,
                "defectType": r.qcRecords[0].defectType,
                "severity": r.qcRecords[0].severity,
                "notes": r.qcRecords[0].notes,
            } if r.qcRecords else None,
        }

    return {
        "store": {
            "shelf": {
                "count": store_data["shelf"]["count"],
                "metres": store_data["shelf"]["metres"],
                "rolls": [serialize_roll(r) for r in store_data["shelf"]["rolls"]],
            },
            "awaitingQC": {
                "count": store_data["awaitingQC"]["count"],
                "metres": store_data["awaitingQC"]["metres"],
                "rolls": [serialize_roll(r) for r in store_data["awaitingQC"]["rolls"]],
            },
            "quarantined": {
                "count": store_data["quarantined"]["count"],
                "metres": store_data["quarantined"]["metres"],
                "rolls": [serialize_roll(r) for r in store_data["quarantined"]["rolls"]],
            },
            "dispatched": {
                "count": store_data["dispatched"]["count"],
                "metres": store_data["dispatched"]["metres"],
                "rolls": [serialize_roll(r) for r in store_data["dispatched"]["rolls"]],
            },
        },
        "eligibleOrders": [
            {
                "id": o.id,
                "orderNo": o.orderNo,
                "buyerName": o.buyer.name if o.buyer else "",
                "qtyMetres": o.qtyMetres,
                "existingRollsMetres": sum(r.lengthMetres for r in o.rolls),
            }
            for o in eligible_orders
        ],
    }


@router.get("/{id}")
def get_roll_passport(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    roll = db.execute(select(Roll).where(Roll.id == id)).scalar_one_or_none()
    if not roll:
        raise HTTPException(status_code=404, detail=f"Roll {id} not found")

    return {
        "id": roll.id,
        "rollNo": roll.rollNo,
        "lengthMetres": roll.lengthMetres,
        "qcStatus": roll.qcStatus,
        "stockStatus": roll.stockStatus,
        "createdAt": roll.createdAt.isoformat(),
        "order": {
            "id": roll.order.id,
            "orderNo": roll.order.orderNo,
            "buyerName": roll.order.buyer.name if roll.order.buyer else "",
            "fabricName": roll.order.fabricType.name if roll.order.fabricType else "",
            "colour": roll.order.colour,
        } if roll.order else None,
        "weavingMachine": {
            "id": roll.weavingMachine.id,
            "code": roll.weavingMachine.code,
        } if roll.weavingMachine else None,
        "dyeingMachine": {
            "id": roll.dyeingMachine.id,
            "code": roll.dyeingMachine.code,
        } if roll.dyeingMachine else None,
        "qcRecords": [
            {
                "id": q.id,
                "qcNo": q.qcNo,
                "inspectorName": q.inspectorName,
                "result": q.result,
                "defectType": q.defectType,
                "severity": q.severity,
                "notes": q.notes,
                "createdAt": q.createdAt.isoformat(),
            }
            for q in roll.qcRecords
        ],
        "dispatch": {
            "dispatchNo": roll.dispatchLine.dispatch.dispatchNo,
            "truckNo": roll.dispatchLine.dispatch.truckNo,
            "dispatchedAt": roll.dispatchLine.dispatch.dispatchedAt.isoformat(),
        } if roll.dispatchLine and roll.dispatchLine.dispatch else None,
    }


@router.post("/register")
def register_rolls_endpoint(
    req: RegisterRollsRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        rolls_input = [RollInput(lengthMetres=r.lengthMetres) for r in req.rolls]
        created = register_rolls(
            db=db,
            order_id=req.orderId,
            rolls=rolls_input,
            registered_by=current_user.name,
        )
        return {"success": True, "count": len(created)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{id}/inspect")
def inspect_roll_endpoint(
    id: str,
    req: InspectRollRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        updated = inspect_roll(
            db=db,
            roll_id=id,
            result=req.result,
            defect_type=req.defectType,
            severity=req.severity,
            notes=req.notes,
            inspector_id=current_user.id,
            inspector_name=current_user.name,
        )
        return {
            "success": True,
            "rollNo": updated.rollNo,
            "status": updated.qcStatus,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
