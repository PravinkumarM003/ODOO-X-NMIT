from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Roll, Order, QCRecord, WorkOrder, Machine
from app.core.dependencies import require_role
from app.services.qc_service import register_rolls, inspect_roll, RollInput
from app.services.dispatch_service import get_store_rolls
from app.schemas.rolls import RegisterRollsRequest, InspectRollRequest

router = APIRouter(prefix="/rolls", tags=["Quality Control & Rolls"])


@router.get("")
def list_rolls_and_store(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    sort_by: Optional[str] = Query("createdAt"),
    sort_order: Optional[str] = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
    store_data = get_store_rolls(db)
    
    query = select(Roll).join(Order, isouter=True)
    if search:
        search_term = f"%{search.lower()}%"
        from sqlalchemy import func, or_
        query = query.where(
            or_(
                func.lower(Roll.rollNo).like(search_term),
                func.lower(Order.orderNo).like(search_term)
            )
        )
        
    if status_filter and status_filter != "ALL":
        query = query.where(Roll.qcStatus == status_filter)

    sort_col_map = {
        "rollNo": Roll.rollNo,
        "orderNo": Order.orderNo,
        "lengthMetres": Roll.lengthMetres,
        "qcStatus": Roll.qcStatus,
        "stockStatus": Roll.stockStatus,
        "createdAt": Roll.createdAt,
    }
    target_col = sort_col_map.get(sort_by, Roll.createdAt)
    direction = sort_order.lower() if sort_order else "desc"
    order_clause = target_col.asc() if direction == "asc" else target_col.desc()

    query = query.order_by(order_clause, Roll.id.desc())

    from sqlalchemy import func
    from sqlalchemy.orm import selectinload
    total = db.scalar(select(func.count()).select_from(query.with_only_columns(Roll.id).subquery()))

    paginated_rolls = db.execute(
        query.offset((page - 1) * page_size)
        .limit(page_size)
        .options(
            selectinload(Roll.order).selectinload(Order.buyer),
            selectinload(Roll.order).selectinload(Order.fabricType),
            selectinload(Roll.weavingMachine),
            selectinload(Roll.dyeingMachine),
            selectinload(Roll.qcRecords)
        )
    ).scalars().all()

    # Calculate machine defects optimally
    all_rolls_light = db.execute(select(Roll.qcStatus, Roll.weavingMachineId, Roll.dyeingMachineId)).all()
    machines = db.execute(select(Machine).where(Machine.type.in_(["WEAVING", "DYEING"]))).scalars().all()
    
    machine_defects = []
    for m in machines:
        rolls_for_machine = [
            r for r in all_rolls_light
            if (m.type == "WEAVING" and r.weavingMachineId == m.id) or (m.type == "DYEING" and r.dyeingMachineId == m.id)
        ]
        defect_count = sum(1 for r in rolls_for_machine if r.qcStatus in ["REWORK", "REJECTED"])
        total_rolls = len(rolls_for_machine)
        defect_rate = round((defect_count / total_rolls * 100), 1) if total_rolls > 0 else 0.0
        machine_defects.append({
            "machineCode": m.code,
            "type": m.type,
            "defectCount": defect_count,
            "totalRolls": total_rolls,
            "defectRate": defect_rate,
        })

    # Orders eligible for roll registration: IN_QC or IN_PRODUCTION
    eligible_orders = db.execute(
        select(Order)
        .where(Order.status.in_(["IN_PRODUCTION", "IN_QC", "READY_TO_SHIP"]))
        .order_by(Order.orderNo.asc())
        .options(
            selectinload(Order.buyer),
            selectinload(Order.fabricType),
            selectinload(Order.rolls)
        )
    ).scalars().all()

    def serialize_roll(r: Roll):
        latest_record = r.qcRecords[0] if r.qcRecords else None
        latest_defect = None
        if latest_record and latest_record.defectType:
            latest_defect = {
                "type": latest_record.defectType,
                "severity": latest_record.severity,
                "notes": latest_record.notes,
            }
        return {
            "id": r.id,
            "rollNo": r.rollNo,
            "orderId": r.orderId,
            "orderNo": r.order.orderNo if r.order else "",
            "buyerName": r.order.buyer.name if r.order and r.order.buyer else "",
            "fabricName": r.order.fabricType.name if r.order and r.order.fabricType else "",
            "lengthMetres": r.lengthMetres,
            "weavingMachineCode": r.weavingMachine.code if r.weavingMachine else None,
            "dyeingMachineCode": r.dyeingMachine.code if r.dyeingMachine else None,
            "qcStatus": r.qcStatus,
            "stockStatus": r.stockStatus,
            "createdAt": r.createdAt.isoformat(),
            "qcRecordsCount": len(r.qcRecords),
            "latestDefect": latest_defect,
            "latestQC": {
                "qcNo": latest_record.qcNo,
                "result": latest_record.result,
                "defectType": latest_record.defectType,
                "severity": latest_record.severity,
                "notes": latest_record.notes,
            } if latest_record else None,
        }

    eligible_orders_list = [
        {
            "id": o.id,
            "orderNo": o.orderNo,
            "buyerName": o.buyer.name if o.buyer else "",
            "fabricName": o.fabricType.name if o.fabricType else "",
            "qtyMetres": o.qtyMetres,
            "registeredMetres": sum(r.lengthMetres for r in o.rolls),
            "existingRollsMetres": sum(r.lengthMetres for r in o.rolls),
        }
        for o in eligible_orders
    ]

    qc_counts = {
        "passed": sum(1 for r in all_rolls_light if r.qcStatus == "PASSED"),
        "rework": sum(1 for r in all_rolls_light if r.qcStatus == "REWORK"),
        "rejected": sum(1 for r in all_rolls_light if r.qcStatus == "REJECTED"),
        "pending": sum(1 for r in all_rolls_light if r.qcStatus == "PENDING"),
    }

    return {
        "rolls": [serialize_roll(r) for r in paginated_rolls],
        "machineDefects": machine_defects,
        "eligibleOrders": eligible_orders_list,
        "qcCounts": qc_counts,
        "total": total,
        "page": page,
        "pageSize": page_size,
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
    }


@router.get("/{id}")
def get_roll_passport(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
