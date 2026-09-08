# 08 — AI Build Playbook

How this project actually gets built end-to-end by AI agents. The premise: an AI agent writes code
far faster than a human but has no memory between tasks and no instinct for a codebase's unwritten
conventions. So the job is to make the conventions **written, mechanical and enforced** — then let
the agents run.

Three principles the rest of this document implements:

1. **Constrain the space before generating.** Tokens, schema, error contract and folder layout exist
   before any feature. An agent given a blank slate invents; an agent given a groove follows it.
2. **The gate is a command, not an opinion.** `pnpm verify` decides whether work is done. No agent
   self-reports success.
3. **Vertical slices, one at a time.** Migration + service + API + UI + tests in one task. Layer-wise
   generation produces impressive-looking code that has never once run end to end.

---

## 1. Repository contract

`CLAUDE.md` at the repo root, loaded into every agent's context. Short — a long one gets skimmed.

```markdown
# Build rules — read before writing code

## Non-negotiable
1. Never hardcode a colour. Use tokens from `styles/tokens.css`. ESLint will fail you.
2. Never put business logic in a route handler or a server component.
   Handler = parse (zod) → call service → shape response. Logic lives in
   `src/server/modules/<domain>/service.ts`; authorisation in `policy.ts`.
3. Never hand-write a DB type. Change `prisma/schema.prisma`, run `pnpm db:migrate`.
4. Never expose seller contact from a public route. Use `toPublicSeller()`.
5. Never `outline: none` without a replacement focus style.
6. Every list UI ships with empty, loading and error states in the same commit.
7. Validate with zod at every boundary; share the schema between form and handler.
8. `pnpm verify` must pass before you claim a task is done.

## Where things go
- Public pages `src/app/(public)/` · Seller `(seller)/seller/` · Admin `(admin)/admin/`
- API `src/app/api/v1/<resource>/route.ts`
- Domain logic `src/server/modules/<domain>/{service,repository,schema,policy}.ts`
- Shared UI `src/components/ui/` (do not modify without a design-system reason)
- Feature UI `src/components/{marketplace,dashboard,layout}/`
- Tests beside the unit, E2E in `tests/e2e/`

## Conventions
- Components PascalCase; hooks `useX`; server functions verb-first (`approveSeller`).
- Server Components by default. `'use client'` only for interactivity, as deep in the tree as possible.
- All money is `Decimal`; all dates UTC in the DB, rendered in IST.
- Phones stored E.164; rendered as `+91 98765 43210`.
- Errors: throw a typed `AppError`; middleware maps it to the contract in docs/04.

## Before you start
Read `docs/01-PRD.md` for the requirement ID in your task, and the doc section it references.
```

## 2. Guardrails that make AI output trustworthy

| Guardrail | What it prevents |
|---|---|
| TypeScript `strict` + `noUncheckedIndexedAccess` | The confident `arr[0].name` that crashes on an empty list |
| Prisma-generated types | Drifted hand-written interfaces |
| zod at every boundary | Trusting client input; duplicated validation rules |
| `no-restricted-syntax` hex-literal rule | Forty slightly different blues from six parallel agents |
| `eslint-plugin-jsx-a11y` | Missing labels, div-buttons, unlabelled icons |
| `import/no-restricted-paths` — UI may not import Prisma | The gradual dissolution of the layer boundary |
| Deterministic seed | Flaky E2E assertions |
| `OTP_PROVIDER=console` | Real SMS spend in CI |
| Lighthouse CI budget | Silent performance regression across 200 commits |
| Pre-commit hook (typecheck + lint on staged) | Broken `main` |

### The `verify` script

```json
{
  "verify": "pnpm typecheck && pnpm lint && pnpm test:unit && pnpm build && pnpm test:e2e",
  "typecheck": "tsc --noEmit",
  "test:unit": "vitest run --coverage",
  "test:e2e": "playwright test",
  "db:reset": "prisma migrate reset --force && prisma db seed"
}
```

An agent that cannot make this pass has not finished, regardless of how complete the diff looks.

## 3. Task format

Every task is a file in `docs/tasks/PHASE-<n>/<ID>-<slug>.md`. Uniform shape so agents never guess:

