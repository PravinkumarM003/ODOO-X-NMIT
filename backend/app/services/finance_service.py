from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.entities import (
    Employee,
    Attendance,
    WageSummary,
    Order,
    StockMovement,
    WorkOrder,
    ProductionLog,
    Machine,
    Payment,
    SupplierBill,
    Invoice,
)


def mark_attendance(
    db: Session,
    employee_id: str,
    date: str,
    shift: str,
    status: str,
    overtime_hours: float = 0.0,
) -> Attendance:
    att = db.execute(
        select(Attendance).where(Attendance.employeeId == employee_id, Attendance.date == date)
    ).scalar_one_or_none()

    if att:
        att.shift = shift
        att.status = status
        att.overtimeHours = overtime_hours
    else:
        att = Attendance(
            employeeId=employee_id,
            date=date,
            shift=shift,
            status=status,
            overtimeHours=overtime_hours,
        )
        db.add(att)

    db.commit()
    db.refresh(att)
    return att


def get_monthly_wages(db: Session, month: str) -> List[Dict[str, Any]]:
    employees = db.execute(select(Employee).order_by(Employee.empNo.asc())).scalars().all()

    result = []
    for emp in employees:
        attendances = db.execute(
            select(Attendance).where(
                Attendance.employeeId == emp.id,
                Attendance.date.startswith(month)
            )
        ).scalars().all()

        summary = db.execute(
            select(WageSummary).where(
                WageSummary.employeeId == emp.id,
                WageSummary.month == month
            )
        ).scalar_one_or_none()

        days_present = sum(1 for a in attendances if a.status == "PRESENT")
        overtime_hours = sum(a.overtimeHours for a in attendances)
        calculated_amount = round(
            (days_present * emp.dailyWage + overtime_hours * emp.overtimeRatePerHour), 2
        )

        state = "Calculated"
        if summary:
            if summary.paidAt:
                state = "Paid"
            else:
                state = "Closed (not recorded as paid)"

        result.append({
            "employeeId": emp.id,
            "empNo": emp.empNo,
            "name": emp.name,
            "department": emp.department,
            "jobTitle": emp.jobTitle,
            "dailyWage": emp.dailyWage,
            "overtimeRatePerHour": emp.overtimeRatePerHour,
            "daysPresent": summary.daysPresent if summary else days_present,
            "overtimeHours": summary.overtimeHours if summary else overtime_hours,
            "amount": summary.amount if summary else calculated_amount,
            "summaryId": summary.id if summary else None,
            "state": state,
            "closedAt": summary.closedAt.isoformat() if summary and summary.closedAt else None,
            "paidAt": summary.paidAt.isoformat() if summary and summary.paidAt else None,
            "paidAmount": summary.paidAmount if summary else None,
            "paymentMethod": summary.paymentMethod if summary else None,
            "paymentReference": summary.paymentReference if summary else None,
        })

    return result


def close_month_wages(db: Session, month: str, closed_by: str) -> List[Dict[str, Any]]:
    wages = get_monthly_wages(db, month)
    now = datetime.now(timezone.utc)

    for w in wages:
        summary = db.execute(
            select(WageSummary).where(
                WageSummary.employeeId == w["employeeId"],
                WageSummary.month == month
            )
        ).scalar_one_or_none()

        if summary:
            summary.daysPresent = w["daysPresent"]
            summary.overtimeHours = w["overtimeHours"]
            summary.amount = w["amount"]
            summary.closedAt = now
            summary.closedBy = closed_by
        else:
            summary = WageSummary(
                employeeId=w["employeeId"],
                month=month,
                daysPresent=w["daysPresent"],
                overtimeHours=w["overtimeHours"],
                amount=w["amount"],
                closedAt=now,
                closedBy=closed_by,
            )
            db.add(summary)

    db.commit()
    return get_monthly_wages(db, month)


