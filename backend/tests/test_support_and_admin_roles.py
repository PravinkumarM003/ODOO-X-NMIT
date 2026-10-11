import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_support_conversations_auth_and_permissions(client, owner_headers, buyer_headers):
    # 1. Unauthenticated request (explicit empty cookies) -> expect 401
    with TestClient(app) as unauth_client:
        unauth_res = unauth_client.get("/api/v1/support/conversations")
        assert unauth_res.status_code == 401
        assert "Authentication required" in unauth_res.json()["detail"]

    # 2. Authenticated ADMINISTRATOR -> expect 200
    admin_res = client.get("/api/v1/support/conversations", headers=owner_headers)
    assert admin_res.status_code == 200
    assert "items" in admin_res.json()

    # 3. Authenticated BUYER -> expect 200 (filtered to buyer's conversations)
    buyer_res = client.get("/api/v1/support/conversations", headers=buyer_headers)
    assert buyer_res.status_code == 200
    assert "items" in buyer_res.json()


def test_administrator_full_endpoint_access(client, owner_headers, buyer_headers):
    # Endpoints that ADMINISTRATOR must be able to access (200 OK)
    admin_endpoints = [
        "/api/v1/overview",
        "/api/v1/people",
        "/api/v1/orders",
        "/api/v1/yarn",
        "/api/v1/production/board",
        "/api/v1/rolls",
        "/api/v1/dispatch",
        "/api/v1/finance",
        "/api/v1/buyers",
        "/api/v1/suppliers",
        "/api/v1/notifications",
        "/api/v1/support/conversations",
    ]

    for ep in admin_endpoints:
        res = client.get(ep, headers=owner_headers)
        assert res.status_code == 200, f"ADMINISTRATOR should have access to {ep}, got {res.status_code}: {res.text}"

    # Verify BUYER gets 403 on staff/admin-only endpoints
    restricted_endpoints_for_buyer = [
        "/api/v1/overview",
        "/api/v1/people",
        "/api/v1/yarn",
        "/api/v1/production/board",
        "/api/v1/rolls",
        "/api/v1/dispatch",
        "/api/v1/finance",
        "/api/v1/buyers",
    ]

    for ep in restricted_endpoints_for_buyer:
        res = client.get(ep, headers=buyer_headers)
        assert res.status_code == 403, f"BUYER should get 403 on {ep}, got {res.status_code}"
