from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import require_role
from app.services.finance_service import (
    get_monthly_finance,
    mark_attendance,
    close_month_wages,
    mark_wages_paid,
)
from app.schemas.finance import (
    MarkAttendanceRequest,
    CloseMonthWagesRequest,
    MarkWagesPaidRequest,
)

router = APIRouter(prefix="/finance", tags=["Finance & Wages"])


@router.get("")
def get_finance_data(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER"])),
):
    if not month:
        now = datetime.now(timezone.utc)
        month = f"{now.year}-{str(now.month).zfill(2)}"

    try:
        data = get_monthly_finance(db, month)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/attendance")
def mark_attendance_endpoint(
    req: MarkAttendanceRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
    try:
        att = mark_attendance(
            db=db,
            employee_id=req.employeeId,
            date=req.date,
            shift=req.shift,
            status=req.status,
            overtime_hours=req.overtimeHours or 0.0,
            check_in=req.checkIn,
            check_out=req.checkOut,
            user_role=current_user.role,
        )
        return {"success": True, "attendanceId": att.id}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/wages/close")
def close_month_wages_endpoint(
    req: CloseMonthWagesRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR"])),
):
    try:
        wages = close_month_wages(
            db=db,
            month=req.month,
            closed_by=current_user.name,
        )
        return {"success": True, "count": len(wages)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/wages/pay")
def mark_wages_paid_endpoint(
    req: MarkWagesPaidRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR"])),
):
    try:
        paid_at = datetime.fromisoformat(req.paidAt.replace("Z", "+00:00")) if req.paidAt else datetime.now(timezone.utc)
        count = mark_wages_paid(
            db=db,
            month=req.month,
            paid_at=paid_at,
            payment_method=req.paymentMethod or "BANK",
            employee_id=req.employeeId,
            payment_reference=req.paymentReference,
        )
        return {"success": True, "count": count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
