def test_yarn_endpoints(client, owner_headers):
    # Test GET /yarn
    response = client.get("/api/v1/yarn", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) == 5  # 5 deterministic yarn items in seed
    assert "suppliers" in data
    assert "orders" in data

    # Test GET /yarn/{id}
    first_item_id = data["items"][0]["id"]
    detail_res = client.get(f"/api/v1/yarn/{first_item_id}", headers=owner_headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert "stock" in detail_data
    assert "lots" in detail_data
    assert "movements" in detail_data


def test_orders_endpoints(client, office_headers):
    # Test GET /orders
    response = client.get("/api/v1/orders", headers=office_headers)
    assert response.status_code == 200
    orders = response.json()
    assert len(orders["items"]) >= 11  # 11 deterministic orders in seed

    # Test GET /orders/check-yarn
    first_order_id = orders["items"][0]["id"]
    order_detail_res = client.get(f"/api/v1/orders/{first_order_id}", headers=office_headers)
    assert order_detail_res.status_code == 200
    detail = order_detail_res.json()
    assert "order" in detail
    assert "progress" in detail
    assert "cost" in detail
    assert "risk" in detail


def test_production_board_endpoint(client, floor_headers):
    response = client.get("/api/v1/production/board", headers=floor_headers)
    assert response.status_code == 200
    data = response.json()
    assert "machines" in data
    assert len(data["machines"]) == 8  # 8 machines in seed
    assert "queuedWorkOrders" in data
    assert "employees" in data


def test_rolls_and_store_view(client, floor_headers):
    response = client.get("/api/v1/rolls", headers=floor_headers)
    assert response.status_code == 200
    data = response.json()
    assert "store" in data
    assert "shelf" in data["store"]
    assert "awaitingQC" in data["store"]
    assert "quarantined" in data["store"]
    assert "dispatched" in data["store"]


def test_dispatch_endpoint(client, office_headers):
    response = client.get("/api/v1/dispatch", headers=office_headers)
    assert response.status_code == 200
    data = response.json()
    assert "readyOrders" in data
    assert "dispatches" in data
    assert "invoices" in data


def test_finance_endpoint(client, owner_headers):
    response = client.get("/api/v1/finance", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert "cashIn" in data
    assert "cashOut" in data
    assert "netCashMovement" in data
    assert "unpaidSupplierBills" in data
    assert "unpaidInvoices" in data
    assert "orderCostings" in data


def test_overview_endpoint(client, owner_headers):
    response = client.get("/api/v1/overview", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert "attentionItems" in data
    assert "summaryTiles" in data
    assert "pipeline" in data
    assert "todayOutputs" in data
    assert "recentEvents" in data


def test_notifications_endpoint(client, floor_headers):
    response = client.get("/api/v1/notifications", headers=floor_headers)
    assert response.status_code == 200
    notifications = response.json()
    assert isinstance(notifications, list)


def test_buyer_portal_endpoints(client, buyer_headers):
    # GET /buyer/orders
    response = client.get("/api/v1/buyer/orders", headers=buyer_headers)
    assert response.status_code == 200
    data = response.json()
    assert "orders" in data
    assert "fabricTypes" in data

    # GET /buyer/invoices
    inv_response = client.get("/api/v1/buyer/invoices", headers=buyer_headers)
    assert inv_response.status_code == 200
    assert "items" in inv_response.json()
    assert isinstance(inv_response.json()["items"], list)
