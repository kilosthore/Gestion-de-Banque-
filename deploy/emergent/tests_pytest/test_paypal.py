"""PayPal sandbox integration tests (additive feature).

We create ONE test client, then reuse its token for all paypal endpoints to
stay under the aggressive /api/auth/* rate-limit (10 req / 15 min per IP).
"""
import uuid
import pytest
import requests

BASE_URL = "https://c508c04c-e648-487d-9ad6-beb1ef8a7ccb.preview.emergentagent.com"


@pytest.fixture(scope="module")
def client_ctx():
    """Register a new client and return (session_with_token, user_dict, comptes, produits)."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    s.verify = False

    email = f"paypal_{uuid.uuid4().hex[:8]}@example.com"
    creds = {
        "nom": "PayPalTester",
        "prenom": "Sandbox",
        "email": email,
        "motDePasse": "Test1234A",
    }
    r = s.post(f"{BASE_URL}/api/auth/register", json=creds, timeout=15)
    if r.status_code == 429:
        pytest.skip("Rate limited on /api/auth/register")
    assert r.status_code == 201, r.text

    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "motDePasse": creds["motDePasse"]},
        timeout=15,
    )
    if r.status_code == 429:
        pytest.skip("Rate limited on /api/auth/login")
    assert r.status_code == 200, r.text
    body = r.json()
    temp = body.get("tempToken")
    code = body.get("codeDemo")
    assert temp and code, body

    r = s.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json={"tempToken": temp, "code": code},
        timeout=15,
    )
    if r.status_code == 429:
        pytest.skip("Rate limited on verify-otp")
    assert r.status_code == 200, r.text
    token = r.json().get("token")
    user = r.json().get("user")
    assert token and user, r.text

    auth = requests.Session()
    auth.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    auth.verify = False

    # Fetch comptes + produits (no auth rate-limit here)
    rc = auth.get(f"{BASE_URL}/api/comptes", timeout=15)
    assert rc.status_code == 200, rc.text
    comptes = rc.json().get("comptes") or rc.json().get("data") or []
    if isinstance(rc.json(), list):
        comptes = rc.json()

    rp = auth.get(f"{BASE_URL}/api/produits", timeout=15)
    assert rp.status_code == 200, rp.text
    produits = rp.json().get("produits") or []

    return {"session": auth, "user": user, "token": token,
            "comptes": comptes, "produits": produits, "email": email}


# ---------- /api/paypal/config ----------
def test_paypal_config_public():
    r = requests.get(f"{BASE_URL}/api/paypal/config", timeout=15, verify=False)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("clientId"), data
    assert data.get("devise") == "CAD"
    assert data.get("mode") == "sandbox"


def test_paypal_config_no_auth_required():
    # No Authorization header -> still 200
    r = requests.get(f"{BASE_URL}/api/paypal/config", timeout=15, verify=False)
    assert r.status_code == 200


# ---------- POST /api/paypal/orders (depot) ----------
def test_create_order_depot_ok(client_ctx):
    s = client_ctx["session"]
    cheque = next((c for c in client_ctx["comptes"] if c.get("type") == "cheque"), None)
    assert cheque, client_ctx["comptes"]
    r = s.post(
        f"{BASE_URL}/api/paypal/orders",
        json={"usage": "depot", "compteId": cheque["_id"], "montant": 25.50},
        timeout=30,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert "orderId" in body and isinstance(body["orderId"], str) and len(body["orderId"]) > 5


def test_create_order_produit_ok(client_ctx):
    s = client_ctx["session"]
    produits = client_ctx["produits"]
    if not produits:
        pytest.skip("Aucun produit financier disponible")
    produit = produits[0]
    r = s.post(
        f"{BASE_URL}/api/paypal/orders",
        json={"usage": "produit", "produitId": produit["_id"], "montant": 100},
        timeout=30,
    )
    assert r.status_code == 201, r.text
    assert r.json().get("orderId")


# ---------- Validations ----------
def test_create_order_invalid_amount_zero(client_ctx):
    s = client_ctx["session"]
    cheque = next((c for c in client_ctx["comptes"] if c.get("type") == "cheque"), None)
    r = s.post(
        f"{BASE_URL}/api/paypal/orders",
        json={"usage": "depot", "compteId": cheque["_id"], "montant": 0},
        timeout=15,
    )
    assert r.status_code == 400, r.text


def test_create_order_invalid_amount_negative(client_ctx):
    s = client_ctx["session"]
    cheque = next((c for c in client_ctx["comptes"] if c.get("type") == "cheque"), None)
    r = s.post(
        f"{BASE_URL}/api/paypal/orders",
        json={"usage": "depot", "compteId": cheque["_id"], "montant": -10},
        timeout=15,
    )
    assert r.status_code == 400


def test_create_order_invalid_amount_too_large(client_ctx):
    s = client_ctx["session"]
    cheque = next((c for c in client_ctx["comptes"] if c.get("type") == "cheque"), None)
    r = s.post(
        f"{BASE_URL}/api/paypal/orders",
        json={"usage": "depot", "compteId": cheque["_id"], "montant": 10001},
        timeout=15,
    )
    assert r.status_code == 400


def test_create_order_foreign_compte_returns_404(client_ctx):
    s = client_ctx["session"]
    fake_uuid = str(uuid.uuid4())
    r = s.post(
        f"{BASE_URL}/api/paypal/orders",
        json={"usage": "depot", "compteId": fake_uuid, "montant": 50},
        timeout=15,
    )
    assert r.status_code == 404, r.text


def test_create_order_bad_usage(client_ctx):
    s = client_ctx["session"]
    r = s.post(
        f"{BASE_URL}/api/paypal/orders",
        json={"usage": "unknown", "montant": 10},
        timeout=15,
    )
    assert r.status_code == 400


def test_create_order_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/paypal/orders",
        json={"usage": "depot", "montant": 10},
        timeout=15, verify=False,
    )
    assert r.status_code == 401


# ---------- POST /api/paypal/orders/:id/capture ----------
def test_capture_unapproved_order_returns_clean_error(client_ctx):
    """Create an order, immediately try to capture it (not approved) — must not crash."""
    s = client_ctx["session"]
    cheque = next((c for c in client_ctx["comptes"] if c.get("type") == "cheque"), None)
    r = s.post(
        f"{BASE_URL}/api/paypal/orders",
        json={"usage": "depot", "compteId": cheque["_id"], "montant": 10},
        timeout=30,
    )
    assert r.status_code == 201
    order_id = r.json()["orderId"]

    r2 = s.post(f"{BASE_URL}/api/paypal/orders/{order_id}/capture", timeout=30)
    # Must be a clean error (400/422/500 with JSON message), NOT a crash / no body
    assert r2.status_code in (400, 422, 500), r2.text
    body = r2.json()
    assert "message" in body and isinstance(body["message"], str) and body["message"]


def test_capture_unknown_order_returns_404(client_ctx):
    s = client_ctx["session"]
    r = s.post(f"{BASE_URL}/api/paypal/orders/FAKE_ORDER_ID_XYZ/capture", timeout=15)
    assert r.status_code == 404, r.text


def test_capture_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/paypal/orders/whatever/capture",
        timeout=15, verify=False,
    )
    assert r.status_code == 401


# ---------- GET /api/paypal/historique ----------
def test_historique_returns_only_current_user(client_ctx):
    s = client_ctx["session"]
    r = s.get(f"{BASE_URL}/api/paypal/historique", timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "paiements" in body
    paiements = body["paiements"]
    assert isinstance(paiements, list)
    # We created at least 3 orders above (depot ok, produit ok, capture-attempt)
    assert len(paiements) >= 3
    user_id = client_ctx["user"]["_id"] if "_id" in client_ctx["user"] else client_ctx["user"].get("id")
    for p in paiements:
        # Every paiement must belong to the current user
        assert p.get("client") == user_id, p


def test_historique_requires_auth():
    r = requests.get(f"{BASE_URL}/api/paypal/historique", timeout=15, verify=False)
    assert r.status_code == 401


# ---------- Regression sante ----------
def test_sante_still_ok():
    r = requests.get(f"{BASE_URL}/api/sante", timeout=10, verify=False)
    assert r.status_code == 200
    assert r.json().get("statut") == "OK"


# ---------- Regression comptes / transactions ----------
def test_comptes_endpoint_still_works(client_ctx):
    s = client_ctx["session"]
    r = s.get(f"{BASE_URL}/api/comptes", timeout=15)
    assert r.status_code == 200
    body = r.json()
    comptes = body.get("comptes") if isinstance(body, dict) else body
    assert isinstance(comptes, list) and len(comptes) >= 1


def test_transactions_endpoint_still_works(client_ctx):
    s = client_ctx["session"]
    r = s.get(f"{BASE_URL}/api/transactions", timeout=15)
    assert r.status_code == 200
