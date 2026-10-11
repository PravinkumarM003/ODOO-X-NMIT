from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Buyer, Supplier, SupplierBill, Order, Invoice, Payment
from app.core.dependencies import require_role
from app.services.buyer_supplier_service import (
    create_buyer,
    create_supplier,
    mark_supplier_bill_paid,
)
from app.schemas.buyer_supplier import (
    CreateBuyerRequest,
    CreateSupplierRequest,
    MarkSupplierBillPaidRequest,
)

router = APIRouter(tags=["Buyers & Suppliers"])


# --- Buyers ---

@router.get("/buyers")
def list_buyers(
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("name"),
    sort_order: Optional[str] = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    query = select(Buyer)
    if search:
        search_term = f"%{search.lower()}%"
        from sqlalchemy import func, or_
        query = query.where(
            or_(
                func.lower(Buyer.name).like(search_term),
                func.lower(Buyer.contactPerson).like(search_term)
            )
        )
    sort_col_map = {
        "name": Buyer.name,
        "contactPerson": Buyer.contactPerson,
        "email": Buyer.email,
        "createdAt": Buyer.id,
    }
    target_col = sort_col_map.get(sort_by, Buyer.name)
    direction = sort_order.lower() if sort_order else "asc"
    order_clause = target_col.asc() if direction == "asc" else target_col.desc()
    query = query.order_by(order_clause, Buyer.id.desc())
    
    from sqlalchemy import func
    total = db.scalar(select(func.count()).select_from(query.with_only_columns(Buyer.id).subquery()))
    buyers = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    buyer_ids = [b.id for b in buyers]
    if buyer_ids:
        order_counts_res = db.execute(
            select(Order.buyerId, func.count(Order.id)).where(Order.buyerId.in_(buyer_ids)).group_by(Order.buyerId)
        ).all()
        order_counts_map = {b_id: count for b_id, count in order_counts_res}

        inv_res = db.execute(
            select(Order.buyerId, func.sum(Invoice.amount))
            .join(Invoice, Invoice.orderId == Order.id)
            .where(Order.buyerId.in_(buyer_ids))
            .group_by(Order.buyerId)
        ).all()
        inv_map = {b_id: float(tot or 0.0) for b_id, tot in inv_res}

        pay_res = db.execute(
            select(Order.buyerId, func.sum(Payment.amount))
            .join(Invoice, Invoice.orderId == Order.id)
            .join(Payment, Payment.invoiceId == Invoice.id)
            .where(Order.buyerId.in_(buyer_ids))
            .group_by(Order.buyerId)
        ).all()
        pay_map = {b_id: float(tot or 0.0) for b_id, tot in pay_res}
    else:
        order_counts_map, inv_map, pay_map = {}, {}, {}

    result = []
    for b in buyers:
        tot_invoiced = round(inv_map.get(b.id, 0.0), 2)
        tot_paid = round(pay_map.get(b.id, 0.0), 2)
        outstanding_balance = round(tot_invoiced - tot_paid, 2)

        result.append({
            "id": b.id,
            "name": b.name,
            "contactPerson": b.contactPerson,
            "email": b.email,
            "phone": b.phone,
            "address": b.address,
            "orderCount": order_counts_map.get(b.id, 0),
            "totalInvoiced": tot_invoiced,
            "totalPaid": tot_paid,
            "outstandingBalance": outstanding_balance,
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "pageSize": page_size
    }


@router.post("/buyers")
def create_buyer_endpoint(
    req: CreateBuyerRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    try:
        buyer = create_buyer(
            db=db,
            name=req.name,
            contact_person=req.contactPerson,
            email=req.email,
            phone=req.phone,
            address=req.address,
        )
        return {"success": True, "buyerId": buyer.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Suppliers ---

@router.get("/suppliers")
def list_suppliers(
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("name"),
    sort_order: Optional[str] = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    query = select(Supplier)
    if search:
        search_term = f"%{search.lower()}%"
        from sqlalchemy import func, or_
        query = query.where(
            or_(
                func.lower(Supplier.name).like(search_term),
                func.lower(Supplier.contactPerson).like(search_term)
            )
        )
    sort_col_map = {
        "name": Supplier.name,
        "contactPerson": Supplier.contactPerson,
        "phone": Supplier.phone,
        "createdAt": Supplier.id,
    }
    target_col = sort_col_map.get(sort_by, Supplier.name)
    direction = sort_order.lower() if sort_order else "asc"
    order_clause = target_col.asc() if direction == "asc" else target_col.desc()
    query = query.order_by(order_clause, Supplier.id.desc())
    
    from sqlalchemy import func
    total = db.scalar(select(func.count()).select_from(query.with_only_columns(Supplier.id).subquery()))
    suppliers = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()

    result = []
    for s in suppliers:
        result.append({
            "id": s.id,
            "name": s.name,
            "contactPerson": s.contactPerson,
            "phone": s.phone,
            "lots": [
                {
                    "id": l.id,
                    "lotCode": l.lotCode,
                    "yarnCode": l.yarnItem.code if l.yarnItem else "",
                    "qtyReceivedKg": l.qtyReceivedKg,
                    "unitCostPerKg": l.unitCostPerKg,
                    "receivedAt": l.receivedAt.isoformat(),
                }
                for l in s.lots
            ],
            "bills": [
                {
                    "id": b.id,
                    "billNo": b.billNo,
                    "amount": b.amount,
                    "status": b.status,
                    "billedAt": b.billedAt.isoformat(),
                    "paidAt": b.paidAt.isoformat() if b.paidAt else None,
                }
                for b in s.bills
            ],
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "pageSize": page_size
    }


@router.post("/suppliers")
def create_supplier_endpoint(
    req: CreateSupplierRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    try:
        supplier = create_supplier(
            db=db,
            name=req.name,
            contact_person=req.contactPerson,
            phone=req.phone,
        )
        return {"success": True, "supplierId": supplier.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/suppliers/bills/{id}/pay")
def pay_supplier_bill_endpoint(
    id: str,
    req: MarkSupplierBillPaidRequest = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    try:
        paid_at = None
        if req and req.paidAt:
            paid_at = datetime.fromisoformat(req.paidAt.replace("Z", "+00:00"))
        bill = mark_supplier_bill_paid(db=db, bill_id=id, paid_at=paid_at)
        return {"success": True, "billId": bill.id, "status": bill.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