```markdown
# T-2.03 — Product image upload pipeline

**Phase** 2 · **Requirements** SEL-09 · **Depends on** T-2.01 (product CRUD)
**Docs** `03-DATA-MODEL.md` §2 (ProductImage) · `04-API-SPEC.md` §7 · `05-DESIGN-SYSTEM.md` §6.2

## Goal
A seller uploads 1–8 product images from a phone; they are stored optimised and reorderable.

## Scope
- `POST /api/v1/uploads/presign`, `POST /seller/products/:id/images`,
  `PATCH …/images/reorder`, `DELETE …/images/:imageId`
- `src/server/lib/storage.ts` (R2), `src/server/lib/image.ts` (sharp)
- `<ImageUploader>` — drag-reorder, progress, client-side compression

## Out of scope
Product CRUD (T-2.01). Public gallery (T-3.04).

## Acceptance criteria
- [ ] JPEG/PNG/WebP/HEIC accepted; ≤10 MB each; ≤8 per product
- [ ] Magic bytes verified server-side; a renamed `.exe` is rejected with 400
- [ ] Derivatives at 1600/800/400/160 px WebP; EXIF stripped; blurhash stored
- [ ] Reorder persists; index 0 is the thumbnail
- [ ] Deleting the last image returns 409
- [ ] Unclaimed presigned keys are swept after 24 h
- [ ] Uploader is keyboard-operable (reorder via arrow keys), 44px targets

## Tests
- unit: `image.spec.ts` (magic bytes, resize, EXIF strip)
- unit: `policy/product-image.spec.ts` (ownership, count cap)
- e2e: `seller-add-product.spec.ts` — upload 3 fixtures, reorder, delete one

## Definition of done
`pnpm verify` green · acceptance criteria ticked · no hex literals · docs updated if the API changed
```

Tasks are generated once per phase, in a planning pass, before any implementation begins.

## 4. Agent orchestration

The work is run in **Conductor workspaces — one workspace per parallel track**, each on its own
branch. Parallelism is only safe where tracks do not share files; the split below is chosen for
exactly that.

### Sequential (single agent, shared foundations)
Phase 0 and Phase 1 are built by one agent. They define the conventions every later agent copies;
parallelising them produces two incompatible interpretations of the same spine.

### Parallel from Phase 2 onward

| Track | Owns | Touches |
|---|---|---|
| **A — Catalogue & seller portal** | Product CRUD, images, seller dashboard | `modules/product`, `(seller)/*` |
| **B — Public site & search** | Home, listing, detail, seller profile, SEO | `(public)/*`, `components/marketplace` |
| **C — Admin panel** | Moderation, categories, CMS, admin dashboard, admin users & roles | `(admin)/*`, `modules/category`, `modules/cms`, `modules/adminuser` |
| **E — Subscription validity** | Terms, expiry sweep, reminders, admin controls | `modules/subscription`, `(admin)/admin/subscriptions` |
| **D — Leads & notifications** | Inquiry, OTP, notifications, email templates | `modules/lead`, `modules/notification`, `emails/` |

Rules that keep four agents from fighting:
1. **A track owns its folders.** Cross-folder changes go through a shared-interface task, merged
   first, by one agent.
2. **Shared primitives (`components/ui`) are frozen after Phase 0.** Changing one is its own task
   with its own review.
3. **Migrations are serialised.** One agent at a time; the others rebase. Concurrent Prisma
   migrations are the single worst merge conflict in this stack.
4. **Merge to `main` daily**, small. A four-day-old AI-generated branch is unreviewable.
5. Each track's E2E specs are separate files, so Playwright runs stay conflict-free.

### The review loop

Every task, without exception:

```
implement → pnpm verify → /code-review → fix → /security-review (auth/lead/upload tasks)
         → human skim of the diff → merge
```

`/code-review` catches the things an author-agent cannot see in its own work. The **human skim is
not optional** — not for correctness, which the gates cover, but for judgement: is this the feature
that was asked for, and does it feel right. Reviewing every line of AI output is impossible at this
velocity; reviewing every *decision* is not.

Additional targeted reviews:
- `/security-review` on anything touching auth, leads, uploads or admin mutations.
- Manual verification against `05-DESIGN-SYSTEM.md` for any new screen — screenshot in the PR.

## 5. Prompt templates

