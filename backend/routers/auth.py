"""Authentication & Simulation Persistence Router backed by SQLite."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Body, HTTPException, Query

from backend import auth_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/status", summary="Database and authentication connection status")
def get_auth_status() -> dict[str, Any]:
    auth_db.init_db()
    return {"connected": True, "provider": "sqlite", "label": "Local Database Connected"}


@router.post("/signup", summary="Register a new user in the SQLite database")
def signup(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    email = str(payload.get("email") or "").strip()
    password = str(payload.get("password") or "")
    full_name = str(payload.get("full_name") or "").strip()

    if "@" not in email:
        raise HTTPException(status_code=422, detail="Please provide a valid email address.")
    if len(password) < 6:
        raise HTTPException(status_code=422, detail="Password must contain at least 6 characters.")

    try:
        user = auth_db.create_user(email=email, password=password, full_name=full_name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {"user": user}


@router.post("/login", summary="Authenticate an existing user with email and password")
def login(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    email = str(payload.get("email") or "").strip()
    password = str(payload.get("password") or "")

    if not email or not password:
        raise HTTPException(status_code=422, detail="Email and password are required.")

    user = auth_db.authenticate_user(email=email, password=password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {"user": user}


@router.post("/otp/send", summary="Generate and store a 6-digit OTP for email or phone")
def send_otp(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    identifier = str(payload.get("identifier") or "").strip()
    if len(identifier) < 3:
        raise HTTPException(status_code=422, detail="A valid email or phone number is required.")
    code = auth_db.request_otp(identifier)
    return {"sent": True, "demo_otp": code}


@router.post("/otp/verify", summary="Verify a 6-digit OTP and sign in")
def verify_otp_route(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    identifier = str(payload.get("identifier") or "").strip()
    code = str(payload.get("otp") or "").strip()
    user = auth_db.verify_otp(identifier, code)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired verification OTP.")
    return {"user": user}


@router.post("/oauth", summary="Sign in via Partner / SSO identity and persist in SQLite")
def oauth_login(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    email = str(payload.get("email") or "").strip()
    name = str(payload.get("name") or "").strip()
    role = str(payload.get("role") or "Enterprise Architect").strip()
    auth_type = str(payload.get("type") or "sso").strip()
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Valid account email is required.")
    user = auth_db.upsert_social_user(email=email, full_name=name, role=role, auth_type=auth_type)
    return {"user": user}


@router.post("/simulations", summary="Save a negotiation run into SQLite")
def save_sim_route(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    saved = auth_db.save_simulation(payload)
    return {"data": saved, "source": "sqlite"}


@router.get("/simulations", summary="Fetch saved negotiation runs from SQLite")
def list_sim_route(user_id: str | None = Query(default=None)) -> dict[str, Any]:
    rows = auth_db.list_simulations(user_id=user_id)
    return {"data": rows, "source": "sqlite"}
