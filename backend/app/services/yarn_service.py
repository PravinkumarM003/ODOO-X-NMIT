from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app.models.entities import YarnItem, YarnLot, StockMovement, SupplierBill, Supplier, Order


class YarnSummaryResult(dict):
    @property
    def yarn_item_id(self):
        return self.get("yarnItemId", self.get("id"))
    @property
    def on_hand_kg(self):
        return self.get("onHandKg", 0.0)
    @property
    def reserved_kg(self):
        return self.get("reservedKg", 0.0)
    @property
    def available_kg(self):
        return self.get("availableKg", 0.0)
    @property
    def threshold_kg(self):
        return self.get("reorderThresholdKg", 0.0)
    @property
    def health(self):
        return self.get("health", "OK")
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(name)


class LotRemainingResult(dict):
    @property
    def lot_id(self):
        return self.get("lotId", self.get("id"))
    @property
    def lot_code(self):
        return self.get("lotCode")
    @property
    def remaining_kg(self):
        return self.get("remainingKg", 0.0)
    @property
    def supplier_id(self):
        return self.get("supplierId")
    @property
    def supplier_name(self):
        return self.get("supplierName")
    @property
    def received_at(self):
        return self.get("receivedAt")
    @property
    def unit_cost_per_kg(self):
        return self.get("unitCostPerKg", 0.0)
    @property
    def qty_received_kg(self):
        return self.get("qtyReceivedKg", 0.0)
    def __getattr__(self, name):
        try:
            return self[name]
        except KeyError:
            raise AttributeError(name)


