# TexFlow TASKS.md

Single source of truth for progress. Source specification: `TexFlow_Build_Prompt.md` v2.2 (rules BR-xx are in section 6, Tests are in section 13, the protocol is in section 16).

**States:** `TODO` · `IN PROGRESS` · `BLOCKED` · `VERIFY` · `DONE`  
**Rule:** never mark DONE until acceptance criteria are met and the listed tests have actually passed. Record the real outcome in the Result column.  
**Scope:** no tasks outside the approved specification.

## Progress summary

| Stage | Time box | Status | Tests that must pass |
|---|---|---|---|
| M0 Setup, schema, auth, shell, seed | 2.0 h | IN PROGRESS | 29, 30 |
| M1 Yarn store | 2.0 h | TODO | 1, 5, 23 |
| M2 Orders and review | 2.5 h | TODO | 2, 3, 4 |
| M3 Production | 3.5 h | TODO | 6, 7, 8, 9, 25 |
| M4 Rolls, QC, passport | 2.5 h | TODO | 10, 11 |
| M5 Dispatch, invoices, status | 3.0 h | TODO | 12, 13, 14, 15, 16, 26, 31, 32 |
| M6 Buyer portal | 1.5 h | TODO | 17, 18, 24 |
| M7 People, cost, finance | 2.5 h | TODO | 19, 20, 27, 28 |
| M8 Overview, notifications, polish | 2.0 h | TODO | 21, 22 |
| Final: regression, demo, critical fixes | 2.5 h | TODO | all 1 to 32 |

Feature freeze after M5 (fixes and the screens needed for M6 to M8 only).

---

## M0: Setup, schema, auth, shell, seed (2.0 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M0-1 | Scaffold Next.js + TypeScript + Tailwind + Prisma/SQLite; scripts for dev, build, typecheck, test, seed; `git init` | App starts; `build`, typecheck and `npm test` run; first commit made | IN PROGRESS | |
| M0-2 | Prisma schema for all section 4 entities and migration | Migration succeeds; unique constraints exist (DispatchLine.rollId, Attendance employee+date, WageSummary employee+month, Order.orderNo, Roll.rollNo) | TODO | |
| M0-3 | Auth and server-side role guards (OWNER, OFFICE, FLOOR, BUYER) | Login and logout work; restricted route and direct API call return a clear forbidden state; buyers scoped by buyerId | TODO | |
| M0-4 | Inspect workspace for a Stitch export (10.1); app shell and design tokens | Report states whether an export was found and lists files; shell uses section 10 tokens; desktop sidebar and mobile drawer work | TODO | Test 30 |
| M0-5 | Seed script with self-check; 7 demo accounts; sign-in helper | `npm run seed` rebuilds DB; self-check passes on documented counts (4 buyers, 4 buyer logins, 11 orders, 28 rolls, 8 machines, 12 employees, 3 dispatches, 3 invoices); all 7 accounts log in; README lists same accounts and counts | TODO | Test 29 (derived-status part is finished with M5-6) |

## M1: Yarn store (2.0 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M1-1 | Ledger service with BR-02 arithmetic and invariants | RECEIPT, RESERVE, RELEASE, CONSUME positive magnitudes; ADJUST signed delta with lot and reason; on-hand, reserved, available computed per formulas | TODO | |
| M1-2 | Receive yarn vertical slice (BR-01), low-stock health (BR-03) | Lot and RECEIPT created in one transaction; optional supplier bill; balances refresh; Low and Out badges correct; invalid quantity rejected | TODO | Test 1 |
| M1-3 | Stock adjustment with reason and confirmation | Negative adjustment that makes available negative is rejected with a clear message | TODO | Test 5 |
| M1-4 | Yarn Store screens (list, item detail with lots and ledger, "Needs ordering") | Real data only; mobile receive form usable | TODO | |
| M1-5 | Automated stock invariants test | Test script passes for all listed invariants | TODO | Test 23 |

Note: the auto-allocation of BR-06 needs orders, so its hook is wired in M2-3.

## M2: Orders and review (2.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M2-1 | Minimal buyers, suppliers and fabric types management | Create and edit work; role-restricted | TODO | |
| M2-2 | Create order with live yarn check (BR-04) | Panel shows required, available, shortage; message matches | TODO | Test 2 |
| M2-3 | Confirm order: reserve or AWAITING_YARN (BR-05); auto-allocation on receipt (BR-06) | Enough yarn reserves full amount and sets CONFIRMED; shortage reserves nothing; receiving yarn releases waiting orders earliest deadline first with a toast | TODO | Tests 3, 4 |
| M2-4 | Cancel with required reason (BR-07) | Blocked without reason or after work started; releases exact outstanding reservation | TODO | |
| M2-5 | Office review of the seeded NEW order (BR-24 approve and cancel) | Approve runs BR-04 and BR-05; cancel needs reason; non-NEW rejected; only Office and Owner | TODO | Part of Test 24 (finished in M6) |
| M2-6 | Orders list and detail screens | List shows risk placeholders and "Needs review" filter; detail shows yarn requirement and reservation | TODO | |