**Phase kickoff (planning agent, no code):**
> Read `docs/01-PRD.md`, `docs/03-DATA-MODEL.md`, `docs/04-API-SPEC.md` and `docs/07-ROADMAP.md`
> Phase N. Produce one task file per vertical slice in `docs/tasks/PHASE-N/`, using the template in
> `docs/08-AI-BUILD-PLAYBOOK.md` §3. Each task must be completable in one session and independently
> verifiable. Declare dependencies between tasks explicitly. Write no implementation code.

**Implementation:**
> Implement `docs/tasks/PHASE-2/T-2.03-product-images.md`. Follow `CLAUDE.md`. Read the doc sections
> the task references before writing code. Build the vertical slice: migration → service → policy →
> route → UI → tests. Run `pnpm verify` and fix everything it reports. Then list the acceptance
> criteria with evidence for each.

**UI implementation:**
> Build `<ComponentName>` per `docs/05-DESIGN-SYSTEM.md` §X. Use only tokens — a hex literal fails
> lint. Compose from `components/ui` primitives; do not add a UI library. Include empty, loading and
> error states. Keyboard-operable, 44px minimum targets, visible focus. Verify in light and dark.

**Debugging:**
> `pnpm test:e2e` fails at `<spec>:<line>`. Reproduce it, find the root cause, and state it before
> changing anything. Fix the cause, not the assertion. If the test is wrong, say so and explain why
> before editing it.

**Review:**
> Review this diff against `docs/01-PRD.md` <ID> and `CLAUDE.md`. Check specifically: business logic
> outside the service layer; missing authorisation; hardcoded colours; missing empty/loading/error
> states; unvalidated input; any path where seller contact could reach a public response.

## 6. Failure modes and their countermeasures

| Failure mode | Countermeasure |
|---|---|
| Agent declares done with failing tests | `pnpm verify` output must be pasted in the PR; CI blocks merge |
| Agent invents a component library mid-project | Primitives frozen after Phase 0; new deps need a task |
| Agent reimplements an existing utility | `CLAUDE.md` file map; `/code-review` flags duplication |
| Agent skips authorisation on a new route | `policy.ts` is a required file per module; auth tasks get `/security-review` |
| Agent writes tests that assert current behaviour rather than the requirement | Acceptance criteria are written **before** implementation, in the task file |
| Agent's UI drifts from the design | Tokens + lint rule + screenshot in every UI PR |
| Context lost between sessions | Task files are the memory; `docs/` is the brief; `CLAUDE.md` is always loaded |
| Silent scope creep ("I also added…") | Task files have an explicit **Out of scope** section |

## 7. What AI should not be trusted to decide alone

Flagging this plainly, because "E2E build using AI" invites the assumption that no human judgement
is required. These need a person:

- **The legal copy** — Privacy Policy and T&C. The liability disclaimers are the client's protection
  in a real dispute. AI drafts them; a human (ideally the client's advisor) approves them.
- **Whether the OTP gate is worth its conversion cost.** That is a business trade-off read from
  funnel data, not a code decision.
- **Production credentials and DNS cutover.** One person owns these.
- **The backup restore rehearsal.** Verify the restored data by looking at it.
- **Rejection-email tone.** Rejecting a community member's application badly is a reputational
  problem the community office will hear about.
- **Accepting the hosting budget gap** (`00-SCOPE-RECONCILIATION.md` §D).
- **Extending a real seller's validity.** Money changes hands off-platform; the admin's click is the
  record of it. That is a human action with a human audit trail, by design.

## 8. Estimated AI effort

Rough, for planning. "Sessions" means focused agent sessions including review and rework.

| Phase | Sessions | Wall-clock with 1–2 parallel tracks |
|---|:--:|---|
| 0 — Foundations | 6–8 | 2–3 days |
| 1 — Identity & approval spine | 10–12 | 4–5 days |
| 2 — Catalogue | 12–14 | 4–5 days |
| 3 — Public & search | 12–14 | 4–5 days |
| 2b — Subscription validity | 4–5 | 2 days |
| 4 — Leads & notifications | 14–16 | 5–6 days |
| 5 — PWA, perf, a11y | 6–8 | 2 days |
| 6 — Hardening & launch | 10–14 | 7–10 days (dominated by client UAT latency, not engineering) |
| **Total** | **74–91** | **≈ 5.5 weeks engineering inside a 7.5-week calendar** |

The gap between 5.5 and 7.5 weeks is the buffer. Phase 6 is deliberately the least compressible: it is
gated on the client's availability, not on how fast code can be written.
