"""End-to-end backend tests for the demo banking app.

NOTE: The auth routes are rate-limited (10 req / 15 min per IP) so we only
perform a couple of full login flows per session and reuse the tokens.
"""
import time
import uuid
import pytest
import requests

# ---------- Sante ----------
def test_health_endpoint(api_client, base_url):
    r = api_client.get(f"{base_url}/api/sante", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data.get("statut") == "OK"
    assert "date" in data


# ---------- Admin auth ----------
def test_admin_login_returns_temp_token_and_demo_code(api_client, base_url):
    r = api_client.post(
        f"{base_url}/api/auth/login",
        json={"email": "admin@banque.com", "motDePasse": "Admin1234"},
        timeout=15,
    )
    # 200 or 429 if rate-limited; skip if rate-limited
    if r.status_code == 429:
        pytest.skip("Rate limited on /api/auth/login")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "tempToken" in data
    # In demo (SMTP not configured), codeDemo must be present per app behaviour
    assert "codeDemo" in data
    assert isinstance(data["codeDemo"], str) and len(data["codeDemo"]) >= 4


def test_admin_verify_otp_returns_final_token(admin_token):
    # admin_token fixture already validates login + verify-otp
    assert isinstance(admin_token, str)
    assert admin_token.count(".") == 2  # JWT format


# ---------- Admin protected routes ----------
def test_admin_stats_requires_auth(api_client, base_url):
    r = api_client.get(f"{base_url}/api/admin/stats", timeout=10)
    assert r.status_code == 401


def test_admin_stats_with_token(admin_client, base_url):
    r = admin_client.get(f"{base_url}/api/admin/stats", timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    # The endpoint returns stats object - must be a dict
    assert isinstance(data, dict)


def test_admin_me_endpoint(admin_client, base_url):
    r = admin_client.get(f"{base_url}/api/auth/me", timeout=10)
    assert r.status_code == 200
    user = r.json().get("user", {})
    assert user.get("email") == "admin@banque.com"
    assert user.get("role") == "admin"


# ---------- Registration + client flow ----------
@pytest.fixture(scope="module")
def new_client_credentials():
    unique = uuid.uuid4().hex[:8]
    return {
        "nom": "TestNom",
        "prenom": "TestPrenom",
        "email": f"test_{unique}@example.com",
        "motDePasse": "Test1234A",
    }


def test_register_new_client(api_client, base_url, new_client_credentials):
    r = api_client.post(
        f"{base_url}/api/auth/register",
        json=new_client_credentials,
        timeout=15,
    )
    if r.status_code == 429:
        pytest.skip("Rate limited on /api/auth/register")
    assert r.status_code == 201, r.text
    body = r.json()
    assert "user" in body
    assert body["user"]["email"] == new_client_credentials["email"].lower()


def test_register_weak_password_rejected(api_client, base_url):
    r = api_client.post(
        f"{base_url}/api/auth/register",
        json={
            "nom": "X",
            "prenom": "Y",
            "email": f"weak_{uuid.uuid4().hex[:6]}@ex.com",
            "motDePasse": "weak",
        },
        timeout=15,
    )
    if r.status_code == 429:
        pytest.skip("Rate limited")
    assert r.status_code == 400


def test_register_duplicate_email_rejected(api_client, base_url, new_client_credentials):
    r = api_client.post(
        f"{base_url}/api/auth/register",
        json=new_client_credentials,
        timeout=15,
    )
    if r.status_code == 429:
        pytest.skip("Rate limited")
    assert r.status_code == 409


def test_client_login_and_view_account(api_client, base_url, new_client_credentials, helper_login):
    # Full login flow for new client, then view compte cheque
    token, resp = helper_login(
        api_client,
        new_client_credentials["email"],
        new_client_credentials["motDePasse"],
    )
    if token is None and resp.status_code == 429:
        pytest.skip("Rate limited during client login")
    assert token is not None, f"Login failed: {resp.status_code} {resp.text[:200]}"

    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    s.verify = False

    r = s.get(f"{base_url}/api/comptes", timeout=15)
    assert r.status_code == 200, r.text
    comptes = r.json()
    # Response may be list or dict; find cheque with 500 balance
    if isinstance(comptes, dict):
        # Common shape: { comptes: [...] }
        comptes = comptes.get("comptes", comptes.get("data", []))
    assert isinstance(comptes, list) and len(comptes) >= 1
    cheque = next((c for c in comptes if c.get("type") == "cheque"), None)
    assert cheque is not None, f"No cheque account found: {comptes}"
    # Solde initial démo = 500
    assert float(cheque.get("solde", 0)) == 500.0


# ---------- Auth failures ----------
def test_login_invalid_credentials(api_client, base_url):
    r = api_client.post(
        f"{base_url}/api/auth/login",
        json={"email": "admin@banque.com", "motDePasse": "WRONGPASS"},
        timeout=15,
    )
    if r.status_code == 429:
        pytest.skip("Rate limited")
    assert r.status_code in (400, 401, 403)


def test_protected_route_without_token(api_client, base_url):
    r = api_client.get(f"{base_url}/api/comptes", timeout=10)
    assert r.status_code == 401
