from tests.conftest import register_and_login


def test_register_login_and_me(client):
    headers = register_and_login(client, "buyer1@example.com")

    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "buyer1@example.com"
    assert body["is_admin"] is False
    assert body["has_seller_profile"] is False


def test_duplicate_email_is_rejected(client):
    register_and_login(client, "dupe@example.com")

    resp = client.post(
        "/api/auth/register",
        json={"full_name": "Someone Else", "email": "dupe@example.com", "password": "Testpass1"},
    )
    assert resp.status_code == 409


def test_wrong_password_is_rejected(client):
    register_and_login(client, "wrongpass@example.com")

    resp = client.post(
        "/api/auth/login",
        json={"email": "wrongpass@example.com", "password": "NotTheRightOne1"},
    )
    assert resp.status_code == 401


def test_protected_route_requires_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_weak_password_is_rejected(client):
    resp = client.post(
        "/api/auth/register",
        json={"full_name": "Weak Pass", "email": "weak@example.com", "password": "short"},
    )
    assert resp.status_code == 422
