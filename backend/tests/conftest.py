import sys
from pathlib import Path
import pytest

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.models.entities import User


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def owner_headers(db_session):
    user = db_session.query(User).filter(User.role == "ADMINISTRATOR").first()
    token = create_access_token({
        "userId": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "buyerId": user.buyerId,
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def office_headers(db_session):
    user = db_session.query(User).filter(User.role == "MANAGER").first()
    token = create_access_token({
        "userId": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "buyerId": user.buyerId,
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def floor_headers(db_session):
    user = db_session.query(User).filter(User.role == "PRODUCTION_SUPERVISOR").first()
    token = create_access_token({
        "userId": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "buyerId": user.buyerId,
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def buyer_headers(db_session):
    user = db_session.query(User).filter(User.role == "BUYER").first()
    token = create_access_token({
        "userId": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "buyerId": user.buyerId,
    })
    return {"Authorization": f"Bearer {token}"}
