from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.entities import Order, FabricType, StockMovement, WorkOrder, Buyer
from app.services.yarn_service import get_yarn_stock_summary


class OrderResult(dict):
    @property
    def id(self): return self.get("id")
    @property
    def order_no(self): return self.get("orderNo")
    @property
    def orderNo(self): return self.get("orderNo")
    @property
    def status(self): return self.get("status")
    @property
    def shortage_kg(self): return self.get("shortageKg", 0.0)
    @property
    def shortageKg(self): return self.get("shortageKg", 0.0)
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(name)


def calculate_yarn_requirement(*args, **kwargs) -> Dict[str, Any]:
    if len(args) == 3:
        if isinstance(args[0], Session):
            db = args[0]
            fabric_type_id = args[1]
            qty_metres = args[2]
        else:
            fabric_type_id = args[0]
            qty_metres = args[1]
            db = args[2]
    elif "db" in kwargs and "fabric_type_id" in kwargs:
        db = kwargs["db"]
        fabric_type_id = kwargs["fabric_type_id"]
        qty_metres = kwargs.get("qty_metres", kwargs.get("qtyMetres", 0))
    elif "db" in kwargs and "fabricTypeId" in kwargs:
        db = kwargs["db"]
        fabric_type_id = kwargs["fabricTypeId"]
        qty_metres = kwargs.get("qtyMetres", kwargs.get("qty_metres", 0))
    else:
        raise ValueError("Invalid arguments for calculate_yarn_requirement")

    fabric = db.query(FabricType).filter(FabricType.id == fabric_type_id).first()
    if not fabric:
        raise HTTPException(status_code=404, detail="Fabric type not found")

    # BR-04: yarn required = qtyMetres * yarnKgPerMetre * 1.05
    required_kg = round(float(qty_metres) * fabric.yarnKgPerMetre * 1.05, 2)
    stock = get_yarn_stock_summary(db, fabric.yarnItemId)
    available_kg = stock["availableKg"]
    shortage_kg = max(0.0, round(required_kg - available_kg, 2))
    can_fulfill = available_kg >= required_kg

    return {
        "fabricTypeId": fabric.id,
        "fabricName": fabric.name,
        "yarnItemId": fabric.yarnItemId,
        "yarnItemCode": stock["code"],
        "yarnCode": stock["code"],
        "yarnType": stock["yarnType"],
        "requiredKg": required_kg,
        "yarnRequiredKg": required_kg,
        "availableKg": available_kg,
        "shortageKg": shortage_kg,
        "canFulfill": can_fulfill,
        "isAvailable": can_fulfill,
        "message": "Enough yarn to start" if can_fulfill else f"Short by {shortage_kg:.1f} kg: order more yarn",
    }


def create_work_orders_for_order(order_id: str, planned_qty: float, db: Session):
    for stage in ("SPINNING", "WEAVING", "DYEING"):
        existing = (
            db.query(WorkOrder)
            .filter(WorkOrder.orderId == order_id, WorkOrder.stage == stage)
            .first()
        )
        if not existing:
            wo = WorkOrder(
                id=str(uuid.uuid4()),
                orderId=order_id,
                stage=stage,
                plannedQtyMetres=planned_qty,
                producedQtyMetres=0.0,
                status="NOT_STARTED",
            )
            db.add(wo)


