# 04 — API Specification

Base path `/api/v1`. JSON only. Every route is generated into OpenAPI 3.1 from its zod schemas
(`zod-to-openapi`) and served at `/api/docs` — satisfying Quotation B's Swagger deliverable without a
hand-maintained YAML file that drifts within a fortnight.

## 1. Conventions

**Auth.** httpOnly cookie session for the browser; `Authorization: Bearer <jwt>` accepted on the
same routes for future clients. Roles come from the session, never from the request body.

**Errors.** One shape, everywhere:

```json
{ "error": { "code": "VALIDATION_ERROR",
             "message": "Category is not assigned to your account.",
             "fields": { "categoryId": "Not permitted" },
             "requestId": "req_a1b2c3" } }
```

| Code | HTTP | |
|---|---|---|
| `VALIDATION_ERROR` | 400 | zod failure, `fields` populated |
| `UNAUTHENTICATED` | 401 | no/invalid session |
| `FORBIDDEN` | 403 | authenticated, not permitted |
| `NOT_FOUND` | 404 | also returned instead of 403 for non-public entities, to avoid leaking existence |
| `CONFLICT` | 409 | illegal state transition, duplicate email |
| `RATE_LIMITED` | 429 | includes `Retry-After` |
| `INTERNAL` | 500 | `requestId` logged to Sentry, no detail leaked |

**Pagination.** `?page=1&limit=24` (max 100) → `{ data: [...], meta: { page, limit, total, totalPages } }`.

**Idempotency.** Approve/reject endpoints are idempotent: re-approving an approved entity returns
200 with the current state, not 409. Admins double-click.

**Rate limits** (per IP unless stated): auth 10/15 min · OTP send 3/hour *per phone* + 10/hour per IP
· lead submit 5/hour per phone, 20/hour per IP · search 60/min · uploads 30/hour per user · everything
else 300/min.

## 2. Public — no auth

| Method | Path | Notes |
|---|---|---|
| GET | `/products` | `q, category, city, state, sort, page, limit`. Only approved products of visible sellers. **Response never contains seller phone or email.** |
| GET | `/products/:slug` | Detail + `relatedProducts[4]`. Increments `viewCount` asynchronously (fire-and-forget, never blocks the render). |
| GET | `/products/suggest?q=` | SRC-05, max 8 |
| GET | `/categories` | Tree with product counts |
| GET | `/categories/:slug` | Category + its products |
| GET | `/sellers/:slug` | Public profile + approved products, contact masked |
| GET | `/filters` | Distinct cities/states present in the visible catalogue |
| GET | `/cms/:slug` | Sanitised CMS page |
| POST | `/contact` | General Contact-Us form. Honeypot + rate limited. |
| GET | `/health` | `{ status, db, version, uptime }` — used by the deploy health check |

### 2.1 The contact-masking contract

`GET /products/:slug` returns the seller as:

```json
"seller": { "id": "...", "slug": "acme-steels-9f2a", "companyName": "Acme Steels",
            "logoUrl": "...", "city": "Rajkot", "state": "Gujarat",
            "categories": ["Metals"], "contactUnlocked": false }
```

`contactPhone`, `contactEmail`, `altPhone`, `whatsappPhone`, `addressLine` and `pincode` are
**omitted by the serialiser** — not nulled, not sent-and-hidden. There is one function,
`toPublicSeller()`, that produces this object, and a test that asserts its output contains none of
those keys for any fixture. Every public route uses it.

When the caller has a verified lead for that seller, the same route returns `contactUnlocked: true`
plus a `contact` object. The unlock check is a server-side lookup on the session/lead, never a
client-supplied flag.

## 3. Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register/seller` | SEL-01. Creates `User(SELLER)` + `SellerProfile(PENDING)`; notifies admin. |
| POST | `/auth/login` | Email + password. Generic error on failure; no distinction between wrong email and wrong password. |
| POST | `/auth/logout` | |
| POST | `/auth/forgot-password` | Always 200, whatever the email. |
| POST | `/auth/reset-password` | `{ token, password }` — single use, invalidates all sessions. |
| GET | `/auth/me` | Session user + role + seller status |
| POST | `/auth/buyer/otp/send` | Buyer login by phone |
| POST | `/auth/buyer/otp/verify` | Creates session |

## 4. Leads — the core flow

| Method | Path | Notes |
|---|---|---|
| POST | `/leads/inquiries` | Body: `productId?`, `sellerId?`, buyer fields, `message`. Creates `Lead(PENDING_VERIFICATION)` + `OtpChallenge`, sends OTP. Returns `{ challengeId, maskedDestination: "+91 98••••3210", expiresInSec: 600 }`. **Never returns the code**, even in dev — in dev it is printed to the server console by the `console` OTP provider. |
| POST | `/leads/inquiries/verify` | `{ challengeId, code }`. On success: lead → `NEW`, buyer user created/linked, session set, notifications enqueued, returns the unmasked seller contact. On failure: increments attempts, 400; after `maxAttempts`, 429 and the challenge is burned. |
| POST | `/leads/inquiries/resend` | 60 s cooldown, max 3 per challenge |
| GET | `/me/inquiries` | Buyer's own leads with revealed contacts (LEAD-08) |

Sequence:

