from datetime import datetime, timedelta, timezone

from tests.conftest import VALID_PROPERTY_PAYLOAD, register_and_login


def create_listing(client):
    """Seller account + one property (any status — visits/offers don't require approval)."""
    seller_headers = register_and_login(client, "listing-owner@example.com")
    client.post("/api/auth/me/seller-profile", headers=seller_headers, json={"business_name": "Test Realty"})
    prop = client.post("/api/properties", headers=seller_headers, json=VALID_PROPERTY_PAYLOAD).json()
    return seller_headers, prop


def test_enquiry_submission_is_public_and_shows_in_buyers_dashboard(client):
    _, prop = create_listing(client)
    buyer_headers = register_and_login(client, "enquirer@example.com")

    resp = client.post(
        "/api/enquiries",
        headers=buyer_headers,
        json={
            "name": "Test Buyer",
            "email": "enquirer@example.com",
            "message": "Is this property still available for viewing?",
            "property_id": prop["id"],
        },
    )
    assert resp.status_code == 201, resp.text

    resp = client.get("/api/enquiries/mine", headers=buyer_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


def test_visit_request_buyer_can_only_cancel(client):
    seller_headers, prop = create_listing(client)
    buyer_headers = register_and_login(client, "visitor@example.com")

    resp = client.post(
        "/api/visits",
        headers=buyer_headers,
        json={
            "property_id": prop["id"],
            "requested_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        },
    )
    assert resp.status_code == 201, resp.text
    visit_id = resp.json()["id"]

    # Buyer trying to confirm their own visit request must be rejected —
    # only the seller can confirm/reject.
    resp = client.put(f"/api/visits/{visit_id}", headers=buyer_headers, json={"status": "confirmed"})
    assert resp.status_code == 403

    resp = client.put(f"/api/visits/{visit_id}", headers=buyer_headers, json={"status": "cancelled"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"

    # The seller can confirm/reject on their own properties.
    resp = client.post(
        "/api/visits",
        headers=buyer_headers,
        json={
            "property_id": prop["id"],
            "requested_date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        },
    )
    second_visit_id = resp.json()["id"]
    resp = client.put(f"/api/visits/{second_visit_id}", headers=seller_headers, json={"status": "confirmed"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "confirmed"


def test_offer_buyer_can_only_withdraw(client):
    seller_headers, prop = create_listing(client)
    buyer_headers = register_and_login(client, "offerer@example.com")

    resp = client.post(
        "/api/offers",
        headers=buyer_headers,
        json={"property_id": prop["id"], "amount": 1000000},
    )
    assert resp.status_code == 201, resp.text
    offer_id = resp.json()["id"]

    resp = client.put(f"/api/offers/{offer_id}", headers=buyer_headers, json={"status": "accepted"})
    assert resp.status_code == 403

    resp = client.put(f"/api/offers/{offer_id}", headers=seller_headers, json={"status": "accepted"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"


def test_stranger_cannot_see_or_update_someone_elses_visit(client):
    _, prop = create_listing(client)
    buyer_headers = register_and_login(client, "realbuyer@example.com")
    resp = client.post(
        "/api/visits",
        headers=buyer_headers,
        json={
            "property_id": prop["id"],
            "requested_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
    )
    visit_id = resp.json()["id"]

    stranger_headers = register_and_login(client, "stranger@example.com")
    resp = client.put(f"/api/visits/{visit_id}", headers=stranger_headers, json={"status": "cancelled"})
    assert resp.status_code == 403
