from typing import Optional
from pydantic import BaseModel


class MarkAttendanceRequest(BaseModel):
    employeeId: str
    date: str  # YYYY-MM-DD
    shift: str  # MORNING, EVENING, NIGHT
    status: str  # PRESENT, ABSENT, LEAVE
    overtimeHours: Optional[float] = 0.0
    checkIn: Optional[str] = None
    checkOut: Optional[str] = None


class CloseMonthWagesRequest(BaseModel):
    month: str  # YYYY-MM


class MarkWagesPaidRequest(BaseModel):
    month: str  # YYYY-MM
    employeeId: Optional[str] = None
    paidAt: Optional[str] = None
    paymentMethod: Optional[str] = "BANK"
    paymentReference: Optional[str] = None
