from typing import Optional
from pydantic import BaseModel


class AssignMachineRequest(BaseModel):
    workOrderId: str
    machineId: str


class LogOutputRequest(BaseModel):
    workOrderId: str
    employeeId: str
    qtyMetres: float
    hours: float
    shift: str  # MORNING, EVENING, NIGHT


class CompleteStageRequest(BaseModel):
    workOrderId: str
    stage: str
    actualKgUsed: Optional[float] = None


class ReportBreakdownRequest(BaseModel):
    machineId: str
    reason: str


class ResolveBreakdownRequest(BaseModel):
    machineId: str


class ReassignWorkOrderRequest(BaseModel):
    workOrderId: str
    newMachineId: str