## M3: Production (3.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M3-1 | Work orders at confirmation; strict stage order (BR-08) | Weaving cannot start before spinning completes | TODO | Test 6 |
| M3-2 | Machine assignment rules (BR-09) | Wrong type or non-Idle machine blocked; valid assignment sets Running | TODO | Test 7 |
| M3-3 | Output logging (BR-10) | Over 105% rejected; hours, employee, shift recorded | TODO | |
| M3-4 | Spinning completion consumption (BR-11) | RELEASE then per-lot CONSUME in one transaction, oldest lots first | TODO | Test 9 |
| M3-5 | Breakdown, downtime, reassignment (BR-12) | Work order BLOCKED, order flagged, reassignment works, downtime opens and closes | TODO | Test 8 |
| M3-6 | Machine board and production queue UI | Running, idle and down grouped; today's output real | TODO | |
| M3-7 | `getOrderProgress` (BR-25) | Single function returns the three indicators; used by every progress display built so far | TODO | Test 25 |

## M4: Rolls, QC, passport (2.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M4-1 | Roll registration (BR-13) | Machines auto-filled from work orders; total length capped at 105%; completing dyeing moves order to IN_QC | TODO | Test 10 |
| M4-2 | QC inspection with immutable records (BR-14) | Pass, Rework, Rejected; defect type and severity required for non-pass; history never edited | TODO | Test 11 |
| M4-3 | QC queue and summary (defects by machine) | Real counts; traceable to causing machine | TODO | |
| M4-4 | Roll Passport page, search, print layout, QR area | Full history and links; QR labelled honestly | TODO | |

## M5: Dispatch, invoices, status (3.0 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M5-1 | `recomputeOrderStatus` (BR-16) | Runs in the same transaction after every QC record and dispatch; no API sets these statuses | TODO | Test 31 |
| M5-2 | Create dispatch with eligibility and unique roll constraint (BR-15) | Only Passed, in-store rolls; Rejected, Pending and Rework refused; second dispatch of a roll refused (UI and API) | TODO | Tests 12, 14 |
| M5-3 | Invoice creation and print view (BR-17) | Roll list and metres equal the dispatch; amount equals metres × price | TODO | Test 13 |
| M5-4 | Payments (BR-19) | Partial and Paid states; overpayment rejected | TODO | Test 16 |
| M5-5 | Store view, four sections (BR-18) | Shelf, awaiting QC or rework, Rejected / Quarantined, Dispatched; each roll in exactly one | TODO | Tests 15, 26 |
| M5-6 | Seed dispatch consistency | 3 dispatches and 3 invoices; stored statuses equal derived statuses; Paid, Partial, Unpaid states | TODO | Test 32 (completes Test 29) |

## M6: Buyer portal (1.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M6-1 | My Orders and order detail in buyer wording | Own buyer only (UI and direct API); no costs or internal notes | TODO | Test 17 |
| M6-2 | Live status link to floor data | Floor logging shows on the buyer view after refresh with no manual step | TODO | Test 18 |
| M6-3 | Request order form and buyer invoices | Creates NEW order flagged Submitted by buyer; Office approve and cancel flow works end to end | TODO | Test 24 |

## M7: People, cost, finance (2.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M7-1 | Employees and daily attendance register (BR-20) | One record per employee per date; fast default Present | TODO | |
| M7-2 | Wages, month close, WageSummary (BR-21) | Calculated, Closed (not recorded as paid), Paid states; Owner only | TODO | Test 28 |
| M7-3 | Order cost and margin (BR-22) | Cost updates when lot cost or wage changes; "Cost incomplete" when records missing | TODO | Test 19 |
| M7-4 | Finance screen and Mark paid actions (BR-26) | Cash in and out use recorded dates only; obligations panel separate and labelled Not cash; two result lines never merged | TODO | Tests 20, 27 |

## M8: Overview, notifications, polish (2.0 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| M8-1 | Overview dashboard (7.2) | Attention strip first; all figures from real data; layout follows approved design if present | TODO | |
| M8-2 | Notifications and order risk (BR-23) | Severity labels; no fake counters; every item links to its record | TODO | |
| M8-3 | Responsive pass and honest states | Production, QC, yarn receipt and attendance usable at 390px with no horizontal scroll; empty, loading and error states exist | TODO | Test 22 |
| M8-4 | Permissions sweep | Floor cannot reach Finance, prices or invoices; Office cannot see wage totals; direct API calls refused | TODO | Test 21 |

## Final stage: regression, demo, critical fixes (2.5 h)

| ID | Task | Acceptance criteria | Status | Result |
|---|---|---|---|---|
| F-1 | Full regression of Tests 1 to 32 | Every test run again; actual pass and fail list recorded here | TODO | |
| F-2 | Fix critical failures only | No new features; each fix re-tested | TODO | |
| F-3 | Demo preparation | Seed reset works; demo storyline rehearsed end to end; backup recording or screenshots saved | TODO | |
| F-4 | README final | Run steps, the 7 demo accounts, seed counts, demo storyline, roadmap | TODO | |

---

## Blockers

| Date and time | Task ID | Blocker and cause | Workaround or next step | Resolved |
|---|---|---|---|---|
| | | | | |

## Milestone report log

| Milestone | Implemented | Tests run and results | Known bugs and blockers | Next task |
|---|---|---|---|---|
| | | | | |
