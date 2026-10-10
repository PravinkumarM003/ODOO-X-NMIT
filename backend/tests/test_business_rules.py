import pytest
from app.services.order_service import calculate_yarn_requirement
from app.services.yarn_service import get_yarn_stock_summary
from app.models.entities import FabricType, YarnItem, Order, Roll, WorkOrder


def test_yarn_requirement_calculation(db_session):
    # BR-04: Calculate yarn required = qtyMetres * yarnKgPerMetre * 1.05
    ft = db_session.query(FabricType).first()
    assert ft is not None
    req = calculate_yarn_requirement(db_session, ft.id, 1000.0)

    expected_kg = round(1000.0 * ft.yarnKgPerMetre * 1.05, 2)
    assert req["yarnRequiredKg"] == expected_kg
    assert "availableKg" in req
    assert "shortageKg" in req
    assert "isAvailable" in req


def test_yarn_stock_invariants(db_session):
    # BR-02: onHand = receipts - consumes + adjusts; available = onHand - reserves
    item = db_session.query(YarnItem).first()
    assert item is not None
    summary = get_yarn_stock_summary(db_session, item.id)

    assert summary.on_hand_kg >= 0
    assert summary.reserved_kg >= 0
    assert summary.health in ["OK", "LOW", "OUT"]


def test_dispatch_requires_passed_rolls(client, office_headers, db_session):
    # BR-15: Selected rolls must be PASSED and IN_STORE
    rework_or_rejected = db_session.query(Roll).filter(Roll.qcStatus.in_(["REJECTED", "REWORK"])).first()
    if rework_or_rejected:
        order = rework_or_rejected.order
        response = client.post(
            "/api/v1/dispatch/create",
            headers=office_headers,
            json={
                "orderId": order.id,
                "rollIds": [rework_or_rejected.id],
                "truckNo": "TN-38-AX-9999",
                "driverName": "Ramesh",
            },
        )
        assert response.status_code == 400
        assert "cannot be dispatched" in response.json()["detail"] or "not ready for dispatch" in response.json()["detail"]


def test_cancel_order_requires_reason(client, office_headers, db_session):
    # BR-07: Cancellation requires min 5 chars reason
    order = db_session.query(Order).filter(Order.status == "NEW").first()
    if not order:
        order = db_session.query(Order).filter(Order.status == "AWAITING_YARN").first()

    if order:
        response = client.post(
            f"/api/v1/orders/{order.id}/cancel",
            headers=office_headers,
            json={"cancelReason": "bad"},  # too short
        )
        assert response.status_code == 400
        assert "minimum 5 characters" in response.json()["detail"]
