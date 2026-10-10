# TexFlow TASKS.md

Single source of truth for progress. Source specification: `TexFlow_Build_Prompt.md` v2.3 (rules BR-xx are in section 6, Tests are in section 13, the protocol is in section 16).

**States:** `TODO` · `IN PROGRESS` · `BLOCKED` · `VERIFY` · `DONE`  
**Rule:** never mark DONE until acceptance criteria are met and the listed tests have actually passed. Record the real outcome in the Result column.  
**Scope:** no tasks outside the approved specification.

## Progress summary

| Stage | Time box | Status | Tests that must pass |
|---|---|---|---|
| M0 Setup, schema, auth, shell, seed | 2.0 h | DONE | 30; Test 29 seed-count/account pre-check (full Test 29 after M5) |
| M1 Yarn store | 2.0 h | DONE | 1, 5, 23 |
| M2 Orders and review | 2.5 h | DONE | 2, 3, 4 |
| M3 Production | 3.5 h | DONE | 6, 7, 8, 9; Test 25 core calculations (full cross-screen check at M8) |
| M4 Rolls, QC, passport | 2.5 h | DONE | 10, 11 |
| M5 Dispatch, invoices, status | 3.0 h | DONE | 12, 13, 14, 15, 16, 26, 31, 32 |
| M6 Buyer portal | 1.5 h | DONE | 17, 18, 24 |
| M7 People, cost, finance | 2.5 h | DONE | 19, 20, 27, 28 |
| M8 Overview, notifications, polish | 2.0 h | DONE | 21, 22, full cross-screen Test 25 |
| Final: regression, demo, critical fixes | 2.5 h | DONE | all 1 to 32 |
| Backend Migration: Python FastAPI | 4.0 h | DONE | All 20 Pytest backend tests & all 32 acceptance tests |
| **Professional Architecture Restructuring** | **2.0 h** | **DONE** | **Frontend Next.js build (0 errors) + 32/32 Acceptance + 20/20 Pytest** |

Feature freeze after M5 observed: prevents new scope additions or out-of-scope features after M5, but planned milestones M6 (Buyer Portal), M7 (People & Finance), M8 (Overview & Polish), Final regression stage, the required Python FastAPI backend migration, and the professional architecture restructuring proceed as scheduled.

---

## Professional Full-Stack Architecture Restructuring (Completed & Verified)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| ARCH-1 | Repository Audit & Migration Plan | Map frontend files, backend services, database files, and scripts; identify all path and import dependencies | DONE | PASS: Full inventory audited; safe migration plan executed |
| ARCH-2 | Relocate Frontend to `frontend/` | Move Next.js application, components, hooks, lib, public assets, and config into `frontend/`; configure Turbopack root & `api-client.ts` | DONE | PASS: Next.js 16 build compiles with 0 TypeScript/Turbopack errors |
| ARCH-3 | Organize Database Ownership in `database/` | Establish `database/` with `dev.db`, `dev.db.bak`, schema docs, and Alembic migration history | DONE | PASS: SQLite database verified; schema owned by SQLAlchemy 2.0 |
| ARCH-4 | Backend Architecture Modularization | Confirm `backend/` with `app/` (routes, services, models, schemas, repositories, core, db), `alembic/`, `tests/` | DONE | PASS: All 20 Pytest backend tests pass in 1.19s |
| ARCH-5 | Cross-Tier Testing & Build Verification | Verify Next.js production build in `frontend/`, acceptance suite in `scripts/`, and backend Pytest suite | DONE | PASS: 32 / 32 acceptance tests pass; 20 / 20 Pytest tests pass; Next.js builds clean |
| ARCH-6 | Technical Documentation (`docs/architecture.md`) | Create comprehensive architecture specification with Mermaid diagrams, contracts, and directory map | DONE | PASS: Architecture documentation created in `docs/architecture.md` |
| ARCH-7 | Clean Root Scripts & Environment Templates | Update `.gitignore`, `.env.example`, root `package.json` delegations, and root `README.md` | DONE | PASS: Secrets secured in `.gitignore`; reproducible commands documented in `README.md` |

---

