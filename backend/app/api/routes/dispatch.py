from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Order, Dispatch, Invoice, Roll
from app.core.dependencies import require_role
from app.services.dispatch_service import create_dispatch, record_payment, get_store_rolls
from app.schemas.dispatch import CreateDispatchRequest, RecordPaymentRequest

router = APIRouter(prefix="/dispatch", tags=["Dispatch & Invoices"])


@router.get("")
def get_dispatch_data(
    search: str | None = None,
    sort_by: str | None = "dispatchedAt",
    sort_order: str | None = "desc",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
    from sqlalchemy.orm import selectinload
    orders = db.execute(
        select(Order)
        .where(Order.status.in_(["READY_TO_SHIP", "PARTIALLY_DISPATCHED", "IN_QC"]))
        .order_by(Order.orderNo.asc())
        .options(
            selectinload(Order.rolls).selectinload(Roll.dispatchLine),
            selectinload(Order.buyer),
            selectinload(Order.fabricType)
        )
    ).scalars().all()

    ready_orders = []
    for ord in orders:
        eligible_rolls = [
            {
                "id": r.id,
                "rollNo": r.rollNo,
                "lengthMetres": r.lengthMetres,
                "qcStatus": r.qcStatus,
                "stockStatus": r.stockStatus,
            }
            for r in ord.rolls
            if r.qcStatus == "PASSED" and r.stockStatus == "IN_STORE" and not r.dispatchLine
        ]
        disabled_rolls = [
            {
                "id": r.id,
                "rollNo": r.rollNo,
                "lengthMetres": r.lengthMetres,
                "qcStatus": r.qcStatus,
                "stockStatus": r.stockStatus,
            }
            for r in ord.rolls
            if not (r.qcStatus == "PASSED" and r.stockStatus == "IN_STORE" and not r.dispatchLine)
        ]

        if eligible_rolls:
            ready_orders.append({
                "id": ord.id,
                "orderNo": ord.orderNo,
                "buyerName": ord.buyer.name if ord.buyer else "",
                "fabricName": ord.fabricType.name if ord.fabricType else "",
                "colour": ord.colour,
                "pricePerMetre": ord.pricePerMetre,
                "status": ord.status,
                "eligibleRolls": eligible_rolls,
                "disabledRolls": disabled_rolls,
                "rolls": eligible_rolls,
            })

    # Store View (4 Sections, BR-18)
    store_data = get_store_rolls(db)

    def serialize_store_roll(r: Roll):
        return {
            "id": r.id,
            "rollNo": r.rollNo,
            "lengthMetres": r.lengthMetres,
            "qcStatus": r.qcStatus,
            "stockStatus": r.stockStatus,
            "order": {
                "id": r.order.id if r.order else "",
                "orderNo": r.order.orderNo if r.order else "",
                "buyer": {
                    "name": r.order.buyer.name if r.order and r.order.buyer else ""
                },
            },
            "qcRecords": [
                {
                    "defectType": q.defectType,
                    "severity": q.severity,
                    "result": q.result,
                    "notes": q.notes,
                }
                for q in r.qcRecords
            ],
            "dispatchLine": {
                "dispatch": {
                    "id": r.dispatchLine.dispatch.id,
                    "dispatchNo": r.dispatchLine.dispatch.dispatchNo,
                    "invoice": {
                        "id": r.dispatchLine.dispatch.invoice.id,
                        "invoiceNo": r.dispatchLine.dispatch.invoice.invoiceNo,
                    } if r.dispatchLine.dispatch.invoice else None,
                }
            } if r.dispatchLine and r.dispatchLine.dispatch else None,
        }

    store_view = {
        "shelf": {
            "rolls": [serialize_store_roll(r) for r in store_data["shelf"]["rolls"]],
            "count": store_data["shelf"]["count"],
            "metres": store_data["shelf"]["metres"],
        },
        "awaitingQC": {
            "rolls": [serialize_store_roll(r) for r in store_data["awaitingQC"]["rolls"]],
            "count": store_data["awaitingQC"]["count"],
            "metres": store_data["awaitingQC"]["metres"],
        },
        "quarantined": {
            "rolls": [serialize_store_roll(r) for r in store_data["quarantined"]["rolls"]],
            "count": store_data["quarantined"]["count"],
            "metres": store_data["quarantined"]["metres"],
        },
        "dispatched": {
            "rolls": [serialize_store_roll(r) for r in store_data["dispatched"]["rolls"]],
            "count": store_data["dispatched"]["count"],
            "metres": store_data["dispatched"]["metres"],
        },
    }

    # Recent dispatches
    recent_dispatches = db.execute(
        select(Dispatch)
        .order_by(Dispatch.dispatchedAt.desc())
        .limit(15)
        .options(
            selectinload(Dispatch.order),
            selectinload(Dispatch.buyer),
            selectinload(Dispatch.lines),
            selectinload(Dispatch.invoice)
        )
    ).scalars().all()

    dispatches_data = [
        {
            "id": d.id,
            "dispatchNo": d.dispatchNo,
            "orderNo": d.order.orderNo if d.order else "",
            "buyerName": d.buyer.name if d.buyer else "",
            "truckNo": d.truckNo,
            "driverName": d.driverName,
            "dispatchedAt": d.dispatchedAt.isoformat(),
            "dispatchedBy": d.dispatchedBy,
            "rollCount": len(d.lines),
            "totalMetres": round(sum(l.lengthMetres for l in d.lines), 2),
            "invoiceNo": d.invoice.invoiceNo if d.invoice else None,
            "invoiceAmount": d.invoice.amount if d.invoice else None,
            "invoiceStatus": d.invoice.status if d.invoice else None,
        }
        for d in recent_dispatches
    ]

    # Invoices list with payments and relations
    query = select(Invoice)
    
    if search:
        search_term = f"%{search.lower()}%"
        from sqlalchemy import func, or_
        query = query.outerjoin(Order, Invoice.orderId == Order.id).outerjoin(Dispatch, Invoice.dispatchId == Dispatch.id).where(
            or_(
                func.lower(Invoice.invoiceNo).like(search_term),
                func.lower(Order.orderNo).like(search_term),
                func.lower(Dispatch.dispatchNo).like(search_term)
            )
        )
        
    query = query.order_by(Invoice.issuedAt.desc())
    query = query.options(
        selectinload(Invoice.order).selectinload(Order.buyer),
        selectinload(Invoice.dispatch),
        selectinload(Invoice.payments)
    )
    
    from sqlalchemy import func
    total = db.scalar(select(func.count()).select_from(query.with_only_columns(Invoice.id).subquery()))
    invoices = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    invoices_data = []
    for inv in invoices:
        paid = sum(p.amount for p in inv.payments)
        invoices_data.append({
            "id": inv.id,
            "invoiceNo": inv.invoiceNo,
            "orderNo": inv.order.orderNo if inv.order else "",
            "buyerName": inv.order.buyer.name if inv.order and inv.order.buyer else "",
            "amount": inv.amount,
            "paidAmount": round(paid, 2),
            "balance": round(inv.amount - paid, 2),
            "status": inv.status,
            "issuedAt": inv.issuedAt.isoformat(),
            "order": {
                "id": inv.order.id if inv.order else "",
                "orderNo": inv.order.orderNo if inv.order else "",
                "buyer": {
                    "name": inv.order.buyer.name if inv.order and inv.order.buyer else ""
                },
            },
            "dispatch": {
                "id": inv.dispatch.id if inv.dispatch else "",
                "dispatchNo": inv.dispatch.dispatchNo if inv.dispatch else "",
            },
            "payments": [
                {
                    "id": p.id,
                    "amount": p.amount,
                    "method": p.method,
                    "reference": p.reference,
                    "receivedAt": p.receivedAt.isoformat() if p.receivedAt else None,
                    "paidAt": p.receivedAt.isoformat() if p.receivedAt else None,
                }
                for p in inv.payments
            ],
        })

    return {
        "storeView": store_view,
        "readyOrders": ready_orders,
        "dispatches": dispatches_data,
        "invoices": invoices_data,
        "invoicesTotal": total,
        "invoicesPage": page,
        "invoicesPageSize": page_size,
    }


@router.post("/create")
def create_dispatch_endpoint(
    req: CreateDispatchRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    try:
        result = create_dispatch(
            db=db,
            order_id=req.orderId,
            roll_ids=req.rollIds,
            truck_no=req.truckNo,
            driver_name=req.driverName,
            dispatched_by=current_user.name,
        )
        return {
            "success": True,
            "dispatchNo": result["dispatch"].dispatchNo,
            "invoiceNo": result["invoice"].invoiceNo,
            "rollCount": result["rollCount"],
            "totalMetres": result["totalMetres"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payment")
def record_payment_endpoint(
    req: RecordPaymentRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    try:
        payment = record_payment(
            db=db,
            invoice_id=req.invoiceId,
            amount=req.amount,
            method=req.method,
            reference=req.reference,
        )
        return {"success": True, "paymentId": payment.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
