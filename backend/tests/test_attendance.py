import pytest
from app.models.entities import Employee, Attendance


def test_attendance_business_rules_and_role_permissions(client, owner_headers, office_headers, db_session):
    # Fetch a target employee
    emp = db_session.query(Employee).first()
    assert emp is not None

    test_date = "2026-12-01"

    # Clean up existing test attendance if any
    db_session.query(Attendance).filter(
        Attendance.employeeId == emp.id, Attendance.date == test_date
    ).delete()
    db_session.commit()

    # Rule 1: Negative overtime is rejected with 400
    res_neg = client.post(
        "/api/v1/people/attendance",
        headers=office_headers,
        json={
            "employeeId": emp.id,
            "date": test_date,
            "shift": "MORNING",
            "status": "PRESENT",
            "overtimeHours": -2.5,
        },
    )
    assert res_neg.status_code == 400
    assert "cannot be negative" in res_neg.json()["detail"]

    # Rule 2: Non-ADMINISTRATOR (MANAGER / office_headers) can submit attendance ONCE
    res_submit = client.post(
        "/api/v1/people/attendance",
        headers=office_headers,
        json={
            "employeeId": emp.id,
            "date": test_date,
            "shift": "MORNING",
            "status": "PRESENT",
            "overtimeHours": 2.0,
        },
    )
    assert res_submit.status_code == 200
    assert res_submit.json()["success"] is True

    # Rule 3: Non-ADMINISTRATOR cannot edit/resubmit locked attendance record (403 Forbidden)
    res_re_submit = client.post(
        "/api/v1/people/attendance",
        headers=office_headers,
        json={
            "employeeId": emp.id,
            "date": test_date,
            "shift": "EVENING",
            "status": "PRESENT",
            "overtimeHours": 3.0,
        },
    )
    assert res_re_submit.status_code == 403
    assert "locked" in res_re_submit.json()["detail"].lower()

    # Rule 4: ADMINISTRATOR (owner_headers) CAN modify and correct locked attendance record
    res_admin_update = client.post(
        "/api/v1/people/attendance",
        headers=owner_headers,
        json={
            "employeeId": emp.id,
            "date": test_date,
            "shift": "NIGHT",
            "status": "PRESENT",
            "overtimeHours": 4.0,
        },
    )
    assert res_admin_update.status_code == 200
    assert res_admin_update.json()["success"] is True

    # Rule 5: ABSENT status automatically forces overtime to 0.0
    res_absent = client.post(
        "/api/v1/people/attendance",
        headers=owner_headers,
        json={
            "employeeId": emp.id,
            "date": test_date,
            "shift": "MORNING",
            "status": "ABSENT",
            "overtimeHours": 5.0,  # Should be forced to 0.0
        },
    )
    assert res_absent.status_code == 200

    # Verify state via GET API endpoint
    res_get = client.get(
        f"/api/v1/people?date={test_date}",
        headers=owner_headers,
    )
    assert res_get.status_code == 200
    emp_record = next((e for e in res_get.json()["employees"] if e["id"] == emp.id), None)
    assert emp_record is not None
    assert emp_record["currentAttendance"] is not None
    assert emp_record["currentAttendance"]["status"] == "ABSENT"
    assert emp_record["currentAttendance"]["overtimeHours"] == 0.0

    # Clean up test attendance
    from app.db.session import SessionLocal
    with SessionLocal() as db:
        db.query(Attendance).filter(
            Attendance.employeeId == emp.id, Attendance.date == test_date
        ).delete()
        db.commit()
