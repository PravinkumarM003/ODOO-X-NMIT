import pytest

def test_global_server_side_sorting_endpoints(client, owner_headers):
    # 1. Test Orders Sorting
    res_orders_asc = client.get("/api/v1/orders?sort_by=qtyMetres&sort_order=asc", headers=owner_headers)
    assert res_orders_asc.status_code == 200
    orders_asc = res_orders_asc.json()["items"]
    if len(orders_asc) > 1:
        assert orders_asc[0]["qtyMetres"] <= orders_asc[1]["qtyMetres"]

    res_orders_desc = client.get("/api/v1/orders?sort_by=qtyMetres&sort_order=desc", headers=owner_headers)
    assert res_orders_desc.status_code == 200
    orders_desc = res_orders_desc.json()["items"]
    if len(orders_desc) > 1:
        assert orders_desc[0]["qtyMetres"] >= orders_desc[1]["qtyMetres"]

    # 2. Test Rolls Sorting
    res_rolls_asc = client.get("/api/v1/rolls?sort_by=lengthMetres&sort_order=asc", headers=owner_headers)
    assert res_rolls_asc.status_code == 200

    # 3. Test People Sorting
    res_people_asc = client.get("/api/v1/people?sort_by=empNo&sort_order=asc", headers=owner_headers)
    assert res_people_asc.status_code == 200
    emps = res_people_asc.json()["employees"]
    if len(emps) > 1:
        assert emps[0]["empNo"] <= emps[1]["empNo"]

    # 4. Test Yarn Sorting
    res_yarn_asc = client.get("/api/v1/yarn?sort_by=code&sort_order=asc", headers=owner_headers)
    assert res_yarn_asc.status_code == 200

    # 5. Test Buyers & Suppliers Sorting
    res_buyers = client.get("/api/v1/buyers?sort_by=name&sort_order=asc", headers=owner_headers)
    assert res_buyers.status_code == 200

    res_suppliers = client.get("/api/v1/suppliers?sort_by=name&sort_order=desc", headers=owner_headers)
    assert res_suppliers.status_code == 200

    # 6. Test Overview Action Items Sorting
    res_overview_sev = client.get("/api/v1/overview?sort_by=severity&sort_order=desc", headers=owner_headers)
    assert res_overview_sev.status_code == 200
    assert "attentionItems" in res_overview_sev.json()
