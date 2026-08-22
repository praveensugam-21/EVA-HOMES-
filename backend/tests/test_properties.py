from tests.conftest import VALID_PROPERTY_PAYLOAD, make_admin, register_and_login


def activate_seller(client, headers):
    resp = client.post(
        "/api/auth/me/seller-profile",
        headers=headers,
        json={"business_name": "Test Realty", "photo_url": "https://example.com/seller.jpg"},
    )
    assert resp.status_code in (200, 201), resp.text


def test_buyer_cannot_create_property(client):
    headers = register_and_login(client, "buyer@example.com")
    resp = client.post("/api/properties", headers=headers, json=VALID_PROPERTY_PAYLOAD)
    assert resp.status_code == 403


def test_seller_can_create_property_and_it_starts_pending(client):
    headers = register_and_login(client, "seller@example.com")
    activate_seller(client, headers)

    resp = client.post("/api/properties", headers=headers, json=VALID_PROPERTY_PAYLOAD)
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "pending"


def test_seller_without_phone_cannot_create_property(client):
    headers = register_and_login(client, "nophone-seller@example.com", phone=None)
    activate_seller(client, headers)

    resp = client.post("/api/properties", headers=headers, json=VALID_PROPERTY_PAYLOAD)
    assert resp.status_code == 400
    assert "phone" in resp.json()["detail"].lower()


def test_pending_property_hidden_from_public_listing(client):
    headers = register_and_login(client, "seller2@example.com")
    activate_seller(client, headers)
    client.post("/api/properties", headers=headers, json=VALID_PROPERTY_PAYLOAD)

    resp = client.get("/api/properties")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0

    resp = client.get("/api/properties/mine", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_seller_cannot_self_approve_listing(client, db_session):
    headers = register_and_login(client, "seller3@example.com")
    activate_seller(client, headers)
    created = client.post("/api/properties", headers=headers, json=VALID_PROPERTY_PAYLOAD).json()

    # A seller trying to flip their own listing straight to "active" must be
    # rejected — only admin can approve a listing (see routers/properties.py).
    resp = client.put(f"/api/properties/{created['id']}", headers=headers, json={"status": "active"})
    assert resp.status_code == 403

    # Delisting your own property (sold/inactive) is still fine, though.
    resp = client.put(f"/api/properties/{created['id']}", headers=headers, json={"status": "inactive"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "inactive"


def test_admin_can_approve_a_listing_and_it_becomes_public(client, db_session):
    seller_headers = register_and_login(client, "seller4@example.com")
    activate_seller(client, seller_headers)
    created = client.post("/api/properties", headers=seller_headers, json=VALID_PROPERTY_PAYLOAD).json()

    admin_headers = register_and_login(client, "admin4@example.com")
    make_admin(db_session, "admin4@example.com")

    resp = client.put(f"/api/properties/{created['id']}", headers=admin_headers, json={"status": "active"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"

    resp = client.get("/api/properties")
    assert resp.json()["total"] == 1


def test_non_owner_cannot_edit_someone_elses_listing(client):
    seller_headers = register_and_login(client, "seller5@example.com")
    activate_seller(client, seller_headers)
    created = client.post("/api/properties", headers=seller_headers, json=VALID_PROPERTY_PAYLOAD).json()

    other_headers = register_and_login(client, "seller6@example.com")
    activate_seller(client, other_headers)

    resp = client.put(f"/api/properties/{created['id']}", headers=other_headers, json={"title": "Hijacked"})
    assert resp.status_code == 403