def mark_wages_paid(
    db: Session,
    month: str,
    paid_at: datetime,
    payment_method: str,
    employee_id: Optional[str] = None,
    payment_reference: Optional[str] = None,
) -> int:
    query = select(WageSummary).where(WageSummary.month == month, WageSummary.paidAt == None)
    if employee_id:
        query = query.where(WageSummary.employeeId == employee_id)

    summaries = db.execute(query).scalars().all()
    for s in summaries:
        s.paidAt = paid_at
        s.paidAmount = s.amount
        s.paymentMethod = payment_method
        s.paymentReference = payment_reference

    db.commit()
    return len(summaries)


def get_order_cost(db: Session, order_id: str) -> Dict[str, Any]:
    order = db.execute(select(Order).where(Order.id == order_id)).scalar_one_or_none()
    if not order:
        raise ValueError(f"Order {order_id} not found")

    consume_movements = db.execute(
        select(StockMovement).where(
            StockMovement.orderId == order.id,
            StockMovement.type == "CONSUME"
        )
    ).scalars().all()

    yarn_cost = 0.0
    yarn_consumed_kg = 0.0
    has_missing_yarn_cost = False

    for m in consume_movements:
        yarn_consumed_kg += m.qtyKg
        if m.lot:
            yarn_cost += m.qtyKg * m.lot.unitCostPerKg
        else:
            has_missing_yarn_cost = True

    work_orders = db.execute(select(WorkOrder).where(WorkOrder.orderId == order.id)).scalars().all()
    labour_cost = 0.0
    machine_cost = 0.0
    total_hours = 0.0

    for wo in work_orders:
        machine_rate = wo.machine.hourlyRate if wo.machine else 0.0
        logs = db.execute(select(ProductionLog).where(ProductionLog.workOrderId == wo.id)).scalars().all()
        for log in logs:
            total_hours += log.hours
            hourly_wage = (log.employee.dailyWage / 8.0) if log.employee else 0.0
            labour_cost += log.hours * hourly_wage
            machine_cost += log.hours * machine_rate

    yarn_cost = round(yarn_cost, 2)
    labour_cost = round(labour_cost, 2)
    machine_cost = round(machine_cost, 2)
    total_cost = round(yarn_cost + labour_cost + machine_cost, 2)

    invoices = db.execute(select(Invoice).where(Invoice.orderId == order.id)).scalars().all()
    invoiced_revenue = round(sum(inv.amount for inv in invoices), 2)
    margin = round(invoiced_revenue - total_cost, 2)

    rolls = order.rolls
    total_registered_metres = round(sum(r.lengthMetres for r in rolls), 2)
    passed_metres = round(sum(r.lengthMetres for r in rolls if r.qcStatus == "PASSED"), 2)

    cost_per_good_metre = round(total_cost / passed_metres, 2) if passed_metres > 0 else None
    is_complete = order.status == "COMPLETED"
    is_cost_incomplete = (not is_complete) or has_missing_yarn_cost or (yarn_consumed_kg == 0)

    return {
        "orderId": order.id,
        "orderNo": order.orderNo,
        "yarnCost": yarn_cost,
        "yarnConsumedKg": round(yarn_consumed_kg, 2),
        "labourCost": labour_cost,
        "machineCost": machine_cost,
        "totalHours": round(total_hours, 2),
        "totalCost": total_cost,
        "invoicedRevenue": invoiced_revenue,
        "margin": margin,
        "totalRegisteredMetres": total_registered_metres,
        "passedMetres": passed_metres,
        "costPerGoodMetre": cost_per_good_metre,
        "isCostIncomplete": is_cost_incomplete,
    }


