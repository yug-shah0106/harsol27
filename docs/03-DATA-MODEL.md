# 03 — Data Model

The Prisma schema is the **single source of truth**. Types are generated from it; no agent
hand-writes an entity interface. Change the schema → run `pnpm db:migrate` → regenerated types break
every stale call site at compile time, which is exactly what we want.

## 1. Entity overview

```
User ──1:1── SellerProfile ──*── Product ──*── ProductImage
 │                │                 │
 │                │                 └──*── Lead ──*── LeadEvent
 │                └──*── SellerCategory ──*── Category ──self──> Category (parent)
 │
 ├──*── Notification
 ├──*── PushSubscription
 ├──*── Session / VerificationToken     (Auth.js)
 └──*── AuditLog (actor)

Category ──*── Product
CmsPage        (standalone)
OtpChallenge   (standalone, short-lived)
ContactMessage (standalone, general Contact-Us form)
```

## 2. Schema

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"; url = env("DATABASE_URL") }

// ─────────────────────────── Identity ───────────────────────────

enum Role { BUYER SELLER ADMIN }

model User {
  id             String    @id @default(cuid())
  role           Role      @default(BUYER)
  email          String?   @unique          // optional: OTP-only buyers may have no email
  emailVerified  DateTime?
  phone          String?   @unique          // E.164, e.g. +919876543210
  phoneVerified  DateTime?
  name           String?
  passwordHash   String?                    // null for OTP-only buyers
  isActive       Boolean   @default(true)
  lastLoginAt    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  sellerProfile  SellerProfile?
  leads          Lead[]              @relation("BuyerLeads")
  notifications  Notification[]
  pushSubs       PushSubscription[]
  auditLogs      AuditLog[]          @relation("AuditActor")
  sessions       Session[]

  @@index([role, isActive])
}

// Auth.js tables (Session, VerificationToken) are added verbatim from the adapter docs.

// ─────────────────────────── Seller ───────────────────────────

enum SellerStatus { PENDING APPROVED REJECTED }

model SellerProfile {
  id              String       @id @default(cuid())
  userId          String       @unique
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  companyName     String
  slug            String       @unique          // company-name-a1b2, immutable once public
  contactPerson   String
  contactEmail    String                        // may differ from login email
  contactPhone    String                        // E.164 — THE protected field
  altPhone        String?
  whatsappPhone   String?
  description     String?      @db.Text
  logoKey         String?                       // R2 object key, not a URL
  addressLine     String?
  city            String
  state           String
  pincode         String?
  gstNumber       String?
  websiteUrl      String?

  status          SellerStatus @default(PENDING)
  rejectionReason String?
  approvedAt      DateTime?
  approvedById    String?
  isActive        Boolean      @default(true)   // admin deactivate, independent of status
  needsReview     Boolean      @default(false)  // set when company name is edited (SEL-06)

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  categories      SellerCategory[]
  products        Product[]
  leads           Lead[]

  @@index([status, isActive])
  @@index([city]) @@index([state])
}
```

**`isPubliclyVisible` is a derived rule, not a column:**
`status = APPROVED AND isActive = true`. It is expressed once, in
`server/modules/seller/repository.ts` as a reusable Prisma `where` fragment, and every public query
composes it. Duplicating this condition across queries is the most likely way a private seller leaks
into public results — so it exists in exactly one place, with its own unit test.

```prisma
// ─────────────────────────── Category ───────────────────────────

model Category {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  description String?
  iconKey     String?
  parentId    String?
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  sortOrder   Int        @default(0)
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  products    Product[]
  sellers     SellerCategory[]

  @@index([parentId, sortOrder])
  @@index([isActive])
}
```
Depth is capped at **two levels** (parent → child) and enforced in the service layer: a category
whose `parentId` is set may not itself be a parent. Arbitrary-depth trees make breadcrumbs,
filtering and admin UI three times the work for no benefit at this catalogue size.

```prisma
model SellerCategory {
  sellerId     String
  categoryId   String
  assignedAt   DateTime @default(now())
  assignedById String?
  seller       SellerProfile @relation(fields: [sellerId],   references: [id], onDelete: Cascade)
  category     Category      @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([sellerId, categoryId])
  @@index([categoryId])
}

