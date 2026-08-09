# Agent Contact Flow

EVA Homes follows an agent-assisted, owner-private contact model. (This file keeps its original name — `BROKER_CONTACT_FLOW.md` — since several other docs link to it, but "broker" in the product UI itself was renamed to "Agent"; see `CHANGELOG.md` 2026-08-08. `BROKER_NAME`/`broker_phone`/etc. as internal field names were left alone too — only user-facing text changed.)

## Business Idea

The public visitor should not see the full phone number of the land owner or property owner. Instead, the visitor contacts the agent desk. The agent can qualify the buyer, arrange site visits, and decide when to connect the buyer with the owner.

This makes the platform different from pure "NoBroker" style sites. The positioning is:

```text
Verified properties + agent-assisted deals + owner privacy
```

## What Changed

### Public Property Contact

The property detail page shows:

- "Contact Agent" heading, with the agent's photo if one has been uploaded (falls back to a generic icon)
- Posted by owner name
- Masked owner phone
- Call agent button
- WhatsApp agent button (also silently logs the contact attempt as an enquiry — see below — so it's trackable even though the actual chat happens outside the app)
- Send enquiry form
- Request owner callback button

The owner phone is masked, for example:

```text
98XXXXXX10
```

### Safe Contact API

Endpoint:

```text
GET /api/properties/{id}/contact
```

It returns:

```json
{
  "property_id": 1,
  "owner_name": "Rahul Sharma",
  "owner_phone_masked": "98XXXXXX10",
  "broker_name": "EVA Homes Agent Desk",
  "broker_phone": "+919900612425",
  "broker_photo_url": "https://.../agent.jpg",
  "whatsapp_link": "https://wa.me/919900612425?text=..."
}
```

It does not return the owner's full phone number — **unless** the caller has paid to unlock the phone specifically for that listing (see "Paid Exception" below), in which case the response also includes `phone_unlocked: true` and a real `owner_phone` field. (Map/location unlocking is a *separate* purchase — see below — reflected on `GET /api/properties/{id}` as `map_unlocked`, not on this endpoint.)

### Enquiry Lead Tracking

Enquiries include:

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

This turns enquiries into agent leads instead of only contact messages. Every enquiry with a `property_id` now also notifies that property's owner in-app the moment it's submitted — previously the owner only found out by manually checking their dashboard.

## Paid Exception: Location & Owner-Phone Unlock (two independent unlocks)

The agent-masking model above is the default for everyone — but a buyer can deliberately pay to bypass it for one specific listing. This is the platform's second monetization mechanic alongside agent-mediated lead generation. **Phone number and map/location are two separate, independently-priced unlocks** — a buyer might unlock just the phone, just the map, both, or neither, per listing.

1. Buyer pays a one-time fee — ₹20 for the phone number, ₹30 for the map location, both admin-configurable — via UPI, using a QR code/phone number shown on the property page — entirely offline, no payment gateway.
2. Buyer submits a claim for a specific unlock type (`POST /api/properties/{id}/unlock-request`, body includes `unlock_type: "phone" | "map"`), with a **required** transaction reference, rate-limited to 5 attempts per 5 minutes.
3. Admin manually checks their own UPI app and verifies or rejects the claim from `/admin/payment-verifications` — the Navbar shows a live badge with how many are waiting, and each decided row shows which admin handled it.
4. Once verified, `GET /api/properties/{id}` (`map_unlocked`) and/or `.../contact` (`phone_unlocked`) start returning the **exact map location** and/or the **owner's real, unmasked phone number** for that buyer, on that listing, permanently — whichever type was actually verified.

Everyone else — and this same buyer on every other listing, or for the unlock type they haven't paid for — still gets the masked phone + agent contact flow described above. The owner's real number/exact location is never returned to a client that hasn't been verified for that specific property and unlock type, checked server-side on every request.

See `docs/PROJECT_GUIDE.md`'s "Location & Owner-Phone Unlock" section for the full endpoint list and admin workflow.

## Where To Change Agent Contact Details

Edit `backend/core/config.py` for the *defaults* (used the first time `BrokerSettings` is created — after that, changes go through the admin UI, not this file):

```python
BROKER_NAME = "EVA Homes Agent Desk"
BROKER_PHONE = "+919900612425"
BROKER_WHATSAPP = "+919900612425"
```

For production, these live as env vars, not hardcoded — and once the app has run once, further changes go through **Agent Settings** in the admin UI (see below), which writes to the `broker_settings` database row, not this file.

## How A Buyer Uses It

1. Buyer opens a property.
2. Buyer sees the owner name, masked owner phone, and the agent's photo (if set).
3. Buyer calls or WhatsApps the agent desk.
4. Buyer can also submit the enquiry form.
5. The agent (or the seller directly, now) follows up and decides whether to arrange a visit or owner callback.

## How An Agent/Admin Uses It

1. Sign in as the admin user.
2. Open:

```text
/admin/enquiries
```

3. Review new leads there.
4. Mark enquiries as read, contacted, or closed.
5. Send a reply — it's timestamped and appears directly on the buyer's own "My Enquiries" page, plus an in-app notification. (Only works if the enquiry is linked to a logged-in account; guest submissions have no dashboard to reply into — use Call/WhatsApp instead.) The property's own seller can now reply to the same thread too, from their own Enquiries page — this used to be admin-only.
6. Contact the buyer manually by phone or email for anything that needs to happen off-platform.

## How An Admin Changes Agent Contact Details

1. Sign in with the admin account.
2. Open:

```text
/admin/settings/broker-contact
```

3. Edit the agent name, call number, WhatsApp number, photo, and (further down the same page) the location-unlock payment QR code, UPI phone number, and the two fees (phone unlock, map unlock).
4. Click `Save Changes`.
5. New property page visits will use the updated numbers/fees/photo.

## Status Of Earlier "Next Best Improvements"

- ✅ Admin enquiry dashboard — done (`/admin/enquiries`).
- ✅ Enquiry statuses (contacted/closed/etc.) — done.
- ✅ Agent notes — done, and upgraded further: it's now a real reply that reaches the buyer's dashboard, not just an internal note, and the seller can post to the same thread too, not just admin.
- ✅ Document verification for posted properties — done, and now has its own dedicated admin page (`/admin/seller-verifications`) instead of being buried inside general user management. Government ID is specifically mandatory now, not just "any document."
- ✅ **New enquiry notifies the seller automatically** — previously nothing notified anyone when a new enquiry came in.
- ⏳ Automatic email/WhatsApp alert to the agent desk on a new enquiry — still not wired to a real external provider (email/SMS); the in-app notification above is real, but nothing leaves the app yet. See `CHANGELOG.md` "known gaps."
- ⏳ OTP verification for buyer phone numbers — the earlier fake version (code returned in the API response) was removed rather than shipped half-working; a real version needs an SMS/email provider first.
- ✅ A deliberate paid exception to owner-privacy — buyers can unlock a specific listing's exact location and/or real phone number via an offline UPI payment, manually verified by admin. Originally one combined unlock; **now split into two independent, separately-priced unlocks** (phone/map). See "Paid Exception" above.
- ✅ **New, beyond the original list**: sellers now define specific-date visit availability slots, buyers book against them, and both sides get an automated reminder about an hour before a confirmed visit (Render Cron Job). See `docs/PROJECT_GUIDE.md`'s "Visit Availability Slots" section.
