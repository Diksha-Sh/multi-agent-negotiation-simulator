"""SQLite persistence for local authentication, OTP verification, and saved simulations."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "app_data.db"


def _db_path() -> Path:
    custom = os.getenv("AUTH_DB_PATH", "").strip()
    return Path(custom) if custom else DEFAULT_DB_PATH


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create auth and simulation tables if they do not exist."""
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                phone TEXT UNIQUE,
                full_name TEXT NOT NULL,
                password_hash TEXT,
                role TEXT NOT NULL DEFAULT 'Simulation Architect',
                auth_type TEXT NOT NULL DEFAULT 'sqlite',
                created_at REAL NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS otp_codes (
                identifier TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                expires_at REAL NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS simulations (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                scenario_id TEXT NOT NULL,
                scenario_title TEXT NOT NULL,
                status TEXT NOT NULL,
                winner TEXT,
                total_rounds INTEGER NOT NULL DEFAULT 0,
                total_turns INTEGER NOT NULL DEFAULT 0,
                config_json TEXT NOT NULL DEFAULT '{}',
                turns_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _hash_password(password: str, salt: str | None = None) -> str:
    salt_val = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_val.encode("utf-8"), 100_000)
    return f"{salt_val}${digest.hex()}"


def _verify_password(password: str, stored: str | None) -> bool:
    if not stored or "$" not in stored:
        return False
    salt_val, _ = stored.split("$", 1)
    candidate = _hash_password(password, salt=salt_val)
    return hmac.compare_digest(candidate, stored)


def _format_user(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "email": row["email"] or "",
        "phone": row["phone"] or "",
        "name": row["full_name"],
        "role": row["role"],
        "type": row["auth_type"],
    }


def create_user(email: str, password: str, full_name: str = "") -> dict[str, Any]:
    """Register a new user in SQLite with a salted PBKDF2 password hash."""
    init_db()
    clean_email = email.strip().lower()
    display_name = full_name.strip() or clean_email.split("@")[0].capitalize()
    user_id = str(uuid.uuid4())
    pw_hash = _hash_password(password)
    now = time.time()

    with _connect() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (clean_email,)).fetchone()
        if existing:
            raise ValueError("An account with this email already exists. Please sign in.")
        conn.execute(
            """
            INSERT INTO users (id, email, phone, full_name, password_hash, role, auth_type, created_at)
            VALUES (?, ?, NULL, ?, ?, 'Simulation Architect', 'sqlite', ?)
            """,
            (user_id, clean_email, display_name, pw_hash, now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _format_user(row)


def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    """Verify email and password against SQLite. Returns user dict or None."""
    init_db()
    clean_email = email.strip().lower()
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (clean_email,)).fetchone()
        if not row or not _verify_password(password, row["password_hash"]):
            return None
        return _format_user(row)


def request_otp(identifier: str) -> str:
    """Generate and persist a 6-digit OTP expiring in 5 minutes."""
    init_db()
    clean_id = identifier.strip().lower()
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = time.time() + 300
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO otp_codes (identifier, code, expires_at)
            VALUES (?, ?, ?)
            ON CONFLICT(identifier) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at
            """,
            (clean_id, code, expires_at),
        )
        conn.commit()
    return code


def verify_otp(identifier: str, code: str) -> dict[str, Any] | None:
    """Validate OTP and return existing or newly provisioned SQLite user."""
    init_db()
    clean_id = identifier.strip().lower()
    with _connect() as conn:
        otp_row = conn.execute("SELECT * FROM otp_codes WHERE identifier = ?", (clean_id,)).fetchone()
        if not otp_row or otp_row["expires_at"] < time.time():
            return None
        if not hmac.compare_digest(otp_row["code"], code.strip()):
            return None

        conn.execute("DELETE FROM otp_codes WHERE identifier = ?", (clean_id,))

        is_email = "@" in clean_id
        user_row = (
            conn.execute("SELECT * FROM users WHERE email = ?", (clean_id,)).fetchone()
            if is_email
            else conn.execute("SELECT * FROM users WHERE phone = ?", (clean_id,)).fetchone()
        )
        if not user_row:
            user_id = str(uuid.uuid4())
            name = clean_id.split("@")[0].capitalize() if is_email else f"User {clean_id[-4:]}"
            conn.execute(
                """
                INSERT INTO users (id, email, phone, full_name, password_hash, role, auth_type, created_at)
                VALUES (?, ?, ?, ?, NULL, 'Simulation Architect', 'otp', ?)
                """,
                (user_id, clean_id if is_email else None, None if is_email else clean_id, name, time.time()),
            )
            user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        conn.commit()
        return _format_user(user_row)


def upsert_social_user(email: str, full_name: str, role: str, auth_type: str) -> dict[str, Any]:
    """Create or fetch an SSO / Demo partner user inside SQLite."""
    init_db()
    clean_email = email.strip().lower()
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (clean_email,)).fetchone()
        if not row:
            user_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO users (id, email, phone, full_name, password_hash, role, auth_type, created_at)
                VALUES (?, ?, NULL, ?, NULL, ?, ?, ?)
                """,
                (user_id, clean_email, full_name.strip() or clean_email.split("@")[0], role, auth_type, time.time()),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _format_user(row)


def save_simulation(record: dict[str, Any]) -> dict[str, Any]:
    """Persist a completed simulation record in SQLite."""
    init_db()
    sim_id = record.get("id") or f"sim-{uuid.uuid4()}"
    created_at = record.get("created_at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with _connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO simulations
                (id, user_id, scenario_id, scenario_title, status, winner, total_rounds, total_turns, config_json, turns_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sim_id,
                record.get("user_id"),
                str(record.get("scenario_id") or "custom"),
                str(record.get("scenario_title") or "Negotiation Session"),
                str(record.get("status") or "accepted"),
                record.get("winner"),
                int(record.get("total_rounds") or 0),
                int(record.get("total_turns") or 0),
                json.dumps(record.get("config") or {}),
                json.dumps(record.get("turns") or []),
                created_at,
            ),
        )
        conn.commit()
    return {
        "id": sim_id,
        "user_id": record.get("user_id"),
        "scenario_id": record.get("scenario_id"),
        "scenario_title": record.get("scenario_title"),
        "status": record.get("status"),
        "winner": record.get("winner"),
        "total_rounds": int(record.get("total_rounds") or 0),
        "total_turns": int(record.get("total_turns") or 0),
        "config": record.get("config") or {},
        "turns": record.get("turns") or [],
        "created_at": created_at,
    }


def list_simulations(user_id: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    """Return saved simulation runs ordered newest-first."""
    init_db()
    with _connect() as conn:
        if user_id:
            rows = conn.execute(
                "SELECT * FROM simulations WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT ?",
                (user_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM simulations ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()

    results = []
    for row in rows:
        results.append(
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "scenario_id": row["scenario_id"],
                "scenario_title": row["scenario_title"],
                "status": row["status"],
                "winner": row["winner"],
                "total_rounds": row["total_rounds"],
                "total_turns": row["total_turns"],
                "config": json.loads(row["config_json"] or "{}"),
                "turns": json.loads(row["turns_json"] or "[]"),
                "created_at": row["created_at"],
            }
        )
    return results