// ─────────────────────────── Product ───────────────────────────

enum ProductStatus { DRAFT PENDING APPROVED REJECTED }
enum PriceUnit { PER_PIECE PER_KG PER_TON PER_METER PER_SQFT PER_LITRE PER_BOX PER_SET }

model Product {
  id              String        @id @default(cuid())
  sellerId        String
  seller          SellerProfile @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  categoryId      String
  category        Category      @relation(fields: [categoryId], references: [id])

  name            String
  slug            String        @unique        // product-name-a1b2
  description     String        @db.Text
  price           Decimal?      @db.Decimal(12, 2)
  priceUnit       PriceUnit?
  minOrderQty     Int?
  minOrderUnit    String?
  city            String
  state           String

  status          ProductStatus @default(PENDING)
  rejectionReason String?
  approvedAt      DateTime?
  approvedById    String?
  publishedAt     DateTime?                     // first approval — used for "newest" sort
  viewCount       Int           @default(0)
  leadCount       Int           @default(0)     // denormalised, kept in the lead transaction

  deletedAt       DateTime?                     // soft delete (SEL-07)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  images          ProductImage[]
  leads           Lead[]

  @@index([status, deletedAt, publishedAt(sort: Desc)])
  @@index([categoryId, status, deletedAt])
  @@index([sellerId, status, deletedAt])
  @@index([state, city])
}

model ProductImage {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  key       String                    // R2 key of the original
  alt       String?
  width     Int
  height    Int
  blurHash  String?                   // for a non-janky placeholder (CLS budget)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  @@index([productId, sortOrder])
}
```

### 2.1 Full-text search

Prisma cannot express a generated `tsvector`, so it is added in a hand-written migration:

```sql
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("name",'')),        'A') ||
    setweight(to_tsvector('simple', coalesce("description",'')), 'B')
  ) STORED;

CREATE INDEX product_search_idx ON "Product" USING GIN ("searchVector");
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX product_name_trgm_idx ON "Product" USING GIN ("name" gin_trgm_ops);
```

`'simple'` rather than `'english'` is deliberate: the catalogue is full of Hinglish, brand names,
alloy grades and part numbers, where English stemming does more harm than good. Queries run
full-text first and fall back to trigram similarity when it returns nothing — this is what makes
"bering" find "bearing" (SRC-01).

```prisma
// ─────────────────────────── Lead ───────────────────────────

enum LeadStatus { PENDING_VERIFICATION NEW VIEWED CONTACTED CLOSED SPAM }
enum LeadType   { PRODUCT_INQUIRY SELLER_INQUIRY REQUIREMENT }

model Lead {
  id             String        @id @default(cuid())
  type           LeadType      @default(PRODUCT_INQUIRY)

  productId      String?
  product        Product?      @relation(fields: [productId], references: [id], onDelete: SetNull)
  sellerId       String?
  seller         SellerProfile? @relation(fields: [sellerId], references: [id], onDelete: SetNull)
  buyerUserId    String?
  buyerUser      User?         @relation("BuyerLeads", fields: [buyerUserId], references: [id])

  // Snapshotted at submission: leads must survive product edits and deletions.
  buyerName      String
  buyerPhone     String
  buyerEmail     String?
  buyerCompany   String?
  buyerCity      String?
  quantity       String?
  message        String        @db.Text
  productNameAtInquiry String?

  status         LeadStatus    @default(PENDING_VERIFICATION)
  verifiedAt     DateTime?
  contactRevealedAt DateTime?
  repeatCount    Int           @default(1)     // LEAD-06 dedupe
  sellerNotes    String?       @db.Text

  ipHash         String?                        // hashed, for abuse analysis only
  userAgent      String?
  referrerPath   String?

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  events         LeadEvent[]

  @@index([sellerId, status, createdAt(sort: Desc)])
  @@index([productId, buyerPhone, createdAt])   // dedupe lookup
  @@index([status, createdAt(sort: Desc)])
}

