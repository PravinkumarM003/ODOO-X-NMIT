from typing import List, Optional
from pydantic import BaseModel


class CreateDispatchRequest(BaseModel):
    orderId: str
    rollIds: List[str]
    truckNo: str
    driverName: str


class RecordPaymentRequest(BaseModel):
    invoiceId: str
    amount: float
    method: str  # BANK, CASH, UPI
    reference: Optional[str] = None