def calculate_order_risk(order: Any, now: Optional[datetime] = None) -> Dict[str, str]:
    if now is None:
        now = datetime.now(timezone.utc)

    if order.status in ["COMPLETED", "CANCELLED"]:
        return {"risk": "ON_TRACK", "reason": ""}

    deadline = order.deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    if deadline < now:
        return {
            "risk": "OVERDUE",
            "reason": f"Deadline passed ({deadline.strftime('%Y-%m-%d')})",
        }

    stage_estimates = {
        "SPINNING": 2,
        "WEAVING": 3,
        "DYEING": 2,
    }
    estimated_days = 1  # QC day

    for wo in order.workOrders:
        if wo.status != "COMPLETED":
            estimated_days += stage_estimates.get(wo.stage, 2)

    days_to_deadline = max(0.0, (deadline - now).total_seconds() / 86400.0)

    if days_to_deadline < estimated_days:
        return {
            "risk": "AT_RISK",
            "reason": f"{days_to_deadline:.1f} days left vs ~{estimated_days} days required",
        }

    if order.status == "AWAITING_YARN":
        return {
            "risk": "AT_RISK",
            "reason": "Waiting for raw material arrival",
        }

    has_blocked = any(wo.status == "BLOCKED" for wo in order.workOrders)
    if has_blocked:
        return {
            "risk": "AT_RISK",
            "reason": "Work order blocked due to machine breakdown",
        }

    has_rework = any(r.qcStatus == "REWORK" for r in order.rolls)
    if has_rework and days_to_deadline < 2:
        return {
            "risk": "AT_RISK",
            "reason": f"Has rework rolls with only {days_to_deadline:.1f} days remaining",
        }

    if len(order.rolls) > 0 and all(r.qcStatus == "REJECTED" for r in order.rolls):
        return {
            "risk": "AT_RISK",
            "reason": "All registered rolls were rejected in QC (no shippable fabric)",
        }

    return {"risk": "ON_TRACK", "reason": ""}


