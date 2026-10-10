from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import Employee, Attendance
from app.core.dependencies import require_role

router = APIRouter(prefix="/people", tags=["People & Attendance"])


@router.get("")
def get_people_data(
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["OWNER", "OFFICE", "FLOOR"])),
):
    selected_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    employees = db.execute(select(Employee).order_by(Employee.empNo.asc())).scalars().all()

    employees_data = []
    for emp in employees:
        att = db.execute(
            select(Attendance).where(
                Attendance.employeeId == emp.id,
                Attendance.date == selected_date
            )
        ).scalar_one_or_none()

        employees_data.append({
            "id": emp.id,
            "empNo": emp.empNo,
            "name": emp.name,
            "department": emp.department,
            "jobTitle": emp.jobTitle,
            "dailyWage": emp.dailyWage,
            "overtimeRatePerHour": emp.overtimeRatePerHour,
            "active": emp.active,
            "currentAttendance": {
                "status": att.status,
                "shift": att.shift,
                "overtimeHours": att.overtimeHours,
            } if att else None,
        })

    return {
        "employees": employees_data,
        "selectedDate": selected_date,
    }
