# Broker Contact Flow

EVA Homes now follows a broker-assisted, owner-private contact model.

## Business Idea

The public visitor should not see the full phone number of the land owner or property owner. Instead, the visitor contacts the broker desk. The broker can qualify the buyer, arrange site visits, and decide when to connect the buyer with the owner.

This makes the platform different from pure "NoBroker" style sites. The positioning is:

```text
Verified properties + broker-assisted deals + owner privacy
```

## What Changed

### Public Property Contact

The property detail page now shows:

- Broker contact heading
- Posted by owner name
- Masked owner phone
- Call broker button
- WhatsApp broker button
- Send enquiry form
- Request owner callback button

The owner phone is masked, for example:

```text
98XXXXXX10
```

### Safe Contact API

New endpoint:

```text
GET /api/properties/{id}/contact
```

It returns:

```json
{
  "property_id": 1,
  "owner_name": "Rahul Sharma",
  "owner_phone_masked": "98XXXXXX10",
  "broker_name": "EVA Homes Broker Desk",
  "broker_phone": "+919900612425",
  "whatsapp_link": "https://wa.me/919900612425?text=..."
}
```

It does not return the owner's full phone number.

### Enquiry Lead Tracking

Enquiries now include:

```text
source
status
broker_notes
```

Current source values:

```text
form
callback_request
call_broker
whatsapp
```

Current default status:

```text
new
```

This turns enquiries into broker leads instead of only contact messages.

## Where To Change Broker Number

Edit:

```text
backend/core/config.py
```

Fields:

```python
BROKER_NAME = "EVA Homes Broker Desk"
BROKER_PHONE = "+919900612425"
BROKER_WHATSAPP = "+919900612425"
```

For production, move these values into a `.env` file instead of hardcoding real business numbers.

## How A Buyer Uses It

1. Buyer opens a property.
2. Buyer sees the owner name and masked owner phone.
3. Buyer calls or WhatsApps the broker desk.
4. Buyer can also submit the enquiry form.
5. Broker follows up and decides whether to arrange a visit or owner callback.

## How A Broker Uses It

1. Sign in as the admin user.
2. Open:

```text
/admin/enquiries
```

3. Review new leads there.
4. Mark enquiries as read, contacted, or closed.
5. Save internal broker notes for follow-up.
6. Contact the buyer manually by phone or email.

## How An Admin Changes Broker Number

1. Sign in with the admin account.
2. Open:

```text
/admin/settings/broker-contact
```

3. Edit the broker name, call number, or WhatsApp number.
4. Click `Save Changes`.
5. New property page visits will use the updated numbers.

## Next Best Improvements

- Add an admin enquiry dashboard in the frontend.
- Add enquiry statuses: contacted, visit_scheduled, closed, rejected.
- Add broker notes editing.
- Send automatic email or WhatsApp alert to the broker when a new enquiry arrives.
- Add OTP verification for buyer phone numbers.
- Add document verification for posted properties.
