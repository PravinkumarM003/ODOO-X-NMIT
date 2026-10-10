from typing import Optional, List
from pydantic import BaseModel


class CreateOrderRequest(BaseModel):
    buyerId: str
    fabricTypeId: str
    colour: str
    qtyMetres: float
    deadline: str  # ISO string or YYYY-MM-DD
    pricePerMetre: Optional[float] = None
    submittedByBuyer: Optional[bool] = False


class ReviewOrderRequest(BaseModel):
    action: str  # APPROVE, CANCEL
    adjustedPricePerMetre: Optional[float] = None
    cancelReason: Optional[str] = None


class CancelOrderRequest(BaseModel):
    cancelReason: str


class YarnRequirementResponse(BaseModel):
    fabricTypeId: str
    fabricName: str
    yarnItemId: str
    yarnCode: str
    yarnType: str
    yarnRequiredKg: float
    availableKg: float
    shortageKg: float
    isAvailable: bool
