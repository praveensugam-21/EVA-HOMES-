# EVA Homes — Project Overview

A complete walkthrough of what this project is, how it actually works end-to-end, and why it's a strong product foundation. Originally written after a full read of the codebase at commit `b351f7c`, kept current since through several rounds of hardening and new features (see `CHANGELOG.md` for the play-by-play).

Production-hardening items (secrets, storage, real OTP delivery, etc.) are tracked separately and deliberately deferred — this document is about the product as it stands, not the deploy punch-list.

---

## 1. What EVA Homes is

A real-estate marketplace connecting **buyers/renters**, **sellers/owners**, and a site-operating **admin/agent**, for buying, renting, and listing residential and commercial property. Think a lean, purpose-built version of a property portal like MagicBricks or 99acres, scoped to what a single agency or small platform actually needs — not a generic clone.

The distinguishing structural choice: **the admin sits between buyers and sellers as an agent layer.** A buyer never sees a seller's real phone number — they see the *agent's* contact details, with the actual seller's number masked server-side. This turns the platform into a lead-generation and moderation funnel rather than a pure peer-to-peer marketplace, which matters for the business model (see §6). Live in production (Vercel + Render + Supabase) as of this writing.

---

## 2. Is it complete? — short answer

**Yes, as a product.** Every core user journey — register, browse, enquire, schedule a visit, make an offer, save favorites, list a property (with a free GPS map picker and multi-photo rooms), pay to unlock a listing's exact location/phone, get verified as a seller, moderate as an admin — is built, wired frontend-to-backend, and enforces the right permissions. Nothing is a placeholder page or a dead-end button.

**No, as a deployable production service** — but that's a separate, smaller concern (storage durability, real OTP delivery, secret hygiene) that you've already chosen to handle later. Functionally, this is a finished MVP, not a prototype.

---

## 3. How it's built

```
Browser (React 19 + Vite)
    │  axios, JWT in localStorage
    ▼
FastAPI backend (Python)
    │  SQLAlchemy ORM
    ▼
Database (SQLite dev / Postgres-capable)
```

- **Backend**: FastAPI, organized as one router per domain (`auth`, `properties`, `enquiries`, `visits`, `offers`, `notifications`, `saved_properties`, `cities`, `settings`, `unlocks`, `availability`). Each router owns its own CRUD + permission checks.
- **Auth**: Stateless JWT (HS256), bcrypt-hashed passwords. A user's role isn't a single field — it's derived: `is_admin` flag for admins, presence of a linked `SellerProfile` for sellers, everyone else is a buyer by default. These are independent capabilities, not mutually exclusive roles — a single account can hold buyer, seller, *and* admin capability all at once (an admin can now also activate a seller profile and act as a buyer, a deliberate policy change — see §6).
- **Frontend**: React Router with route guards (`RequireAuth`, `SellerRoute`, `AdminRoute`) gating entire page trees by role, three parallel dashboard shells (buyer / seller / shared) plus a public marketing/browse site.
- **Database**: SQLAlchemy models with real relationships (a `User` has one `SellerProfile`, many `SavedProperty` rows, etc.), not a denormalized blob. Schema currently created via `create_all()` rather than versioned migrations.

---

## 4. The data model, in plain terms

| Entity | What it represents |
|---|---|
| `User` | One account. Buyer fields live directly on it; seller-ness is a separate linked profile, not a role enum. |
| `SellerProfile` | Business name + a verification lifecycle: `unverified → pending → verified` (or `rejected`). Gates whether someone can list property. |
| `SellerDocument` | Uploaded ID/ownership proof backing a verification request. |
| `Property` | The listing itself — type (apartment/villa/plot/commercial/house), listing type (buy/rent/commercial), and a status lifecycle: `pending → active → sold/rented/inactive`, or `rejected` by admin. Every new listing starts `pending` and needs admin approval before it's public. |
| `PropertyImage` | Multiple photos per listing. |
| `Enquiry` | A buyer's message to a seller about a listing — has its own status (`new` → ...) and broker notes, i.e. it's a lead-tracking record, not just a contact-form email. |
| `Visit` | A requested property viewing — buyer requests, seller confirms/rejects, buyer can cancel. |
| `Offer` | A buyer's price offer — buyer submits, seller accepts/rejects, buyer can withdraw. |
| `SavedProperty` | A buyer's shortlist/wishlist entry. |
| `Notification` | In-app event feed (new enquiry, offer received, visit confirmed, verification approved, visit reminder, etc.) — surfaced via a Navbar bell with a live unread badge. |
| `BrokerSettings` | One global row — the agent's name/phone/WhatsApp/photo, plus the location-unlock payment QR/phone and the two separate unlock fees (phone, map). |
| `PropertyUnlock` | A buyer's claim to have paid to unlock one listing's exact location **or** owner phone — now two independent rows per buyer+property (`unlock_type: phone \| map`), each `pending → verified/rejected`, admin-reviewed, with the paid amount snapshotted at request time. |
| `AvailabilitySlot` | A seller-defined, specific-date visit slot for one property (date + start/end time, not recurring) — a buyer books a visit by claiming an unbooked one. |