def create_order(*args, **kwargs) -> OrderResult:
    if len(args) == 2 and isinstance(args[1], Session):
        data = args[0]
        db = args[1]
    elif len(args) == 2 and isinstance(args[0], Session):
        db = args[0]
        data = args[1]
    elif "db" in kwargs:
        db = kwargs["db"]
        data = kwargs
    else:
        raise ValueError("db is required")

    buyer_id = data.get("buyerId", data.get("buyer_id"))
    fabric_type_id = data.get("fabricTypeId", data.get("fabric_type_id"))
    colour = str(data.get("colour", "")).strip()
    qty_metres = float(data.get("qtyMetres", data.get("qty_metres", 0)))
    deadline_val = data.get("deadline")
    created_by = data.get("createdBy", data.get("created_by", "System"))
    submitted_by_buyer = bool(data.get("submittedByBuyer", data.get("submitted_by_buyer", False)))
    price_per_metre = data.get("pricePerMetre", data.get("price_per_metre"))

    if not buyer_id:
        raise ValueError("Buyer is required")
    if not fabric_type_id:
        raise ValueError("Fabric type is required")
    if not colour:
        raise ValueError("Colour is required")
    if qty_metres <= 0:
        raise ValueError("Quantity must be greater than 0 metres")
    if not deadline_val:
        raise ValueError("Deadline is required")

    buyer = db.query(Buyer).filter(Buyer.id == buyer_id).first()
    if not buyer:
        raise ValueError("Buyer not found")

    fabric = db.query(FabricType).filter(FabricType.id == fabric_type_id).first()
    if not fabric:
        raise ValueError("Fabric type not found")

    if isinstance(deadline_val, str):
        deadline = datetime.fromisoformat(deadline_val.replace("Z", "+00:00"))
    else:
        deadline = deadline_val

    if price_per_metre is not None and float(price_per_metre) > 0:
        actual_price = float(price_per_metre)
    else:
        actual_price = fabric.defaultPricePerMetre

    yarn_req = calculate_yarn_requirement(fabric_type_id, qty_metres, db)
    required_kg = yarn_req["requiredKg"]

    # Generate orderNo: ORD-XXXX
    count = db.query(Order).count()
    order_no = f"ORD-{str(count + 1).zfill(4)}"

    # Status determination (BR-05 & BR-24)
    if submitted_by_buyer:
        status = "NEW"
        shortage_kg = yarn_req["shortageKg"]
    elif yarn_req["canFulfill"]:
        status = "CONFIRMED"
        shortage_kg = 0.0
    else:
        status = "AWAITING_YARN"
        shortage_kg = yarn_req["shortageKg"]

    order = Order(
        id=str(uuid.uuid4()),
        orderNo=order_no,
        buyerId=buyer_id,
        fabricTypeId=fabric_type_id,
        colour=colour,
        qtyMetres=qty_metres,
        deadline=deadline,
        pricePerMetre=actual_price,
        status=status,
        yarnRequiredKg=required_kg,
        shortageKg=shortage_kg,
        submittedByBuyer=submitted_by_buyer,
        createdAt=datetime.now(timezone.utc),
        createdBy=created_by,
    )
    db.add(order)
    db.flush()

    if status == "CONFIRMED":
        reserve_movement = StockMovement(
            id=str(uuid.uuid4()),
            yarnItemId=fabric.yarnItemId,
            orderId=order.id,
            type="RESERVE",
            qtyKg=required_kg,
            reason=f"Reservation for confirmed Order {order_no}",
            createdBy=created_by,
            createdAt=datetime.now(timezone.utc),
        )
        db.add(reserve_movement)
        create_work_orders_for_order(order.id, qty_metres, db)

    db.commit()
    db.refresh(order)

    return OrderResult({
        "id": order.id,
        "orderNo": order.orderNo,
        "status": order.status,
        "shortageKg": order.shortageKg,
        "yarnRequiredKg": order.yarnRequiredKg,
    })


def cancel_order(*args, **kwargs) -> OrderResult:
    if len(args) == 2 and isinstance(args[1], Session):
        data = args[0]
        db = args[1]
    elif len(args) == 2 and isinstance(args[0], Session):
        db = args[0]
        data = args[1]
    elif "db" in kwargs:
        db = kwargs["db"]
        data = kwargs
    else:
        raise ValueError("db is required")

    order_id = data.get("orderId", data.get("order_id"))
    cancel_reason = str(data.get("cancelReason", data.get("cancel_reason", ""))).strip()
    cancelled_by = str(data.get("cancelledBy", data.get("cancelled_by", "System")))

    if len(cancel_reason) < 5:
        raise ValueError("Cancellation reason is required (minimum 5 characters)")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Order not found")

    if order.status in ("CANCELLED", "COMPLETED"):
        raise ValueError(f"Order cannot be cancelled in status {order.status}")

    # Check if production started
    work_orders = db.query(WorkOrder).filter(WorkOrder.orderId == order.id).all()
    has_started = any(wo.status in ("IN_PROGRESS", "COMPLETED") or wo.producedQtyMetres > 0 for wo in work_orders)
    if has_started:
        raise ValueError("Order cannot be cancelled because production has already started")

    # Release outstanding reservation: sum(RESERVE) - sum(RELEASE)
    movements = db.query(StockMovement).filter(StockMovement.orderId == order.id).all()
    outstanding_reserve = round(
        sum(m.qtyKg for m in movements if m.type == "RESERVE")
        - sum(m.qtyKg for m in movements if m.type == "RELEASE"),
        2
    )

    if outstanding_reserve > 0:
        release_movement = StockMovement(
            id=str(uuid.uuid4()),
            yarnItemId=order.fabricType.yarnItemId,
            orderId=order.id,
            type="RELEASE",
            qtyKg=outstanding_reserve,
            reason=f"Reservation released due to cancellation of Order {order.orderNo}",
            createdBy=cancelled_by,
            createdAt=datetime.now(timezone.utc),
        )
        db.add(release_movement)

    order.status = "CANCELLED"
    order.cancelReason = cancel_reason
    order.cancelledAt = datetime.now(timezone.utc)
    order.cancelledBy = cancelled_by

    db.commit()
    db.refresh(order)

    return OrderResult({
        "id": order.id,
        "orderNo": order.orderNo,
        "status": order.status,
        "cancelReason": order.cancelReason,
    })


