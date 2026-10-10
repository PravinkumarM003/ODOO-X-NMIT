from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
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
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    buyers = db.execute(select(Buyer).order_by(Buyer.name.asc())).scalars().all()

    result = []
    for b in buyers:
        total_invoiced = 0.0
        total_paid = 0.0

        for ord in b.orders:
            for inv in ord.invoices:
                total_invoiced += inv.amount
                for p in inv.payments:
                    total_paid += p.amount

        outstanding_balance = round(total_invoiced - total_paid, 2)

        result.append({
            "id": b.id,
            "name": b.name,
            "contactPerson": b.contactPerson,
            "email": b.email,
            "phone": b.phone,
            "address": b.address,
            "orderCount": len(b.orders),
            "totalInvoiced": round(total_invoiced, 2),
            "totalPaid": round(total_paid, 2),
            "outstandingBalance": outstanding_balance,
        })

    return result


@router.post("/buyers")
def create_buyer_endpoint(
    req: CreateBuyerRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
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
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    suppliers = db.execute(select(Supplier).order_by(Supplier.name.asc())).scalars().all()

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

    return result


@router.post("/suppliers")
def create_supplier_endpoint(
    req: CreateSupplierRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
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
    current_user=Depends(require_role(["OWNER", "OFFICE"])),
):
    try:
        paid_at = None
        if req and req.paidAt:
            paid_at = datetime.fromisoformat(req.paidAt.replace("Z", "+00:00"))
        bill = mark_supplier_bill_paid(db=db, bill_id=id, paid_at=paid_at)
        return {"success": True, "billId": bill.id, "status": bill.status}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