`Visit` also gained `slot_id` (links to the `AvailabilitySlot` it was booked against) and `reminder_sent_at` (makes the automated 1-hour-before reminder idempotent).

---

## 5. The user journeys

### Visitor (not logged in)
Browses the home page and listings, filters by city/type/price, opens a property detail page, sees a masked "contact agent" WhatsApp link (clicking it also quietly logs an enquiry, so the lead isn't lost even though the actual chat happens off-platform). Hits a login wall the moment they try to enquire, save, or message — a deliberate lead-capture gate.

### Buyer
1. Registers / logs in.
2. Browses and filters listings (including by property type now, not just listing type); **saves** favorites to a personal shortlist.
3. On a listing they like, they can: **enquire** (send a message that becomes a tracked lead), **request a visit** (booked against a specific-date slot the seller opened up, not a free-text time anymore), or **make an offer** (a price — the buyer now sees the owner's name on their own Offers page too).
4. Tracks all three from their own dashboard (`My Enquiries`, `My Visits`, `My Offers`) — each shows live status as the seller/admin responds.
5. Gets in-app **notifications** (Navbar bell, live unread badge) when a visit is confirmed, an offer is accepted/rejected, a booked visit is about an hour away, etc.
6. Can pay a small one-time fee to **unlock** a specific listing's exact map location (₹30) and/or the owner's real phone number (₹20) — two separate purchases now, not one combined unlock — offline UPI payment, admin manually verifies, tracked with amount paid on `My Unlocks`.
7. Can manage their profile, password, and (nominally) notification preferences from Settings.

### Seller
1. Registers as a buyer first, then submits a **seller profile** (business name + verification documents, Government ID specifically required) from their profile page.
2. Sits in `unverified`/`pending` status until an **admin reviews and approves** the documents (now on a dedicated Seller Verifications page). Verification and the ability to create listings aren't actually gated on each other, though — a seller can list before being verified.
3. Creates listings (each starts `pending` and needs **admin approval** before it goes live — a per-listing gate, separate from the account-level seller verification above).
4. Defines specific-date **visit availability slots** per property for buyers to book against.
5. Manages their own listings (`My Listings`), sees **analytics** (views, enquiry counts) per listing, and receives/responds to enquiries (now with a real reply thread, not just a status toggle), visit requests, and offers from their own seller dashboard — mirroring the buyer's dashboard but from the other side of the transaction.

### Admin / agent (the platform operator — manages, and may now also participate)
1. Reviews and approves/rejects **seller verification** requests (dedicated page, with document review) — separate from listing moderation.
2. Reviews and approves/rejects/flags **individual listings** before they go public, and can mark any listing `featured` or `verified` (buyer-facing trust signals only admin can set).
3. Sees **every enquiry** platform-wide, replies directly to buyers (the reply reaches their dashboard + a notification) — this is the lead-management console. Sellers can now reply to their own enquiries too, not just admin.
4. Verifies or rejects **location-unlock payment claims** (phone and map are reviewed/tracked independently) — checks their own UPI app, clicks Verify/Reject, buyer is notified either way. A live badge shows how many are waiting, and the reviewing admin's name is recorded against each decision.
5. Manages **user accounts**: activate/deactivate, promote/demote admin (can't demote or deactivate themselves — a sensible guardrail). Every user's card shows full profile detail, not just a name and email.
6. Sets the **global agent contact details** (including a photo now) and the **two location-unlock payment fees** shown to every buyer.
7. **Can also activate a seller profile and act as a buyer**, same as any other account — a deliberate policy reversal from the earlier design (see §6).

This admin layer is what makes the platform a *managed* marketplace rather than an open listings board — nothing reaches a buyer's eyes without passing through moderation, and every buyer-seller contact is agent-mediated rather than direct.

---

## 6. What I learned building this picture / notable design choices

- **Buyer, seller, and admin aren't mutually exclusive roles** — they're independent capabilities on one account, and this now genuinely includes admin too. Earlier in the project's life, admin was deliberately *excluded* from buyer/seller capability, enforced server-side, specifically to keep the operational role from blurring into "just another user." That protection was then **deliberately reversed** — the platform owner explicitly chose to let an admin also hold a seller profile and buy, including self-approving their own listings once they're a seller. Both states were *intentional* engineering decisions at the time they were made — the lesson isn't "the old design was wrong," it's that a real product's access model is allowed to change as the business's actual needs become clearer, and the right move both times was building exactly what was asked rather than defending an earlier decision on principle.
- **Two-layer moderation** (seller verification, then per-listing approval) is deliberate friction that protects listing quality — appropriate for an agency-style platform where trust is the product, less appropriate if the goal were pure listing volume. These two gates are independent, not sequential — a seller can list before being verified, which is a real, load-bearing design choice, not an oversight.
- **Contact masking through a single global agent identity** is the core monetization mechanic: buyers never get a seller's direct line, so every lead must route through the platform/agent. This is the most commercially significant architectural decision in the codebase, more than any single feature.
- **Enquiries, visits, and offers are three distinct funnels**, not one generic "contact seller" form — each has its own status lifecycle and dashboard surface. This gives sellers (and the admin) a much richer picture of buyer intent (a browse → an enquiry → a visit → an offer is a real intent ladder) than a flat messaging inbox would.
- **A single monetization mechanic became two, independently priced** — the location-unlock feature started as one combined "pay once, get both" purchase and was deliberately split into phone-unlock and map-unlock as separate products with separate prices. This is a genuinely different revenue shape (a buyer who only cares about calling the owner no longer has to pay for the map too), not just a cosmetic change.
- **Scheduling infrastructure had to be built from zero, deliberately outside the request/response cycle** — the "remind me an hour before" feature needed something to fire on a schedule with no user request triggering it, which nothing in a stateless FastAPI app naturally does. The real constraint that shaped the solution: the hosting platform's free tier spins the whole app down when idle, so anything running *inside* the app process (an in-process scheduler) would silently stop working exactly when it's needed most. The fix lives *outside* the app — a second, independent scheduled service that wakes the app on its own clock.
- **Notifications are structurally ready but still not connected to a real delivery provider** — the database schema, preference model, and UI (now including a live Navbar badge) are all built as if email/SMS worked, which means wiring in a provider later is a matter of filling in one function, not redesigning anything.
- **The location-unlock feature is a second, direct monetization lever** on top of agent-mediated lead generation — and it's built entirely on free infrastructure (Leaflet/OpenStreetMap for the map, manual UPI instead of a payment gateway), so there's no vendor cost sitting underneath a feature that's meant to generate revenue.

---

## 7. Benefits of this project

- **A real, working two-sided marketplace**, not a listings-only site — buyers and sellers both have dedicated tooling and visibility into the state of their transactions.
- **Built-in lead generation for a brokerage business model**: contact masking + enquiry/visit/offer tracking gives the platform operator a durable reason to sit in every transaction, which is a monetizable position (subscription, commission, or featured-listing fees all fit naturally on top of what's already built).
- **A second, already-working monetization mechanic**: the location/phone paid unlock isn't a future idea, it's live — buyers pay, admin verifies, revenue happens, on zero third-party infrastructure cost (no Maps API billing, no payment gateway fees).
- **Trust signals are earned, not self-declared**: seller verification and listing approval mean "verified" and "featured" badges actually mean something to a buyer, which is a real differentiator against unmoderated listing boards.
- **Admin has full operational control** without needing developer involvement day-to-day — user management, moderation, and broker settings are all self-service from the UI.
- **The codebase is honest about its own gaps** — stubs for OTP/notifications are clearly marked rather than silently broken, which made this entire audit fast and made it clear exactly what "finish the last mile" means when you're ready for it.
- **Clean separation by domain** (one router/model/schema per concept) means adding a new feature — say, in-app chat, or payment escrow for offers — has an obvious place to live without restructuring what's already there.

---

*This document describes product behavior and architecture as observed in the code, not aspirational design. For the list of production-readiness gaps (storage, secrets, OTP delivery, deploy config) and the phased plan to close them, see the separate audit — deferred per your instruction, not forgotten.*
