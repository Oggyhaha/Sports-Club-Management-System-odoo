from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_returns_200():
    """Verify that the health check endpoint is reachable and returns status 200 with healthy payload."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "champions-club-api"
    assert data["version"] == "1.0.0"


def test_root_endpoint_returns_welcome():
    """Verify that the root endpoint directs callers to documentation."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["docs_url"] == "/docs"
    assert data["health_check"] == "/api/v1/health"