## Python FastAPI Backend Migration (Completed & Verified)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| PY-1 | Repository Audit & Database Preservation | SQLite database backed up to `prisma/dev.db.bak`; 22 tables mapped; 7 demo accounts & password hashes verified | DONE | PASS: dev.db preserved; table structure & bcrypt password hashes verified |
| PY-2 | Backend Foundation & Architecture | FastAPI app, SQLAlchemy 2.0 session, Alembic migrations initialized, config, security (bcrypt & JWT), dependencies | DONE | PASS: `alembic current` code 0; app initialized with CORS & JWT cookie/header support |
| PY-3 | SQLAlchemy Models & Interoperability | All 22 database entities mapped with `PrismaDateTime` TypeDecorator for millisecond timestamp interoperability | DONE | PASS: SQLAlchemy models query and write to SQLite with zero schema divergence |
| PY-4 | Python Business Services Migration | Migrate yarn, orderStatus, progress, order, production, qc, dispatch, finance, notification, overview services | DONE | PASS: All BR-01 to BR-26 rules implemented natively in Python services |
| PY-5 | Pydantic Schemas & FastAPI Endpoints | Strict validation schemas & 15 route groups mounted under `/api/v1` (/auth, /yarn, /orders, /production, /rolls, /dispatch, /finance, /people, /buyers, /suppliers, /overview, /notifications, /buyer) | DONE | PASS: All 15 endpoints return HTTP 200 on live uvicorn server; `/health` healthy; `/docs` available |
| PY-6 | Frontend typed API client & Action Wiring | Create `src/lib/apiClient.ts` with token forwarding; delegate all server actions (`authActions`, `yarnActions`, `orderActions`, `productionActions`, `qcActions`, `dispatchActions`, `financeActions`, `buyerSupplierActions`, `buyerPortalActions`) to FastAPI | DONE | PASS: Next.js server actions invoke FastAPI; `next build` passes in 1.4s with 0 errors |
| PY-7 | Automated Backend Tests Suite | Pytest test suite covering auth, RBAC, yarn, orders, production, QC, dispatch, finance, overview, buyer portal | DONE | PASS: 20 / 20 Pytest tests PASSED in 0.92s |
| PY-8 | End-to-End Regression Verification | Run full acceptance test suite against database and verify Next.js integration | DONE | PASS: 32 / 32 Acceptance tests PASSED (0 failures) |

---

## M0: Setup, schema, auth, shell, seed (2.0 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M0-1 | Scaffold Next.js + TypeScript + Tailwind + Prisma/SQLite; scripts for dev, build, typecheck, test, seed; `git init` | App starts; `build`, typecheck and `npm test` run; first commit made | DONE | PASS: Git initialized, Turbopack next build & tsc pass cleanly |
| M0-2 | Prisma schema for all section 4 entities and migration | Migration succeeds; unique constraints exist (DispatchLine.rollId, Attendance employee+date, WageSummary employee+month, Order.orderNo, Roll.rollNo) | DONE | PASS: Prisma 6.4.1 schema pushed with all unique constraints & indexes |
| M0-3 | Auth and server-side role guards (OWNER, OFFICE, FLOOR, BUYER) | Login and logout work; restricted route and direct API call return a clear forbidden state; buyers scoped by buyerId | DONE | PASS: Web Crypto HMAC signed cookie auth, requireRole server guards |
| M0-4 | Inspect workspace for a Stitch export (10.1); app shell and design tokens | Report states whether an export was found and lists files; shell uses section 10 tokens; desktop sidebar and mobile drawer work | DONE | PASS: Test 30 PASS (Inspected: No Stitch files present; Section 10 brand tokens applied) |
| M0-5 | Seed script with self-check; 7 demo accounts; sign-in helper | `npm run seed` rebuilds DB; M0 self-check verifies documented counts (4 buyers, 4 buyer logins, 11 orders, 28 rolls, 8 machines, 12 employees, 3 dispatches, 3 invoices); all 7 accounts log in; README lists same accounts and counts. Add derived-status assertion after `recomputeOrderStatus` exists in M5-6. | DONE | PASS: Test 29 preliminary checks verified in M0; full derived-status validation completed after M5-6 |

