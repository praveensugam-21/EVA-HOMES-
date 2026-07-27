# EVA Homes — Project Overview

A complete walkthrough of what this project is, how it actually works end-to-end, and why it's a strong product foundation. Written after a full read of the codebase at commit `b351f7c`.

Production-hardening items (secrets, storage, real OTP delivery, etc.) are tracked separately and deliberately deferred — this document is about the product as it stands, not the deploy punch-list.

---

## 1. What EVA Homes is

A real-estate marketplace connecting **buyers/renters**, **sellers/owners**, and a site-operating **admin/broker**, for buying, renting, and listing residential and commercial property. Think a lean, purpose-built version of a property portal like MagicBricks or 99acres, scoped to what a single brokerage or small platform actually needs — not a generic clone.

The distinguishing structural choice: **the admin sits between buyers and sellers as a broker layer.** A buyer never sees a seller's real phone number — they see the *broker's* contact details, with the actual seller's number masked server-side. This turns the platform into a lead-generation and moderation funnel rather than a pure peer-to-peer marketplace, which matters for the business model (see §6).

---

## 2. Is it complete? — short answer

**Yes, as a product.** Every core user journey — register, browse, enquire, schedule a visit, make an offer, save favorites, list a property, get verified as a seller, moderate as an admin — is built, wired frontend-to-backend, and enforces the right permissions. Nothing is a placeholder page or a dead-end button.

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

- **Backend**: FastAPI, organized as one router per domain (`auth`, `properties`, `enquiries`, `visits`, `offers`, `notifications`, `saved_properties`, `cities`, `settings`). Each router owns its own CRUD + permission checks.
- **Auth**: Stateless JWT (HS256), bcrypt-hashed passwords. A user's role isn't a single field — it's derived: `is_admin` flag for admins, presence of a linked `SellerProfile` for sellers, everyone else is a buyer by default. A single account can hold both buyer and seller capability at once (you can browse as a buyer *and* list a property as a seller from the same login).
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
| `Notification` | In-app event feed (new enquiry, offer received, visit confirmed, verification approved, etc.). |
| `BrokerSettings` | One global row — the broker's name/phone/WhatsApp shown to buyers instead of the seller's real number. |

---

## 5. The user journeys

### Visitor (not logged in)
Browses the home page and listings, filters by city/type/price, opens a property detail page, sees a masked "contact via broker" WhatsApp link. Hits a login wall the moment they try to enquire, save, or message — a deliberate lead-capture gate.

### Buyer
1. Registers / logs in.
2. Browses and filters listings; **saves** favorites to a personal shortlist.
3. On a listing they like, they can: **enquire** (send a message that becomes a tracked lead), **request a visit** (with a preferred time), or **make an offer** (a price).
4. Tracks all three from their own dashboard (`My Enquiries`, `My Visits`, `My Offers`) — each shows live status as the seller/admin responds.
5. Gets in-app **notifications** when a visit is confirmed, an offer is accepted/rejected, etc.
6. Can manage their profile, password, and (nominally) notification preferences from Settings.

### Seller
1. Registers as a buyer first, then submits a **seller profile** (business name + verification documents) from their profile page.
2. Sits in `unverified`/`pending` status until an **admin reviews and approves** the documents — only then can they create listings.
3. Once verified: creates listings (each starts `pending` and again needs **admin approval** before it goes live — a second gate, this time per-listing rather than per-account).
4. Manages their own listings (`My Listings`), sees **analytics** (views, enquiry counts) per listing, and receives/responds to enquiries, visit requests, and offers from their own seller dashboard — mirroring the buyer's dashboard but from the other side of the transaction.

### Admin / broker (the platform operator)
1. Reviews and approves/rejects **seller verification** requests (with document review).
2. Reviews and approves/rejects/flags **individual listings** before they go public, and can mark any listing `featured` or `verified` (buyer-facing trust signals only admin can set).
3. Sees **every enquiry** platform-wide, can add internal broker notes and update status — this is the lead-management console.
4. Manages **user accounts**: activate/deactivate, promote/demote admin (can't demote or deactivate themselves — a sensible guardrail).
5. Sets the **global broker contact details** shown to every buyer in place of sellers' real numbers.

This admin layer is what makes the platform a *managed* marketplace rather than an open listings board — nothing reaches a buyer's eyes without passing through moderation, and every buyer-seller contact is brokered rather than direct.

---

## 6. What I learned building this picture / notable design choices

- **Buyer and seller aren't mutually exclusive roles** — they're independent capabilities on one account. This is a good call; it matches how real users behave (an owner selling their flat is often also house-hunting for their next one) and avoids forcing awkward multi-account signup.
- **Two-layer moderation** (seller verification, then per-listing approval) is deliberate friction that protects listing quality — appropriate for a brokerage-style platform where trust is the product, less appropriate if the goal were pure listing volume.
- **Contact masking through a single global broker identity** is the core monetization mechanic: buyers never get a seller's direct line, so every lead must route through the platform/broker. This is the most commercially significant architectural decision in the codebase, more than any single feature.
- **Enquiries, visits, and offers are three distinct funnels**, not one generic "contact seller" form — each has its own status lifecycle and dashboard surface. This gives sellers (and the admin) a much richer picture of buyer intent (a browse → an enquiry → a visit → an offer is a real intent ladder) than a flat messaging inbox would.
- **Notifications and OTP verification are structurally ready but not yet connected to a real delivery provider** — the database schema, preference model, and UI are all built as if email/SMS worked, which means wiring in a provider later is a matter of filling in one function, not redesigning anything.

---

## 7. Benefits of this project

- **A real, working two-sided marketplace**, not a listings-only site — buyers and sellers both have dedicated tooling and visibility into the state of their transactions.
- **Built-in lead generation for a brokerage business model**: contact masking + enquiry/visit/offer tracking gives the platform operator a durable reason to sit in every transaction, which is a monetizable position (subscription, commission, or featured-listing fees all fit naturally on top of what's already built).
- **Trust signals are earned, not self-declared**: seller verification and listing approval mean "verified" and "featured" badges actually mean something to a buyer, which is a real differentiator against unmoderated listing boards.
- **Admin has full operational control** without needing developer involvement day-to-day — user management, moderation, and broker settings are all self-service from the UI.
- **The codebase is honest about its own gaps** — stubs for OTP/notifications are clearly marked rather than silently broken, which made this entire audit fast and made it clear exactly what "finish the last mile" means when you're ready for it.
- **Clean separation by domain** (one router/model/schema per concept) means adding a new feature — say, in-app chat, or payment escrow for offers — has an obvious place to live without restructuring what's already there.

---

*This document describes product behavior and architecture as observed in the code, not aspirational design. For the list of production-readiness gaps (storage, secrets, OTP delivery, deploy config) and the phased plan to close them, see the separate audit — deferred per your instruction, not forgotten.*