def get_monthly_finance(db: Session, month: str) -> Dict[str, Any]:
    start_of_month = datetime.strptime(f"{month}-01", "%Y-%m-%d").replace(tzinfo=timezone.utc)
    parts = month.split("-")
    year = int(parts[0])
    m = int(parts[1])
    if m == 12:
        next_month_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        next_month_date = datetime(year, m + 1, 1, tzinfo=timezone.utc)

    # 1. CASH IN: Payments received in month
    payments = db.execute(
        select(Payment).where(
            Payment.receivedAt >= start_of_month,
            Payment.receivedAt < next_month_date
        )
    ).scalars().all()
    cash_in = round(sum(p.amount for p in payments), 2)

    # 2. CASH OUT: Paid SupplierBills + Paid WageSummary in month
    paid_supplier_bills = db.execute(
        select(SupplierBill).where(
            SupplierBill.status == "PAID",
            SupplierBill.paidAt >= start_of_month,
            SupplierBill.paidAt < next_month_date
        )
    ).scalars().all()
    supplier_cash_out = round(sum(b.amount for b in paid_supplier_bills), 2)

    paid_wages = db.execute(
        select(WageSummary).where(
            WageSummary.paidAt != None,
            WageSummary.paidAt >= start_of_month,
            WageSummary.paidAt < next_month_date
        )
    ).scalars().all()
    wage_cash_out = round(sum(w.paidAmount if w.paidAmount is not None else w.amount for w in paid_wages), 2)

    cash_out = round(supplier_cash_out + wage_cash_out, 2)
    net_cash_movement = round(cash_in - cash_out, 2)

    # 3. OUTSTANDING OBLIGATIONS & RECEIVABLES (Labelled "Not cash")
    unpaid_supplier_bills = db.execute(
        select(SupplierBill).where(SupplierBill.status == "UNPAID")
    ).scalars().all()
    unpaid_supplier_bills_total = round(sum(b.amount for b in unpaid_supplier_bills), 2)

    all_month_wages = get_monthly_wages(db, month)
    unpaid_wages_list = [w for w in all_month_wages if w["state"] != "Paid"]
    unpaid_wages_total = round(sum(w["amount"] for w in unpaid_wages_list), 2)

    unpaid_invoices = db.execute(
        select(Invoice).where(Invoice.status.in_(["UNPAID", "PARTIAL"]))
    ).scalars().all()
    unpaid_invoices_total = 0.0
    for inv in unpaid_invoices:
        paid_amt = sum(p.amount for p in inv.payments)
        unpaid_invoices_total += (inv.amount - paid_amt)
    unpaid_invoices_total = round(unpaid_invoices_total, 2)

    # 4. Machine output for the month
    machines = db.execute(select(Machine)).scalars().all()
    machine_outputs = []
    for mach in machines:
        metres = 0.0
        hours = 0.0
        for wo in mach.workOrders:
            logs = db.execute(
                select(ProductionLog).where(
                    ProductionLog.workOrderId == wo.id,
                    ProductionLog.loggedAt >= start_of_month,
                    ProductionLog.loggedAt < next_month_date
                )
            ).scalars().all()
            for log in logs:
                metres += log.qtyMetres
                hours += log.hours

        machine_outputs.append({
            "machineId": mach.id,
            "code": mach.code,
            "type": mach.type,
            "status": mach.status,
            "metresProduced": round(metres, 2),
            "hoursWorked": round(hours, 2),
        })

    # 5. Order costing list for completed / active orders
    orders = db.execute(
        select(Order).where(Order.status != "CANCELLED")
    ).scalars().all()

    order_costings = []
    total_invoiced_revenue = 0.0
    total_order_cost = 0.0

    for ord in orders:
        cost = get_order_cost(db, ord.id)
        cost_with_meta = {
            **cost,
            "buyerName": ord.buyer.name if ord.buyer else "",
            "fabricName": ord.fabricType.name if ord.fabricType else "",
            "status": ord.status,
        }
        order_costings.append(cost_with_meta)
        total_invoiced_revenue += cost["invoicedRevenue"]
        total_order_cost += cost["totalCost"]

    order_margin = round(total_invoiced_revenue - total_order_cost, 2)

    return {
        "month": month,
        "cashIn": cash_in,
        "cashOut": cash_out,
        "supplierCashOut": supplier_cash_out,
        "wageCashOut": wage_cash_out,
        "netCashMovement": net_cash_movement,
        "payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "method": p.method,
                "receivedAt": p.receivedAt.isoformat(),
                "reference": p.reference,
                "invoice": {
                    "id": p.invoice.id,
                    "invoiceNo": p.invoice.invoiceNo,
                    "buyerName": p.invoice.order.buyer.name if p.invoice.order and p.invoice.order.buyer else "",
                    "orderNo": p.invoice.order.orderNo if p.invoice.order else "",
                } if p.invoice else None,
            }
            for p in payments
        ],
        "paidSupplierBills": [
            {
                "id": b.id,
                "billNo": b.billNo,
                "amount": b.amount,
                "supplierName": b.supplier.name if b.supplier else "",
                "paidAt": b.paidAt.isoformat() if b.paidAt else None,
            }
            for b in paid_supplier_bills
        ],
        "paidWages": [
            {
                "id": w.id,
                "empNo": w.employee.empNo if w.employee else "",
                "name": w.employee.name if w.employee else "",
                "amount": w.amount,
                "paidAmount": w.paidAmount,
                "paidAt": w.paidAt.isoformat() if w.paidAt else None,
            }
            for w in paid_wages
        ],
        "unpaidSupplierBills": [
            {
                "id": b.id,
                "billNo": b.billNo,
                "amount": b.amount,
                "supplierName": b.supplier.name if b.supplier else "",
                "billedAt": b.billedAt.isoformat() if b.billedAt else None,
            }
            for b in unpaid_supplier_bills
        ],
        "unpaidSupplierBillsTotal": unpaid_supplier_bills_total,
        "unpaidWagesList": unpaid_wages_list,
        "unpaidWagesTotal": unpaid_wages_total,
        "unpaidInvoices": [
            {
                "id": inv.id,
                "invoiceNo": inv.invoiceNo,
                "amount": inv.amount,
                "balance": round(inv.amount - sum(p.amount for p in inv.payments), 2),
                "buyerName": inv.order.buyer.name if inv.order and inv.order.buyer else "",
                "orderNo": inv.order.orderNo if inv.order else "",
            }
            for inv in unpaid_invoices
        ],
        "unpaidInvoicesTotal": unpaid_invoices_total,
        "machineOutputs": machine_outputs,
        "orderCostings": order_costings,
        "totalInvoicedRevenue": round(total_invoiced_revenue, 2),
        "totalOrderCost": round(total_order_cost, 2),
        "orderMargin": order_margin,
    }