model LeadEvent {
  id        String   @id @default(cuid())
  leadId    String
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  type      String                     // CREATED | VERIFIED | REVEALED | STATUS_CHANGED | NOTE_ADDED
  actorId   String?
  meta      Json?
  createdAt DateTime @default(now())

  @@index([leadId, createdAt])
}
```

Buyer details are **snapshotted onto the Lead**, not joined from `User`. A lead is a commercial
record of what was said at a point in time; if the buyer later edits their profile or a product is
deleted, the seller's lead history must not silently change underneath them.

```prisma
// ─────────────────────────── OTP ───────────────────────────

enum OtpPurpose { LEAD_VERIFICATION BUYER_LOGIN PHONE_CHANGE }

model OtpChallenge {
  id          String     @id @default(cuid())
  purpose     OtpPurpose
  channel     String                     // SMS | EMAIL
  destination String                     // E.164 phone or email
  codeHash    String                     // bcrypt — the plaintext is never stored or logged
  payload     Json?                      // pending lead data, held until verification
  attempts    Int        @default(0)
  maxAttempts Int        @default(5)
  consumedAt  DateTime?
  expiresAt   DateTime                   // now + 10 min
  createdAt   DateTime   @default(now())

  @@index([destination, purpose, createdAt])
  @@index([expiresAt])
}

// ─────────────────────── Notifications ───────────────────────

enum NotificationType {
  SELLER_APPROVED SELLER_REJECTED PRODUCT_APPROVED PRODUCT_REJECTED
  NEW_LEAD CATEGORY_ASSIGNED
  ADMIN_NEW_SELLER ADMIN_NEW_PRODUCT ADMIN_NEW_LEAD
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  body      String
  linkUrl   String?
  entityId  String?
  readAt    DateTime?
  createdAt DateTime         @default(now())

  @@index([userId, readAt, createdAt(sort: Desc)])
}

model EmailLog {
  id         String    @id @default(cuid())
  to         String
  template   String
  subject    String
  providerId String?
  status     String                       // QUEUED | SENT | FAILED | BOUNCED
  error      String?
  attempts   Int       @default(0)
  sentAt     DateTime?
  createdAt  DateTime  @default(now())

  @@index([to, createdAt]) @@index([status])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId])
}

// ─────────────────────────── CMS & misc ───────────────────────────

model CmsPage {
  id           String   @id @default(cuid())
  slug         String   @unique          // about-us | contact-us | privacy-policy | terms-conditions
  title        String
  contentHtml  String   @db.Text         // sanitised server-side before write
  metaTitle    String?
  metaDesc     String?
  updatedById  String?
  updatedAt    DateTime @updatedAt
}

model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  phone     String?
  subject   String?
  message   String   @db.Text
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([isRead, createdAt(sort: Desc)])
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  actor      User?    @relation("AuditActor", fields: [actorId], references: [id])
  action     String                       // SELLER_APPROVED | PRODUCT_REJECTED | CATEGORY_DELETED …
  entityType String
  entityId   String
  before     Json?
  after      Json?
  reason     String?
  ipHash     String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId, createdAt(sort: Desc)])
  @@index([actorId, createdAt(sort: Desc)])
}

model Setting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

## 3. Slugs

`slugify(name) + "-" + 4-char nanoid`, e.g. `ss-304-sheet-2mm-k3xq`. The suffix guarantees
uniqueness without a retry loop and without leaking sequential IDs. A product slug is **frozen after
first approval** so external links and search rankings never break; renaming afterwards changes only
the display name.

## 4. State machines

