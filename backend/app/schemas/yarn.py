from typing import Optional, List
from pydantic import BaseModel


class ReceiveYarnRequest(BaseModel):
    lotCode: str
    yarnItemId: str
    supplierId: str
    qtyReceivedKg: float
    unitCostPerKg: float
    linkedOrderId: Optional[str] = None
    createSupplierBill: Optional[bool] = False
    billAmount: Optional[float] = None


class AdjustStockRequest(BaseModel):
    lotId: str
    deltaKg: float
    reason: str


class YarnStockSummarySchema(BaseModel):
    yarnItemId: str
    onHandKg: float
    reservedKg: float
    availableKg: float
    thresholdKg: float
    health: str  # OK, LOW, OUT


class LotRemainingSchema(BaseModel):
    lotId: str
    lotCode: str
    yarnItemId: str
    supplierId: str
    supplierName: str
    receivedAt: str
    unitCostPerKg: float
    qtyReceivedKg: float
    remainingKg: float


class YarnItemListItem(BaseModel):
    id: str
    code: str
    yarnType: str
    count: str
    colour: str
    reorderThresholdKg: float
    unit: str
    stock: YarnStockSummarySchema
    shortageAwaitingKg: float
    lotCount: int