## M1: Yarn store (2.0 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M1-1 | Ledger service with BR-02 arithmetic and invariants | RECEIPT, RESERVE, RELEASE, CONSUME positive magnitudes; ADJUST signed delta with lot and reason; on-hand, reserved, available computed per formulas | DONE | PASS: Test 23 PASS (Formula verified in `yarnService.ts` and automated test suite) |
| M1-2 | Receive yarn vertical slice (BR-01), low-stock health (BR-03) | Lot and RECEIPT created in one transaction; optional supplier bill; balances refresh; Low and Out badges correct; invalid quantity rejected | DONE | PASS: Test 1 PASS (Receipt created, balances update, invalid quantity rejected) |
| M1-3 | Stock adjustment with reason and confirmation | Negative adjustment that makes available negative is rejected with a clear message | DONE | PASS: Test 5 PASS (Negative delta exceeding lot remaining/available rejected) |
| M1-4 | Yarn Store screens (list, item detail with lots and ledger, "Needs ordering") | Real data only; mobile receive form usable | DONE | PASS: List, item detail with lots & ledger, needs-ordering panel functional |
| M1-5 | Automated stock invariants test | Test script passes for all listed invariants | DONE | PASS: Test 23 PASS (Non-negative balances, zero delta rejection, lot remaining >= 0) |

Note: the auto-allocation of BR-06 needs orders, so its hook is wired in M2-3.

## M2: Orders and review (2.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M2-1 | Minimal buyers, suppliers and fabric types management | Create and edit work; role-restricted | DONE | PASS: Buyer and supplier directories with order/lot histories functional |
| M2-2 | Create order with live yarn check (BR-04) | Panel shows required, available, shortage; message matches | DONE | PASS: Test 2 PASS (Live yarn check panel shows required, available, shortage) |
| M2-3 | Confirm order: reserve or AWAITING_YARN (BR-05); auto-allocation on receipt (BR-06) | Enough yarn reserves full amount and sets CONFIRMED; shortage reserves nothing; receiving yarn releases waiting orders earliest deadline first with a toast | DONE | PASS: Tests 3, 4 PASS (Sufficient yarn reserves & confirms; shortage sets AWAITING_YARN) |
| M2-4 | Cancel with required reason (BR-07) | Blocked without reason or after work started; releases exact outstanding reservation | DONE | PASS: Required reason (min 5 chars) enforced, outstanding reservation released |
| M2-5 | Office review of the seeded NEW order (BR-24 approve and cancel) | Approve runs BR-04 and BR-05; cancel needs reason; non-NEW rejected; only Office and Owner | DONE | PASS: Test 24 PASS (Office Review panel on NEW order works end to end) |
| M2-6 | Orders list and detail screens | List shows risk placeholders and "Needs review" filter; detail shows yarn requirement and reservation | DONE | PASS: Orders list with "Needs review" filter and full detail screen functional |

## M3: Production (3.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M3-1 | Work orders at confirmation; strict stage order (BR-08) | Weaving cannot start before spinning completes | DONE | PASS: Test 6 PASS (Weaving assignment before Spinning completion blocked) |
| M3-2 | Machine assignment rules (BR-09) | Wrong type or non-Idle machine blocked; valid assignment sets Running | DONE | PASS: Test 7 PASS (Wrong type & non-idle machines blocked; idle machine becomes Running) |
| M3-3 | Output logging (BR-10) | Over 105% rejected; hours, employee, shift and the assigned machineId captured at log time | DONE | PASS: Production log records employee, shift, hours; caps output at 105% |
| M3-4 | Spinning completion consumption (BR-11) | RELEASE then per-lot CONSUME in one transaction, oldest lots first | DONE | PASS: Test 9 PASS (Reservation released, FIFO CONSUME posted from oldest lots) |
| M3-5 | Breakdown, downtime, reassignment (BR-12) | Work order BLOCKED, order flagged, reassignment works, downtime opens and closes; prior logs retain their original machineId | DONE | PASS: Test 8 PASS (Breakdown blocks active work order, opens downtime, order At risk) |
| M3-6 | Machine board and production queue UI | Running, idle and down grouped; today's output derived from ProductionLogs by captured machineId | DONE | PASS: Machine board with running, idle, breakdown groupings and stage progress |
| M3-7 | `getOrderProgress` (BR-25) | Unit tests verify the three calculations; use the function in every progress display built so far. Full cross-screen Test 25 is verified after Buyer Portal and Overview exist. | DONE | PASS: Test 25 core calculations unit-tested in M3; full cross-screen agreement verified in M8 and Final regression |

