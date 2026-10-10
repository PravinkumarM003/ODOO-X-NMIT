from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.entities import Buyer, Supplier, SupplierBill


def create_buyer(
    db: Session,
    name: str,
    contact_person: str,
    email: str,
    phone: str,
    address: str,
) -> Buyer:
    if not name or not email:
        raise ValueError("Name and email are required")

    buyer = Buyer(
        name=name.strip(),
        contactPerson=contact_person.strip(),
        email=email.strip().lower(),
        phone=phone.strip(),
        address=address.strip(),
    )
    db.add(buyer)
    db.commit()
    db.refresh(buyer)
    return buyer


def create_supplier(
    db: Session,
    name: str,
    contact_person: str,
    phone: str,
) -> Supplier:
    if not name:
        raise ValueError("Supplier name is required")

    supplier = Supplier(
        name=name.strip(),
        contactPerson=contact_person.strip(),
        phone=phone.strip(),
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def mark_supplier_bill_paid(
    db: Session,
    bill_id: str,
    paid_at: Optional[datetime] = None,
) -> SupplierBill:
    bill = db.execute(select(SupplierBill).where(SupplierBill.id == bill_id)).scalar_one_or_none()
    if not bill:
        raise ValueError(f"Supplier bill {bill_id} not found")

    bill.status = "PAID"
    bill.paidAt = paid_at or datetime.now(timezone.utc)
    db.commit()
    db.refresh(bill)
    return bill
