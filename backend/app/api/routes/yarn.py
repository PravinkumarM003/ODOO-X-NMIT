from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import YarnItem, YarnLot, FabricType, Supplier, Order, StockMovement
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
    search: str | None = Query(None),
    sort_by: str | None = Query("code"),
    sort_order: str | None = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
    query = (
        select(YarnItem)
        .options(
            selectinload(YarnItem.fabricTypes).selectinload(FabricType.orders),
            selectinload(YarnItem.lots).selectinload(YarnLot.supplier),
        )
    )

    if search:
        search_term = f"%{search.lower()}%"
        from sqlalchemy import func, or_
        query = query.where(
            or_(
                func.lower(YarnItem.code).like(search_term),
                func.lower(YarnItem.colour).like(search_term),
                func.lower(YarnItem.yarnType).like(search_term),
            )
        )
        
    sort_col_map = {
        "code": YarnItem.code,
        "yarnType": YarnItem.yarnType,
        "colour": YarnItem.colour,
        "availableStockKg": YarnItem.reorderThresholdKg,
        "minThresholdKg": YarnItem.reorderThresholdKg,
        "createdAt": YarnItem.id,
    }
    target_col = sort_col_map.get(sort_by, YarnItem.code)
    direction = sort_order.lower() if sort_order else "asc"
    order_clause = target_col.asc() if direction == "asc" else target_col.desc()

    query = query.order_by(order_clause, YarnItem.id.desc())
    
    from sqlalchemy import func
    total = db.scalar(select(func.count()).select_from(query.with_only_columns(YarnItem.id).subquery()))

    yarn_items = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    suppliers = db.execute(select(Supplier).order_by(Supplier.name.asc())).scalars().all()
    
    # We still fetch all active orders for the forms. Wait, the frontend might not need ALL orders if we paginate, 
    # but the form dropdown needs all active orders.
    orders = db.execute(
        select(Order)
        .where(Order.status.in_(["AWAITING_YARN", "CONFIRMED", "IN_PRODUCTION"]))
        .order_by(Order.orderNo.asc())
    ).scalars().all()

    items_data = []
    all_lots_list = []
    
    item_ids = [item.id for item in yarn_items]
    lot_ids = [lot.id for item in yarn_items for lot in item.lots]
    
    if item_ids:
        from sqlalchemy import func, case
        yarn_movements = db.execute(
            select(
                StockMovement.yarnItemId,
                func.coalesce(func.sum(case((StockMovement.type == "RECEIPT", StockMovement.qtyKg), else_=0)), 0).label("receipt"),
                func.coalesce(func.sum(case((StockMovement.type == "CONSUME", StockMovement.qtyKg), else_=0)), 0).label("consume"),
                func.coalesce(func.sum(case((StockMovement.type == "ADJUST", StockMovement.qtyKg), else_=0)), 0).label("adjust"),
                func.coalesce(func.sum(case((StockMovement.type == "RESERVE", StockMovement.qtyKg), else_=0)), 0).label("reserve"),
                func.coalesce(func.sum(case((StockMovement.type == "RELEASE", StockMovement.qtyKg), else_=0)), 0).label("release"),
            )
            .where(StockMovement.yarnItemId.in_(item_ids))
            .group_by(StockMovement.yarnItemId)
        ).all()
        yarn_stock_map = {}
        for ym in yarn_movements:
            on_hand = round(ym.receipt - ym.consume + ym.adjust, 2)
            reserved = round(ym.reserve - ym.release, 2)
            available = round(on_hand - reserved, 2)
            yarn_stock_map[ym.yarnItemId] = {
                "onHandKg": max(0.0, on_hand),
                "reservedKg": max(0.0, reserved),
                "availableKg": max(0.0, available),
            }

        lot_movements = db.execute(
            select(
                StockMovement.lotId,
                func.coalesce(func.sum(case((StockMovement.type == "CONSUME", StockMovement.qtyKg), else_=0)), 0).label("consume"),
                func.coalesce(func.sum(case((StockMovement.type == "ADJUST", StockMovement.qtyKg), else_=0)), 0).label("adjust"),
            )
            .where(StockMovement.lotId.in_(lot_ids))
            .group_by(StockMovement.lotId)
        ).all() if lot_ids else []
        lot_stock_map = {lm.lotId: {"consume": lm.consume, "adjust": lm.adjust} for lm in lot_movements}
    else:
        yarn_stock_map = {}
        lot_stock_map = {}

    for item in yarn_items:
        ys = yarn_stock_map.get(item.id, {"onHandKg": 0.0, "reservedKg": 0.0, "availableKg": 0.0})
        
        if ys["availableKg"] <= 0:
            health = "OUT"
        elif ys["availableKg"] < item.reorderThresholdKg:
            health = "LOW"
        else:
            health = "OK"

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
                "yarnItemId": item.id,
                "onHandKg": ys["onHandKg"],
                "reservedKg": ys["reservedKg"],
                "availableKg": ys["availableKg"],
                "thresholdKg": item.reorderThresholdKg,
                "health": health,
            },
            "shortageAwaitingKg": round(shortage_awaiting, 2),
            "lotCount": len(item.lots),
        })

        for lot in item.lots:
            ls = lot_stock_map.get(lot.id, {"consume": 0.0, "adjust": 0.0})
            remaining = round(lot.qtyReceivedKg - ls["consume"] + ls["adjust"], 2)
            all_lots_list.append({
                "id": lot.id,
                "lotCode": lot.lotCode,
                "yarnCode": item.code,
                "remainingKg": max(0.0, remaining),
            })

    return {
        "items": items_data,
        "suppliers": [{"id": s.id, "name": s.name} for s in suppliers],
        "orders": [{"id": o.id, "orderNo": o.orderNo, "buyerName": o.buyer.name if o.buyer else ""} for o in orders],
        "allLots": all_lots_list,
        "total": total,
        "page": page,
        "pageSize": page_size
    }


@router.get("/{id}")
def get_yarn_item_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
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
