from typing import List, Optional
from pydantic import BaseModel


class RollLengthItem(BaseModel):
    lengthMetres: float


class RegisterRollsRequest(BaseModel):
    orderId: str
    rolls: List[RollLengthItem]


class InspectRollRequest(BaseModel):
    rollId: str
    result: str  # PASSED, REWORK, REJECTED
    defectType: Optional[str] = None  # HOLE, COLOUR_MISMATCH, UNEVEN_WEAVE, OTHER
    severity: Optional[str] = None    # MINOR, MAJOR, CRITICAL
    notes: Optional[str] = None