Enforced in `server/modules/<domain>/policy.ts`. Any transition not listed returns **409 Conflict**.
Each machine has a table-driven unit test that asserts every illegal transition is rejected — the
cheapest bug prevention in the whole project.

### 4.1 Seller

```
                 ┌──── reject(reason) ────► REJECTED ──── re-apply ────┐
                 │                                                      ▼
  (register) ──► PENDING ──── approve ────► APPROVED                 PENDING
                                              │  ▲
                     deactivate  isActive=false│  │isActive=true  activate
                                              ▼  │
                                          APPROVED (hidden)
```
- `PENDING → APPROVED` requires at least one assigned category, otherwise the seller lands in a
  dashboard that cannot do anything. The admin UI enforces assign-then-approve in one step.
- Deactivation is **orthogonal** to status (`isActive`), so reactivating restores the previous state
  rather than requiring re-approval.
- On `APPROVED → REJECTED` or deactivation, all of that seller's products leave public view
  immediately — enforced by the shared visibility fragment, not by mutating each product.

### 4.2 Product

```
  (create draft) ──► DRAFT ──submit──► PENDING ──approve──► APPROVED
                                          │                    │
                                    reject(reason)        seller edits
                                          ▼                    │
                                      REJECTED ──edit+resubmit─┘► PENDING
```
- **A seller editing an approved product returns it to `PENDING` and delists it.** This is the
  correct behaviour for a curated marketplace, and it is also the behaviour sellers complain about
  most. Mitigation: an "edit" that touches only price, MOQ or images can stay approved (configurable
  in `Setting`, default: name/description/category edits re-review, price/MOQ/image edits do not).
- `publishedAt` is set on the *first* approval only, so re-approval does not jump a product back to
  the top of "newest".
- Delete is soft (`deletedAt`); leads keep `productNameAtInquiry`.

### 4.3 Lead

```
  submit ──► PENDING_VERIFICATION ──OTP ok──► NEW ──seller opens──► VIEWED
                    │  (expires 24h, purged)                          │
                    └──────────────────────────────► (never notifies) ▼
                                                     CONTACTED ──► CLOSED
                                          any state ──admin──► SPAM
```
Only `NEW` triggers notifications. `PENDING_VERIFICATION` rows older than 24 h are purged nightly —
they contain an unverified phone number and have no business value.

## 5. Seed data

`prisma/seed.ts` must produce a database an agent can verify against and a client can demo from:

- 1 admin (`admin@example.com`), 3 buyers.
- 12 sellers: 8 approved+active, 2 pending, 1 rejected, 1 approved-but-deactivated.
- 18 categories across 5 parents.
- 120 products: ~85 approved, 20 pending, 10 rejected, 5 soft-deleted — deliberately spread across
  sellers, cities and states so filters and pagination have something real to bite on.
- 40 leads across every status, some clustered on one product to exercise dedupe.
- The 4 CMS pages with real placeholder copy including the liability disclaimer.
- Deterministic: fixed seed, so E2E assertions on counts are stable.

Seeded images are 6–8 small local WebP files reused across products. Never fetch remote placeholder
images in seed — it makes CI flaky and offline development impossible.

## 6. Retention & privacy

| Data | Retention | Note |
|---|---|---|
| `OtpChallenge` | Purge consumed/expired nightly | Never log the code |
| `Lead` in `PENDING_VERIFICATION` | 24 h | Unverified personal data |
| `Lead` verified | Life of the account | It is the seller's commercial record |
| `EmailLog` | 90 days | |
| `AuditLog` | 3 years | Dispute evidence |
| IP addresses | Stored **hashed with a server-side pepper**, never raw | Abuse analysis without holding identifiers |

Buyer personal data (name, phone, email) is disclosed to exactly one seller — the one they inquired
with. The Privacy Policy page must say this in plain language, and a deletion-request route
(`DELETE /api/v1/account`) anonymises the buyer's leads rather than deleting them, preserving the
seller's records while removing the identity.