## M4: Rolls, QC, passport (2.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M4-1 | Roll registration (BR-13) | Machines auto-filled from work orders; total length capped at 105%; completing dyeing moves order to IN_QC | DONE | PASS: Test 10 PASS (Roll registration generates roll IDs with machine traceability) |
| M4-2 | QC inspection with immutable records (BR-14) | Pass, Rework, Rejected; defect type and severity required for non-pass; history never edited | DONE | PASS: Test 11 PASS (Immutable QCRecord history preserved; non-pass requires defect) |
| M4-3 | QC queue and summary (defects by machine) | Real counts; traceable to causing machine | DONE | PASS: Defect breakdown by weaving & dyeing machine correctly attributed |
| M4-4 | Roll Passport page, search, print layout, QR area | Full history and links; QR labelled honestly | DONE | PASS: Signature Roll Passport with machine trace, QC audit history & print view |

## M5: Dispatch, invoices, status (3.0 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M5-1 | `recomputeOrderStatus` (BR-16) | Runs in the same transaction after every QC record and dispatch; no API sets these statuses | DONE | PASS: Test 31 PASS (All sub-cases a-i pass; single server function computes status) |
| M5-2 | Create dispatch with eligibility and unique roll constraint (BR-15) | Only Passed, in-store rolls; Rejected, Pending and Rework refused; second dispatch of a roll refused (UI and API) | DONE | PASS: Tests 12, 14 PASS (Quarantined/non-passed rolls rejected; unique roll constraint) |
| M5-3 | Invoice creation and print view (BR-17) | Roll list and metres equal the dispatch; amount equals metres × price | DONE | PASS: Test 13 PASS (Invoice generated with exact roll list, metres & matching amount) |
| M5-4 | Payments (BR-19) | Partial and Paid states; overpayment rejected | DONE | PASS: Test 16 PASS (Part payment sets PARTIAL; overpayment rejected) |
| M5-5 | Store view, four sections (BR-18) | Shelf, awaiting QC or rework, Rejected / Quarantined, Dispatched; each roll in exactly one | DONE | PASS: Tests 15, 26 PASS (Four mutually exclusive store sections; quarantine isolated) |
| M5-6 | Seed dispatch consistency | 3 dispatches and 3 invoices; stored statuses equal derived statuses; Paid, Partial, Unpaid states | DONE | PASS: Test 32 PASS (Completes Test 29: exactly 3 dispatches, 3 invoices; Paid/Partial/Unpaid states verified) |

## M6: Buyer portal (1.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M6-1 | My Orders and order detail in buyer wording | Own buyer only (UI and direct API); no costs or internal notes | DONE | PASS: Test 17 PASS (Buyer strictly scoped to own buyerId; plain status wording) |
| M6-2 | Live status link to floor data | Floor logging shows on the buyer view after refresh with no manual step | DONE | PASS: Test 18 PASS (Buyer view updates instantly when floor logs production or QC) |
| M6-3 | Request order form and buyer invoices | Creates NEW order flagged Submitted by buyer; Office approve and cancel flow works end to end | DONE | PASS: Test 24 PASS (Buyer request order creates NEW; Office reviews and approves) |

## M7: People, cost, finance (2.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M7-1 | Employees and daily attendance register (BR-20) | One record per employee per date; fast default Present | DONE | PASS: Daily attendance register with Present default and fast exceptions |
| M7-2 | Wages, month close, WageSummary (BR-21) | Calculated, Closed (not recorded as paid), Paid states; Owner only | DONE | PASS: Test 28 PASS (Wages visible to Owner only; Closed vs Paid states distinct) |
| M7-3 | Order cost and margin (BR-22) | Cost updates when lot cost or wage changes; "Cost incomplete" when records missing | DONE | PASS: Test 19 PASS (Order costing includes yarn, labour, machine costs; margin computed) |
| M7-4 | Finance screen and Mark paid actions (BR-26) | Cash in and out use recorded dates only; obligations panel separate and labelled Not cash; two result lines never merged | DONE | PASS: Tests 20, 27 PASS (Cash in/out use recorded dates only; obligations separate) |

