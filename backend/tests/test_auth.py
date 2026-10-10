def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_login_valid_owner(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@everest.demo", "password": "everest2026"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["role"] == "OWNER"
    assert data["redirectUrl"] == "/overview"


def test_login_valid_buyer(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "buyer.madras@everest.demo", "password": "everest2026"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["user"]["role"] == "BUYER"
    assert data["redirectUrl"] == "/buyer/orders"


def test_login_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@everest.demo", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "password incorrect" in response.json()["detail"]


def test_login_invalid_user(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@everest.demo", "password": "password"},
    )
    assert response.status_code == 401
    assert "user not found" in response.json()["detail"]


def test_get_me_authenticated(client, owner_headers):
    response = client.get("/api/v1/auth/me", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "owner@everest.demo"
    assert data["role"] == "OWNER"


def test_role_authorization_buyer_denied_yarn(client, buyer_headers):
    # Buyer should NOT have access to internal mill yarn endpoint
    response = client.get("/api/v1/yarn", headers=buyer_headers)
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]
