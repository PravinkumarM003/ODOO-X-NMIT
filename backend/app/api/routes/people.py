from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_

from app.db.session import get_db
from app.models.entities import Employee, Attendance
from app.core.dependencies import require_role
from app.services.finance_service import mark_attendance

router = APIRouter(prefix="/people", tags=["People & Attendance"])


class MarkAttendanceRequest(BaseModel):
    employeeId: str
    date: str
    shift: str = "MORNING"
    status: str = "PRESENT"
    overtimeHours: float = 0.0
    checkIn: Optional[str] = None
    checkOut: Optional[str] = None


@router.get("")
def get_people_data(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("empNo"),
    sort_order: Optional[str] = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR", "MECHANIC", "DISPATCH_OFFICER"])),
):
    selected_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    query = select(Employee)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Employee.name).like(search_term),
                func.lower(Employee.empNo).like(search_term),
                func.lower(Employee.department).like(search_term),
                func.lower(Employee.jobTitle).like(search_term)
            )
        )
    
    if department and department != "ALL":
        query = query.where(Employee.department == department)

    sort_col_map = {
        "empNo": Employee.empNo,
        "name": Employee.name,
        "department": Employee.department,
        "jobTitle": Employee.jobTitle,
        "dailyWage": Employee.dailyWage,
        "dailyWages": Employee.dailyWage,
        "createdAt": Employee.id,
    }
    target_col = sort_col_map.get(sort_by, Employee.empNo)
    direction = sort_order.lower() if sort_order else "asc"
    order_clause = target_col.asc() if direction == "asc" else target_col.desc()

    query = query.order_by(order_clause, Employee.id.desc())

    total = db.scalar(select(func.count()).select_from(query.with_only_columns(Employee.id).subquery())) or 0

    employees = db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    page_emp_ids = [emp.id for emp in employees]

    # Bulk fetch attendances for current page to prevent N+1 queries
    att_map = {}
    if page_emp_ids:
        attendances = db.execute(
            select(Attendance).where(
                Attendance.employeeId.in_(page_emp_ids),
                Attendance.date == selected_date
            )
        ).scalars().all()
        for att in attendances:
            att_map[att.employeeId] = att

    employees_data = []
    for emp in employees:
        att = att_map.get(emp.id)
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
                "id": att.id if att else None,
                "status": att.status if att else "PRESENT",
                "shift": att.shift if att else "MORNING",
                "overtimeHours": att.overtimeHours if att else 0.0,
                "isSubmitted": att is not None,
                "checkIn": att.checkIn.isoformat() if (att and att.checkIn) else None,
                "checkOut": att.checkOut.isoformat() if (att and att.checkOut) else None,
            } if att else None,
        })

    # Summary Statistics for selected date across total active employees
    total_active_emps = db.scalar(select(func.count(Employee.id)).where(Employee.active == True)) or 0
    
    summary_query = select(Attendance.status, func.count(Attendance.id)).where(Attendance.date == selected_date).group_by(Attendance.status)
    if department and department != "ALL":
        summary_query = summary_query.join(Employee, Attendance.employeeId == Employee.id).where(Employee.department == department)
        summary_total_emps = db.scalar(select(func.count(Employee.id)).where(Employee.active == True, Employee.department == department)) or 0
    else:
        summary_total_emps = total_active_emps

    summary_counts = dict(db.execute(summary_query).all())
    present_cnt = summary_counts.get("PRESENT", 0)
    absent_cnt = summary_counts.get("ABSENT", 0)
    leave_cnt = summary_counts.get("LEAVE", 0)
    
    att_rate = round((present_cnt / summary_total_emps * 100), 1) if summary_total_emps > 0 else 0.0

    return {
        "employees": employees_data,
        "selectedDate": selected_date,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "userRole": current_user.role,
        "summary": {
            "totalEmployees": summary_total_emps,
            "present": present_cnt,
            "absent": absent_cnt,
            "onLeave": leave_cnt,
            "attendancePercentage": att_rate,
        }
    }


@router.post("/attendance")
def mark_attendance_people_endpoint(
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