```
Buyer                      API                         DB / providers
  │  POST /leads/inquiries  │
  ├────────────────────────►│ validate → ratelimit → create Lead(PENDING_VERIFICATION)
  │                         ├──────────────────────► create OtpChallenge(codeHash)
  │  {challengeId, masked}  │◄─────────────────────── MSG91 send SMS
  │◄────────────────────────┤
  │  POST …/verify {code}   │
  ├────────────────────────►│ compare hash, check expiry+attempts
  │                         ├─ tx: Lead→NEW, verifiedAt, link/create buyer User,
  │                         │      product.leadCount++, LeadEvent(VERIFIED)
  │                         ├─ enqueue: seller email+push, admin notify
  │  {contact:{phone,…}}    │
  │◄────────────────────────┤
```

The write is one transaction; notifications are enqueued **after commit**, so a mail outage can
never lose a lead and a retry can never double-count one.

## 5. Seller — role `SELLER`, status `APPROVED` unless noted

| Method | Path | Notes |
|---|---|---|
| GET | `/seller/dashboard` | SEL-05 stats + 30-day series + 5 latest leads, one round trip |
| GET/PATCH | `/seller/profile` | Available while `PENDING` (read-only) |
| POST | `/seller/profile/logo` | Presigned R2 upload |
| GET | `/seller/categories` | Assigned categories only |
| GET/POST | `/seller/products` | List (own, all statuses) / create |
| GET/PATCH/DELETE | `/seller/products/:id` | Ownership enforced in `policy.ts`, never by a `where` clause alone |
| POST | `/seller/products/:id/submit` | `DRAFT`/`REJECTED` → `PENDING` |
| POST | `/seller/products/:id/images` | Presigned upload, ≤8 total |
| PATCH | `/seller/products/:id/images/reorder` | `{ ids: [...] }` |
| DELETE | `/seller/products/:id/images/:imageId` | Blocked if it is the last image |
| GET | `/seller/leads` | Filter by status/date, paginated |
| GET | `/seller/leads/:id` | Marks `NEW → VIEWED` |
| PATCH | `/seller/leads/:id` | `{ status, sellerNotes }` |
| GET | `/seller/leads/export` | CSV of the current filter |
| GET/PATCH | `/seller/notifications` | List / mark read |

**Two independent checks guard every seller write** and both must be present:
1. the resource belongs to this seller;
2. for products, `categoryId` is in this seller's assigned set (SEL-10).

Check 2 is the one AI-generated code forgets, because it is not expressible as an ownership filter.
It gets its own test in `tests/unit/policy/product.spec.ts`.

## 6. Admin — role `ADMIN`

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | ADM-01, cached 60 s |
| GET | `/admin/sellers` | `status, isActive, q, page` |
| GET | `/admin/sellers/:id` | Profile + products + leads + audit trail |
| POST | `/admin/sellers/:id/approve` | `{ categoryIds[] }` — assign and approve atomically |
| POST | `/admin/sellers/:id/reject` | `{ reason }` |
| POST | `/admin/sellers/:id/activate` · `/deactivate` | |
| PUT | `/admin/sellers/:id/categories` | Full replace. Returns `affectedProducts` so the UI can warn before committing (ADM-04). |
| GET/POST | `/admin/categories` | |
| PATCH/DELETE | `/admin/categories/:id` | Delete blocked while products exist → 409 with `productCount` |
| PATCH | `/admin/categories/reorder` | |
| GET | `/admin/products` | `status, category, seller, q` |
| POST | `/admin/products/:id/approve` · `/reject` | `{ reason }` on reject |
| POST | `/admin/products/bulk-approve` | `{ ids[] }`, max 50 |
| GET | `/admin/leads` · `/admin/leads/:id` · `/admin/leads/export` | |
| GET/PUT | `/admin/cms/:slug` | HTML sanitised server-side on write |
| GET | `/admin/contact-messages` | |
| GET | `/admin/audit-logs` | |

Every admin mutation writes an `AuditLog` row **inside the same transaction** as the change. Outside
the transaction, the log and the reality drift the first time something fails halfway.

## 7. Uploads

Direct-to-R2 with presigned PUTs, so image bytes never pass through the app server — important on a
small VPS.

1. `POST /uploads/presign` → `{ contentType, size, purpose }` → validates type and size against the
   allowlist, returns `{ uploadUrl, key, expiresIn: 300 }`.
2. Client PUTs the file to R2.
3. Client calls the owning resource (`POST /seller/products/:id/images`) with the key.
4. Server **fetches the object, verifies the real magic bytes** (not the declared MIME type),
   re-encodes with sharp to WebP at 1600/800/400/160 px, strips EXIF, computes a blurhash, stores
   the derivatives, deletes the original.

Step 4 is not optional. A presigned URL means an attacker can put arbitrary bytes in the bucket with
an image content-type; server-side re-encoding is what makes that harmless. Orphaned keys — presigned
but never claimed — are swept nightly after 24 h.

## 8. Caching

| Surface | Strategy |
|---|---|
| Public product/category/seller pages | Next.js ISR, 5 min, plus tag-based revalidation on approve/reject/deactivate so an approval is live in seconds |
| `GET /api/v1/products` | `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` at Cloudflare |
| `/filters`, `/categories` | 10 min |
| Any authenticated route | `Cache-Control: private, no-store` — asserted by a test, because a cached dashboard leaking between users is the worst bug this app could have |
| Images | Immutable, 1 year, content-hashed keys |
