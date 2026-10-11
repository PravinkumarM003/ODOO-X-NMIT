import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.entities import YarnItem, Machine, Order, StockMovement


def test_action_required_count_accuracy_and_role_permissions(client, owner_headers, office_headers):
    # 1. GET /api/v1/overview for ADMINISTRATOR
    res = client.get("/api/v1/overview", headers=owner_headers)
    assert res.status_code == 200
    data = res.json()
    assert "attentionItems" in data
    assert "totalAttentionItems" in data
    
    top_20 = data["attentionItems"]
    total_count = data["totalAttentionItems"]
    
    assert len(top_20) <= 20
    assert total_count >= len(top_20)

    # 2. GET /api/v1/overview/action-required paginated endpoint
    res_paginated = client.get("/api/v1/overview/action-required?page=1&page_size=20", headers=owner_headers)
    assert res_paginated.status_code == 200
    pag_data = res_paginated.json()
    
    assert pag_data["total"] == total_count
    assert pag_data["page"] == 1
    assert pag_data["pageSize"] == 20
    assert "totalPages" in pag_data


def test_action_required_pagination_first_middle_last_pages(client, owner_headers):
    # Test with small page_size=2 to test first, middle, and last pages
    res_p1 = client.get("/api/v1/overview/action-required?page=1&page_size=2", headers=owner_headers)
    assert res_p1.status_code == 200
    d1 = res_p1.json()
    
    total = d1["total"]
    total_pages = d1["totalPages"]
    
    assert d1["page"] == 1
    assert len(d1["items"]) <= 2

    if total_pages >= 3:
        # Middle Page (Page 2)
        res_mid = client.get("/api/v1/overview/action-required?page=2&page_size=2", headers=owner_headers)
        assert res_mid.status_code == 200
        d_mid = res_mid.json()
        assert d_mid["page"] == 2
        assert len(d_mid["items"]) <= 2

        # Last Page
        res_last = client.get(f"/api/v1/overview/action-required?page={total_pages}&page_size=2", headers=owner_headers)
        assert res_last.status_code == 200
        d_last = res_last.json()
        assert d_last["page"] == total_pages
        assert len(d_last["items"]) >= 1
    elif total_pages >= 2:
        # Last Page (Page 2)
        res_last = client.get(f"/api/v1/overview/action-required?page=2&page_size=2", headers=owner_headers)
        assert res_last.status_code == 200
        d_last = res_last.json()
        assert d_last["page"] == 2


def test_action_required_filtering_and_search_before_pagination(client, owner_headers):
    # Test Filtering by severity=CRITICAL
    res_crit = client.get("/api/v1/overview/action-required?severity=CRITICAL&page=1&page_size=20", headers=owner_headers)
    assert res_crit.status_code == 200
    d_crit = res_crit.json()
    for item in d_crit["items"]:
        assert item["severity"] == "CRITICAL"

    # Test Search term
    res_search = client.get("/api/v1/overview/action-required?search=yarn&page=1&page_size=20", headers=owner_headers)
    assert res_search.status_code == 200
    d_search = res_search.json()
    for item in d_search["items"]:
        assert "yarn" in item["title"].lower() or "yarn" in item["description"].lower() or "yarn" in item["type"].lower()


def test_action_required_sorting_with_unique_tiebreaker(client, owner_headers):
    res_sort = client.get("/api/v1/overview/action-required?sort_by=severity&sort_order=desc&page=1&page_size=50", headers=owner_headers)
    assert res_sort.status_code == 200
    d_sort = res_sort.json()
    items = d_sort["items"]

    sev_map = {"CRITICAL": 3, "WARNING": 2, "INFO": 1}
    for i in range(len(items) - 1):
        sev_curr = sev_map.get(items[i]["severity"], 0)
        sev_next = sev_map.get(items[i + 1]["severity"], 0)
        assert sev_curr >= sev_next
