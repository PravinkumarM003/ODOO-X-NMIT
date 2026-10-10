from typing import Optional
from pydantic import BaseModel


class CreateBuyerRequest(BaseModel):
    name: str
    contactPerson: str
    email: str
    phone: str
    address: str


class CreateSupplierRequest(BaseModel):
    name: str
    contactPerson: str
    phone: str


class MarkSupplierBillPaidRequest(BaseModel):
    billId: str
    paidAt: Optional[str] = None
