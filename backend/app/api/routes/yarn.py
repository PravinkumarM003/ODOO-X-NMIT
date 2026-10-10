from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import YarnItem, YarnLot, Supplier, Order, StockMovement
from app.core.dependencies import require_role
from app.services.yarn_service import (
    receive_yarn,
    adjust_stock,
    get_yarn_stock_summary,
    get_lot_remainings,
)
from app.services.order_service import auto_allocate_yarn
from app.schemas.yarn import ReceiveYarnRequest, AdjustStockRequest

router = APIRouter(prefix="/yarn", tags=["Yarn Inventory"])


@router.get("")
def list_yarn_items(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    yarn_items = db.execute(select(YarnItem).order_by(YarnItem.code.asc())).scalars().all()
    suppliers = db.execute(select(Supplier).order_by(Supplier.name.asc())).scalars().all()
    orders = db.execute(
        select(Order)
        .where(Order.status.in_(["AWAITING_YARN", "CONFIRMED", "IN_PRODUCTION"]))
        .order_by(Order.orderNo.asc())
    ).scalars().all()

    items_data = []
    all_lots_list = []

    for item in yarn_items:
        stock = get_yarn_stock_summary(db, item.id)

        shortage_awaiting = 0.0
        for ft in item.fabricTypes:
            for ord in ft.orders:
                if ord.status == "AWAITING_YARN":
                    shortage_awaiting += ord.shortageKg

        items_data.append({
            "id": item.id,
            "code": item.code,
            "yarnType": item.yarnType,
            "count": item.count,
            "colour": item.colour,
            "reorderThresholdKg": item.reorderThresholdKg,
            "unit": item.unit,
            "stock": {
                "yarnItemId": stock.yarn_item_id,
                "onHandKg": stock.on_hand_kg,
                "reservedKg": stock.reserved_kg,
                "availableKg": stock.available_kg,
                "thresholdKg": stock.threshold_kg,
                "health": stock.health,
            },
            "shortageAwaitingKg": round(shortage_awaiting, 2),
            "lotCount": len(item.lots),
        })

        remainings = get_lot_remainings(db, item.id)
        for r in remainings:
            all_lots_list.append({
                "id": r.lot_id,
                "lotCode": r.lot_code,
                "yarnCode": item.code,
                "remainingKg": r.remaining_kg,
            })

    return {
        "items": items_data,
        "suppliers": [{"id": s.id, "name": s.name} for s in suppliers],
        "orders": [{"id": o.id, "orderNo": o.orderNo, "buyerName": o.buyer.name if o.buyer else ""} for o in orders],
        "allLots": all_lots_list,
    }


@router.get("/{id}")
def get_yarn_item_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    item = db.execute(select(YarnItem).where(YarnItem.id == id)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail=f"Yarn item {id} not found")

    stock = get_yarn_stock_summary(db, item.id)
    lots = get_lot_remainings(db, item.id)

    movements = db.execute(
        select(StockMovement)
        .where(StockMovement.yarnItemId == item.id)
        .order_by(StockMovement.createdAt.desc())
    ).scalars().all()

    return {
        "item": {
            "id": item.id,
            "code": item.code,
            "yarnType": item.yarnType,
            "count": item.count,
            "colour": item.colour,
            "reorderThresholdKg": item.reorderThresholdKg,
            "unit": item.unit,
        },
        "stock": {
            "yarnItemId": stock.yarn_item_id,
            "onHandKg": stock.on_hand_kg,
            "reservedKg": stock.reserved_kg,
            "availableKg": stock.available_kg,
            "thresholdKg": stock.threshold_kg,
            "health": stock.health,
        },
        "lots": [
            {
                "lotId": l.lot_id,
                "lotCode": l.lot_code,
                "supplierId": l.supplier_id,
                "supplierName": l.supplier_name,
                "receivedAt": l.received_at.isoformat() if l.received_at else None,
                "unitCostPerKg": l.unit_cost_per_kg,
                "qtyReceivedKg": l.qty_received_kg,
                "remainingKg": l.remaining_kg,
            }
            for l in lots
        ],
        "movements": [
            {
                "id": m.id,
                "type": m.type,
                "qtyKg": m.qtyKg,
                "lotCode": m.lot.lotCode if m.lot else None,
                "orderNo": m.order.orderNo if m.order else None,
                "reason": m.reason,
                "createdBy": m.createdBy,
                "createdAt": m.createdAt.isoformat() if m.createdAt else None,
            }
            for m in movements
        ],
    }


@router.post("/receive")
def receive_yarn_endpoint(
    req: ReceiveYarnRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        lot = receive_yarn(
            db=db,
            lot_code=req.lotCode,
            yarn_item_id=req.yarnItemId,
            supplier_id=req.supplierId,
            qty_received_kg=req.qtyReceivedKg,
            unit_cost_per_kg=req.unitCostPerKg,
            linked_order_id=req.linkedOrderId,
            received_by=current_user.name,
            create_supplier_bill=bool(req.createSupplierBill),
            bill_amount=req.billAmount,
        )

        released_orders = auto_allocate_yarn(db, req.yarnItemId, current_user.name)

        return {
            "success": True,
            "lotCode": lot.lotCode,
            "qtyReceivedKg": req.qtyReceivedKg,
            "releasedOrders": released_orders,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/adjust")
def adjust_stock_endpoint(
    req: AdjustStockRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    try:
        movement = adjust_stock(
            db=db,
            lot_id=req.lotId,
            delta_kg=req.deltaKg,
            reason=req.reason,
            adjusted_by=current_user.name,
        )
        return {"success": True, "movementId": movement.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
