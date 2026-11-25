"""Tests for the SQLite authentication & simulation persistence endpoints."""

from fastapi.testclient import TestClient
from backend.main import app


def test_sqlite_signup_login_and_simulations(tmp_path, monkeypatch):
    monkeypatch.setenv("AUTH_DB_PATH", str(tmp_path / "test_auth.db"))
    client = TestClient(app)

    status_res = client.get("/api/auth/status")
    assert status_res.status_code == 200
    assert status_res.json()["connected"] is True

    # 1. Signup
    signup_res = client.post(
        "/api/auth/signup",
        json={"email": "diksha@example.com", "password": "secret123", "full_name": "Diksha Sharma"},
    )
    assert signup_res.status_code == 200
    user = signup_res.json()["user"]
    assert user["email"] == "diksha@example.com"
    assert user["name"] == "Diksha Sharma"

    # 2. Duplicate signup rejected with 409
    dup_res = client.post(
        "/api/auth/signup",
        json={"email": "diksha@example.com", "password": "secret123", "full_name": "Diksha Sharma"},
    )
    assert dup_res.status_code == 409

    # 3. Wrong password rejected with 401
    bad_login = client.post(
        "/api/auth/login",
        json={"email": "diksha@example.com", "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401

    # 4. Correct login succeeds
    ok_login = client.post(
        "/api/auth/login",
        json={"email": "diksha@example.com", "password": "secret123"},
    )
    assert ok_login.status_code == 200
    assert ok_login.json()["user"]["id"] == user["id"]

    # 5. OTP send & verify
    otp_send = client.post("/api/auth/otp/send", json={"identifier": "9876543210"})
    assert otp_send.status_code == 200
    code = otp_send.json()["demo_otp"]
    otp_verify = client.post("/api/auth/otp/verify", json={"identifier": "9876543210", "otp": code})
    assert otp_verify.status_code == 200
    assert otp_verify.json()["user"]["phone"] == "9876543210"

    # 6. Save & retrieve simulation history
    save_res = client.post(
        "/api/auth/simulations",
        json={
            "user_id": user["id"],
            "scenario_id": "vendor_pricing",
            "scenario_title": "Vendor Pricing",
            "status": "accepted",
            "winner": "buyer",
            "total_rounds": 2,
            "total_turns": 3,
            "config": {"id": "vendor_pricing"},
            "turns": [{"agent_id": "buyer", "action": "counter"}],
        },
    )
    assert save_res.status_code == 200
    list_res = client.get(f"/api/auth/simulations?user_id={user['id']}")
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) == 1
    assert list_res.json()["data"][0]["scenario_id"] == "vendor_pricing"