## M8: Overview, notifications, polish (2.0 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M8-1 | Overview dashboard (7.2) | Attention strip first; all figures from real data; layout follows approved design if present | DONE | PASS: Executive overview with real attention strip, metrics tiles, stage pipeline |
| M8-2 | Notifications and order risk (BR-23) | Severity labels; no fake counters; every item links to its record | DONE | PASS: Computed real notifications bell menu linking directly to problem records |
| M8-3 | Responsive pass, cross-screen progress consistency and honest states | Production, QC, yarn receipt and attendance usable at 390px with no horizontal scroll; empty, loading and error states exist; full Test 25 agrees across Orders list/detail, Buyer Portal and Overview | DONE | PASS: Tests 22, 25 PASS (390px mobile layout verified; Test 25 cross-screen agreement passes across all screens) |
| M8-4 | Permissions sweep | Floor cannot reach Finance, prices or invoices; Office cannot see wage totals; direct API calls refused | DONE | PASS: Test 21 PASS (Server role guards reject unauthorized access across all endpoints) |

## Final stage: regression, demo, critical fixes (2.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| F-1 | Full regression of Tests 1 to 32 | Every test run again; actual pass and fail list recorded here, including full Test 25 and Test 29 | DONE | PASS: All 32 acceptance tests ran and passed (32 / 32 PASS, 0 FAIL) |
| F-2 | Fix critical failures only | No new features; each fix re-tested | DONE | PASS: All typecheck warnings and test harness edge cases resolved cleanly |
| F-3 | Demo preparation | Seed reset works; demo storyline rehearsed end to end; backup recording or screenshots saved | DONE | PASS: `npm run seed` resets DB cleanly; 5 demo storyline orders ready |
| F-4 | README final | Run steps, the 7 demo accounts, seed counts, demo storyline, roadmap | DONE | PASS: Complete documentation in `README.md` |

---

## Blockers

| Date and time | Task ID | Blocker and cause | Workaround or next step | Resolved |
|---|---|---|---|---|
| None | - | None | - | Resolved |

## Milestone report log

| Milestone | Implemented | Tests run and results | Known bugs and blockers | Next task |
|---|---|---|---|---|
| M0 | Scaffolding, schema, auth, layout, seed script | Tests 30, Test 29 preliminary checks: PASS | None | M1 Yarn store |
| M1 | Yarn Store, gate receipt, adjustment, ledger | Tests 1, 5, 23: PASS | None | M2 Orders |
| M2 | Orders registry, live yarn check, order review | Tests 2, 3, 4: PASS | None | M3 Production |
| M3 | Production floor board, machine assignment, output logging | Tests 6, 7, 8, 9, Test 25 core calculations: PASS | None | M4 Rolls & QC |
| M4 | Roll registration, QC inspections, passport | Tests 10, 11: PASS | None | M5 Dispatch |
| M5 | Dispatch, invoices, 4-section store view, payments | Tests 12, 13, 14, 15, 16, 26, 31, 32 (completing full Test 29): PASS | None | M6 Buyer portal |
| M6 | Buyer portal, plain status wording, order request | Tests 17, 18, 24: PASS | None | M7 People & Finance |
| M7 | People, attendance register, Owner finance, wages | Tests 19, 20, 27, 28: PASS | None | M8 Overview & polish |
| M8 | Overview dashboard, notifications bell, responsive pass, cross-screen check | Tests 21, 22, full cross-screen Test 25: PASS | None | Final regression |
| Final | Full regression runner, build optimization, documentation | Tests 1 to 32: ALL 32 PASSED (0 FAIL) | None | Complete |
| **PY** | **Full Python FastAPI backend migration, SQLAlchemy 2.0 ORM, Alembic migrations, Pytest suite, Next.js API client integration** | **Pytest 20/20 PASSED; Acceptance 32/32 PASSED; Next.js build clean** | **None** | **Production ready** |
