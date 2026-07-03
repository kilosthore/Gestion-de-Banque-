import os
import pytest
import requests

BASE_URL = "https://c508c04c-e648-487d-9ad6-beb1ef8a7ccb.preview.emergentagent.com"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    s.verify = False
    return s


def _login_and_verify(session, email, mot_de_passe):
    """Perform login + OTP verify flow, returns final JWT token or None."""
    r = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "motDePasse": mot_de_passe},
        timeout=15,
    )
    if r.status_code != 200:
        return None, r
    data = r.json()
    temp = data.get("tempToken")
    code = data.get("codeDemo")
    if not temp or not code:
        return None, r
    r2 = session.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json={"tempToken": temp, "code": code},
        timeout=15,
    )
    if r2.status_code != 200:
        return None, r2
    return r2.json().get("token"), r2


@pytest.fixture(scope="session")
def admin_token(api_client):
    token, resp = _login_and_verify(api_client, "admin@banque.com", "Admin1234")
    if not token:
        pytest.skip(f"Admin login failed: {resp.status_code} {resp.text[:200]}")
    return token


@pytest.fixture
def admin_client(api_client, admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    s.verify = False
    return s


@pytest.fixture(scope="session")
def helper_login():
    return _login_and_verify