def review_buyer_order(*args, **kwargs) -> OrderResult:
    if len(args) == 2 and isinstance(args[1], Session):
        data = args[0]
        db = args[1]
    elif len(args) == 2 and isinstance(args[0], Session):
        db = args[0]
        data = args[1]
    elif "db" in kwargs:
        db = kwargs["db"]
        data = kwargs
    else:
        raise ValueError("db is required")

    order_id = data.get("orderId", data.get("order_id"))
    action = data.get("action", "")
    approve = (action == "APPROVE") or bool(data.get("approve", False))
    price_per_metre = data.get("pricePerMetre", data.get("adjustedPricePerMetre", data.get("adjusted_price_per_metre")))
    cancel_reason = data.get("cancelReason", data.get("cancel_reason"))
    reviewed_by = data.get("reviewedBy", data.get("reviewed_by", "Office"))

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise ValueError("Order not found")

    if order.status != "NEW":
        raise ValueError("Only orders in NEW status can be reviewed")

    if not approve:
        return cancel_order({
            "orderId": order.id,
            "cancelReason": cancel_reason or "Cancelled by Office during review",
            "cancelledBy": reviewed_by,
        }, db)

    # Approve (BR-24)
    if price_per_metre and float(price_per_metre) > 0:
        order.pricePerMetre = float(price_per_metre)

    yarn_req = calculate_yarn_requirement(order.fabricTypeId, order.qtyMetres, db)
    order.reviewedBy = reviewed_by
    order.reviewedAt = datetime.now(timezone.utc)

    if yarn_req["canFulfill"]:
        order.status = "CONFIRMED"
        order.shortageKg = 0.0
        reserve_movement = StockMovement(
            id=str(uuid.uuid4()),
            yarnItemId=order.fabricType.yarnItemId,
            orderId=order.id,
            type="RESERVE",
            qtyKg=yarn_req["requiredKg"],
            reason=f"Reservation upon Office review approval for Order {order.orderNo}",
            createdBy=reviewed_by,
            createdAt=datetime.now(timezone.utc),
        )
        db.add(reserve_movement)
        create_work_orders_for_order(order.id, order.qtyMetres, db)
    else:
        order.status = "AWAITING_YARN"
        order.shortageKg = yarn_req["shortageKg"]

    db.commit()
    db.refresh(order)

    return OrderResult({
        "id": order.id,
        "orderNo": order.orderNo,
        "status": order.status,
        "shortageKg": order.shortageKg,
    })


def auto_allocate_yarn(*args, **kwargs) -> List[Dict[str, Any]]:
    if len(args) == 3:
        if isinstance(args[0], Session):
            db = args[0]
            yarn_item_id = args[1]
            allocated_by = args[2]
        else:
            yarn_item_id = args[0]
            allocated_by = args[1]
            db = args[2]
    elif "db" in kwargs:
        db = kwargs["db"]
        yarn_item_id = kwargs.get("yarn_item_id", kwargs.get("yarnItemId"))
        allocated_by = kwargs.get("allocated_by", kwargs.get("allocatedBy", "System"))
    else:
        raise ValueError("db and yarn_item_id are required")

    waiting_orders = (
        db.query(Order)
        .join(FabricType)
        .filter(
            Order.status == "AWAITING_YARN",
            FabricType.yarnItemId == yarn_item_id,
        )
        .order_by(Order.deadline.asc())
        .all()
    )

    released = []
    for order in waiting_orders:
        summary = get_yarn_stock_summary(db, yarn_item_id)
        if summary["availableKg"] >= order.yarnRequiredKg:
            order.status = "CONFIRMED"
            order.shortageKg = 0.0

            reserve_movement = StockMovement(
                id=str(uuid.uuid4()),
                yarnItemId=yarn_item_id,
                orderId=order.id,
                type="RESERVE",
                qtyKg=order.yarnRequiredKg,
                reason=f"Auto-allocation for Order {order.orderNo}",
                createdBy=allocated_by,
                createdAt=datetime.now(timezone.utc),
            )
            db.add(reserve_movement)
            create_work_orders_for_order(order.id, order.qtyMetres, db)
            db.flush()

            released.append({
                "orderId": order.id,
                "orderNo": order.orderNo,
                "qtyMetres": order.qtyMetres,
            })

    db.commit()
    return released