def get_yarn_stock_summary(*args, **kwargs) -> YarnSummaryResult:
    if len(args) == 2:
        if isinstance(args[0], Session):
            db = args[0]
            yarn_item_id = args[1]
        else:
            yarn_item_id = args[0]
            db = args[1]
    elif "db" in kwargs and "yarn_item_id" in kwargs:
        db = kwargs["db"]
        yarn_item_id = kwargs["yarn_item_id"]
    else:
        raise ValueError("Both db and yarn_item_id are required")

    item = db.query(YarnItem).filter(YarnItem.id == yarn_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Yarn item not found")

    movements = db.query(StockMovement).filter(StockMovement.yarnItemId == yarn_item_id).all()

    total_receipt = sum(m.qtyKg for m in movements if m.type == "RECEIPT")
    total_consume = sum(m.qtyKg for m in movements if m.type == "CONSUME")
    total_adjust = sum(m.qtyKg for m in movements if m.type == "ADJUST")  # signed delta
    total_reserve = sum(m.qtyKg for m in movements if m.type == "RESERVE")
    total_release = sum(m.qtyKg for m in movements if m.type == "RELEASE")

    # BR-02 formulas
    on_hand = round(total_receipt - total_consume + total_adjust, 2)
    reserved = round(total_reserve - total_release, 2)
    available = round(on_hand - reserved, 2)

    # Health (BR-03)
    if available <= 0:
        health = "OUT"
    elif available < item.reorderThresholdKg:
        health = "LOW"
    else:
        health = "OK"

    return YarnSummaryResult({
        "id": item.id,
        "yarnItemId": item.id,
        "code": item.code,
        "yarnType": item.yarnType,
        "count": item.count,
        "colour": item.colour,
        "reorderThresholdKg": item.reorderThresholdKg,
        "unit": item.unit,
        "onHandKg": max(0.0, on_hand),
        "reservedKg": max(0.0, reserved),
        "availableKg": max(0.0, available),
        "health": health,
    })


def get_lot_remainings(*args, **kwargs) -> List[LotRemainingResult]:
    if len(args) == 2:
        if isinstance(args[0], Session):
            db = args[0]
            yarn_item_id = args[1]
        else:
            yarn_item_id = args[0]
            db = args[1]
    elif "db" in kwargs and "yarn_item_id" in kwargs:
        db = kwargs["db"]
        yarn_item_id = kwargs["yarn_item_id"]
    else:
        raise ValueError("Both db and yarn_item_id are required")

    lots = (
        db.query(YarnLot)
        .filter(YarnLot.yarnItemId == yarn_item_id)
        .order_by(YarnLot.receivedAt.asc())
        .all()
    )

    results = []
    for lot in lots:
        movements = db.query(StockMovement).filter(StockMovement.lotId == lot.id).all()
        consumed = sum(m.qtyKg for m in movements if m.type == "CONSUME")
        adjusted = sum(m.qtyKg for m in movements if m.type == "ADJUST")
        remaining = round(lot.qtyReceivedKg - consumed + adjusted, 2)

        results.append(LotRemainingResult({
            "id": lot.id,
            "lotId": lot.id,
            "lotCode": lot.lotCode,
            "yarnItemId": lot.yarnItemId,
            "supplierId": lot.supplierId,
            "supplierName": lot.supplier.name if lot.supplier else "",
            "qtyReceivedKg": lot.qtyReceivedKg,
            "unitCostPerKg": lot.unitCostPerKg,
            "remainingKg": max(0.0, remaining),
            "receivedAt": lot.receivedAt,
            "linkedOrderId": lot.linkedOrderId,
        }))
    return results


def receive_yarn(*args, **kwargs) -> YarnLot:
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

    qty = float(data.get("qtyReceivedKg", data.get("qty_received_kg", 0)))
    if qty <= 0:
        raise ValueError("Quantity received must be greater than 0 kg")

    unit_cost = float(data.get("unitCostPerKg", data.get("unit_cost_per_kg", 0)))
    if unit_cost < 0:
        raise ValueError("Unit cost cannot be negative")

    lot_code = str(data.get("lotCode", data.get("lot_code", ""))).strip()
    if not lot_code:
        raise ValueError("Lot code is required")

    existing_lot = db.query(YarnLot).filter(YarnLot.lotCode == lot_code).first()
    if existing_lot:
        raise ValueError(f"Lot code {lot_code} already exists")

    yarn_item_id = data.get("yarnItemId", data.get("yarn_item_id"))
    item = db.query(YarnItem).filter(YarnItem.id == yarn_item_id).first()
    if not item:
        raise ValueError("Yarn item not found")

    supplier_id = data.get("supplierId", data.get("supplier_id"))
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise ValueError("Supplier not found")

    linked_order_id = data.get("linkedOrderId", data.get("linked_order_id"))
    received_by = data.get("receivedBy", data.get("received_by", "System"))

    # Create YarnLot
    lot = YarnLot(
        id=str(uuid.uuid4()),
        lotCode=lot_code,
        yarnItemId=yarn_item_id,
        supplierId=supplier_id,
        receivedAt=datetime.now(timezone.utc),
        qtyReceivedKg=qty,
        unitCostPerKg=unit_cost,
        linkedOrderId=linked_order_id,
        receivedBy=received_by,
    )
    db.add(lot)
    db.flush()

    # Create RECEIPT StockMovement
    movement = StockMovement(
        id=str(uuid.uuid4()),
        yarnItemId=yarn_item_id,
        lotId=lot.id,
        orderId=linked_order_id,
        type="RECEIPT",
        qtyKg=qty,
        reason=f"Initial receipt: Lot {lot_code}",
        createdBy=received_by,
        createdAt=datetime.now(timezone.utc),
    )
    db.add(movement)

    # Optional SupplierBill
    if data.get("createSupplierBill", data.get("create_supplier_bill")) or data.get("billAmount", data.get("bill_amount")):
        amount = float(data.get("billAmount", data.get("bill_amount")) or (qty * unit_cost))
        count = db.query(SupplierBill).count()
        bill_no = f"BILL-{str(count + 1).zfill(4)}"
        bill = SupplierBill(
            id=str(uuid.uuid4()),
            billNo=bill_no,
            supplierId=supplier_id,
            lotId=lot.id,
            amount=amount,
            billedAt=datetime.now(timezone.utc),
            status="UNPAID",
        )
        db.add(bill)

    db.commit()
    db.refresh(lot)
    return lot


def adjust_stock(*args, **kwargs) -> StockMovement:
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

    delta = float(data.get("deltaKg", data.get("delta_kg", 0)))
    if delta == 0:
        raise ValueError("Adjustment delta cannot be 0 kg")

    reason = str(data.get("reason", "")).strip()
    if len(reason) < 3:
        raise ValueError("Adjustment requires a valid reason (min 3 characters)")

    lot_id = data.get("lotId", data.get("lot_id"))
    lot = db.query(YarnLot).filter(YarnLot.id == lot_id).first()
    if not lot:
        raise ValueError("Yarn lot not found")

    # Invariant checks (BR-02)
    # 1. Lot remaining cannot go negative
    movements = db.query(StockMovement).filter(StockMovement.lotId == lot.id).all()
    consumed = sum(m.qtyKg for m in movements if m.type == "CONSUME")
    adjusted = sum(m.qtyKg for m in movements if m.type == "ADJUST")
    current_lot_remaining = lot.qtyReceivedKg - consumed + adjusted
    if current_lot_remaining + delta < 0:
        raise ValueError(
            f"Adjustment delta {delta} kg exceeds lot remaining {current_lot_remaining:.2f} kg"
        )

    # 2. Available stock cannot go negative
    summary = get_yarn_stock_summary(db, lot.yarnItemId)
    if summary["availableKg"] + delta < 0:
        raise ValueError(
            f"Adjustment delta {delta} kg would cause available stock to become negative ({summary['availableKg'] + delta:.2f} kg)"
        )

    movement = StockMovement(
        id=str(uuid.uuid4()),
        yarnItemId=lot.yarnItemId,
        lotId=lot.id,
        type="ADJUST",
        qtyKg=delta,  # signed delta
        reason=reason,
        createdBy=data.get("adjustedBy", data.get("adjusted_by", "System")),
        createdAt=datetime.now(timezone.utc),
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement
