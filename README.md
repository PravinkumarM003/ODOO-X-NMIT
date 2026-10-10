# TexFlow

**Tagline:** From Yarn to Delivery, Every Roll Accounted For.  
**Demo Factory:** Everest Textile Mills  
**Specification Version:** v2.2  

TexFlow is an industrial web application designed for Everest Textile Mills to replace paper registers, floor walks, notebooks, slips, and phone calls with one unified, server-validated digital operational backbone.

---

## 1. Quick Start & Run Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js (v18.17+ or v20+)
- npm (v9+)

### A. Python FastAPI Backend
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Run automated Pytest test suite (all 20 backend tests)
python -m pytest -v

# 4. Start the FastAPI backend server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API Root: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- OpenAPI Interactive Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### B. Next.js Frontend
```bash
# 1. Install Node dependencies (from repository root)
npm install

# 2. Run automated acceptance test suite (Tests 1 to 32)
npm test

# 3. Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Demo Accounts (All 7 Logins)

A one-click demo login helper is embedded on the `/login` screen. Every password is `everest2026`.

| # | Role | Email | Password | Scoping / Description |
|---|---|---|---|---|
| 1 | **OWNER** | `owner@everest.demo` | `everest2026` | Full factory access, finance, cost margins, wage closure and payment marking |
| 2 | **OFFICE** | `office@everest.demo` | `everest2026` | Buyers, suppliers, orders, review panel, invoices, payments, attendance |
| 3 | **FLOOR** | `floor@everest.demo` | `everest2026` | Yarn store receipt & adjust, production output, machine assignment & breakdown, roll registration, QC inspection |
| 4 | **BUYER** | `buyer.madras@everest.demo` | `everest2026` | Madras Garments Pvt Ltd (scoped strictly to own buyerId) |
| 5 | **BUYER** | `buyer.coastal@everest.demo` | `everest2026` | Coastal Apparels (scoped strictly to own buyerId) |
| 6 | **BUYER** | `buyer.kaveri@everest.demo` | `everest2026` | Kaveri Home Textiles (scoped strictly to own buyerId) |
| 7 | **BUYER** | `buyer.zenith@everest.demo` | `everest2026` | Zenith Uniforms (scoped strictly to own buyerId) |

*Server-side role guards immediately reject forbidden routes and unauthorized direct API / server action calls.*

---

## 3. Seed Dataset & Self-Check Counts

Rebuilt cleanly via `npm run seed`. Dates are relative to runtime so metrics and charts remain current.

| Entity | Target Count | Seeded Count | Verification Rule |
|---|---|---|---|
| **Buyers** | 4 | 4 | Madras Garments, Coastal Apparels, Kaveri Home Textiles, Zenith Uniforms |
| **Buyer Logins** | 4 | 4 | Dedicated login per buyer, each linked to unique `buyerId` |
| **Total Users** | 7 | 7 | 1 Owner, 1 Office, 1 Floor, 4 Buyers |
| **Machines** | 8 | 8 | 2 Spinning (SPN-01, SPN-02), 4 Weaving (WVN-01 to WVN-04), 2 Dyeing (DYE-01, DYE-02). WVN-03 in Breakdown |
| **Employees** | 12 | 12 | Across Spinning, Weaving, Dyeing, Store, QC, and Office |
| **Orders** | 11 | 11 | Exact status split: 1 NEW (buyer-submitted), 2 AWAITING_YARN (one overdue), 1 CONFIRMED, 2 IN_PRODUCTION (Weaving, Dyeing), 1 IN_QC, 1 READY_TO_SHIP, 1 PARTIALLY_DISPATCHED, 2 COMPLETED |
| **Rolls** | 28 | 28 | Exact QC status split: 20 Passed (one re-inspected from Rework to prove history), 2 Rework, 2 Rejected (quarantined), 4 Pending |
| **Dispatches** | 3 | 3 | Exactly 3: one for each COMPLETED order, one for PARTIALLY_DISPATCHED order |
| **Invoices** | 3 | 3 | Exactly 3 matching dispatches: 1 Paid, 1 Partial, 1 Unpaid (completion does not imply payment) |

---

## 4. Acceptance Test Results (Tests 1 to 32)

Run via `npm test` (`tsx scripts/test-runner.ts`):

```
=======================================================
  TEXFLOW COMPREHENSIVE ACCEPTANCE TEST SUITE (1 - 32)  
=======================================================

Running Test 29: Seed integrity & buyer logins (4 buyers, 4 logins, 11 orders, 28 rolls, 8 machines, 12 employees) ... PASS
Running Test 1: Receive yarn (BR-01, on-hand & available increase, RECEIPT created) ... PASS
Running Test 2: Insufficient yarn (Form shows shortage, AWAITING_YARN, nothing reserved) ... PASS
Running Test 3: Auto-allocation (BR-06: Receiving yarn automatically confirms AWAITING_YARN orders) ... PASS
Running Test 4: Valid order (BR-04, BR-05: Enough yarn sets CONFIRMED, reserved rises, available drops) ... PASS
Running Test 5: No negative stock (Negative adjustment that makes stock negative is rejected) ... PASS
Running Test 6: Stage order (BR-08: Weaving cannot start before spinning completes) ... PASS
Running Test 7: Machine rules (BR-09: Assigning running machine or wrong type is blocked; Idle becomes Running) ... PASS
Running Test 8: Breakdown (BR-12: Marking breakdown sets work order BLOCKED, opens downtime, order At risk) ... PASS
Running Test 9: Consumption (BR-11: Spinning completion releases reservation and posts FIFO CONSUME movements) ... PASS
Running Test 10: Roll traceability (BR-13: Rolls have order, weaving machine, dyeing machine on passport) ... PASS
Running Test 11: QC history (BR-14: Immutable history; Rework -> Passed shows both records) ... PASS
Running Test 12: Rejected roll (BR-15: Rejected roll cannot be dispatched) ... PASS
Running Test 13: Dispatch and invoice match (BR-17: Invoice roll list, metres & amount match dispatch exactly) ... PASS
Running Test 14: No double dispatch (BR-15: A roll cannot be dispatched twice) ... PASS
Running Test 15: Partial dispatch (BR-16: Dispatching some Passed rolls sets PARTIALLY_DISPATCHED) ... PASS
Running Test 16: Payments (BR-19: Part payment sets Partial, overpayment rejected) ... PASS
Running Test 17: Buyer view (Scoped to own orders; other buyers & costs inaccessible) ... PASS
Running Test 18: Live status (Floor output logging updates progress immediately without manual steps) ... PASS
Running Test 19: Cost (BR-22: Order costing updates with unit costs & wages; 'Cost incomplete' on missing records) ... PASS
Running Test 20: Month view (Finance shows machine output, wages total, payments received, supplier bills) ... PASS
Running Test 21: Permissions (Server role guards reject unauthorized access) ... PASS
Running Test 22: Mobile (Production, QC, yarn receipt and attendance responsive UI patterns) ... PASS
Running Test 23: Stock invariants (BR-02: Non-negative balances, positive magnitudes, zero-delta rejection) ... PASS
Running Test 24: Buyer-submitted order review (BR-24: NEW -> Office Approve/Cancel, shortage check) ... PASS
Running Test 25: Progress consistency (BR-25: 3 distinct indicators, no merged single percentage) ... PASS
Running Test 26: Quarantined stock (BR-18: Rejected rolls appear only in quarantined section) ... PASS
Running Test 27: Cash versus obligations (BR-26: Unpaid obligations not added to cash out) ... PASS
Running Test 28: Closed wages not proof of payment (BR-21, BR-26: Labelled 'Closed (not recorded as paid)') ... PASS
Running Test 30: Stitch inspection honesty (Section 10.1: Truthfully reported absence of Stitch files) ... PASS
Running Test 31: Order readiness and completion safety (BR-16: Cases a-i) ... PASS
Running Test 32: Seed dispatch consistency (Exactly 3 dispatches & 3 invoices, Paid/Partial/Unpaid states) ... PASS

=======================================================
  FINAL RESULT: 32 / 32 TESTS PASSED, 0 FAILED
=======================================================
```

---

## 5. End-to-End Demo Storyline (Follow One Order)

To demonstrate how TexFlow eliminates paper across the mill, follow this 5-step journey:

1. **Yarn at the Gate & Auto-Allocation**:
   - Log in as **FLOOR** (`floor@everest.demo`).
   - Navigate to `/yarn`. Notice `YRN-P50-K` is Out of Stock, and order `ORD-2026-0003` is waiting for yarn.
   - Click **Receive Yarn**, select supplier *Salem Yarn Traders*, item `YRN-P50-K`, enter `100 kg` at `₹300/kg`.
   - Submit. Watch `ORD-2026-0003` auto-confirm (BR-06) with a toast notification naming the released order.

2. **Production Floor Board & Machine Breakdown**:
   - Navigate to `/production`.
   - View machine `WVN-03` marked in **Breakdown**, with downtime active and work order blocked.
   - Assign machine `WVN-01` or log output (metres, employee, shift) for another active work order. Notice `Stage progress` updates live.

3. **Roll Registration, QC & Roll Passport**:
   - Navigate to `/rolls`.
   - Open a roll in the QC queue (e.g., `ROLL-0015`).
   - Record an inspection: choose *Passed*, *Rework*, or *Rejected*.
   - Click the Roll ID to open its **Roll Passport** (`/rolls/[id]`). Observe full machine traceability (weaving and dyeing machines), timestamps, and immutable inspection history.

4. **Quarantine & Dispatch / Invoicing**:
   - Navigate to `/dispatch`.
   - Inspect the **Store View**: observe the 4 mutually exclusive sections (*Shelf*, *Awaiting QC/Rework*, *Rejected / Quarantined*, and *Dispatched*).
   - In *Create Dispatch*, attempt to dispatch `ROLL-0004` (Rejected) — observe it is quarantined and refused by the server (BR-15). Select Passed rolls for order `ORD-2026-0008` and generate a dispatch. A matching invoice (`/dispatch`) is created in the exact same transaction (BR-17).

5. **Buyer Live Sync & Owner Month-End Profit**:
   - Log in as **BUYER** (`buyer.madras@everest.demo`).
   - Open `/buyer/orders`. The order shows plain buyer wording (*"Being checked"*, *"Ready to ship"*), 3 separate progress indicators (production %, QC readiness, dispatch completion), and estimated delivery date.
   - Log in as **OWNER** (`owner@everest.demo`).
   - Open `/finance`. View the order costing table with true yarn FIFO cost, operator labour, and machine hourly rate.
   - Observe the clear separation of **Net cash movement (recorded)** vs **Outstanding obligations (Not cash)**. Unpaid wages are clearly labelled *"Closed (not recorded as paid)"* and are not counted as cash outflows until explicitly marked paid (BR-26).

---

## 6. Architecture & Business Rules Enforced

- **Genuine Python Backend**: Python 3.12 + FastAPI + Pydantic + SQLAlchemy 2.x + Alembic + bcrypt + Pytest serving all textile business workflows.
- **Frontend Architecture**: Next.js 16 + TypeScript + Tailwind CSS with a typed `apiClient` forwarding JWT session cookies to FastAPI REST endpoints.
- **Database Invariants (BR-02)**: On-hand = `Σ RECEIPT − Σ CONSUME + Σ ADJUST`, Available = `On-hand − Reserved`. Negative stock and zero deltas are rejected inside database transactions.
- **Stage Order (BR-08)**: Spinning → Weaving → Dyeing → QC. Stage skipping is blocked by server validation.
- **Order Status Function (BR-16)**: Centralized server function `recomputeOrderStatus(orderId)` called in transaction after every QC inspection and dispatch. Prevents illegal manual status overrides.
- **Quarantined Stock (BR-18)**: Rejected rolls remain physically in store but are completely quarantined and mathematically excluded from shelf stock and dispatch eligibility.
- **Cash Flow vs Obligations (BR-26)**: Cash movements reflect only recorded receipts and payments. Unpaid supplier bills, closed wages, and unpaid invoices are isolated under obligations.

---

## 7. Stitch Design Inspection Report (Section 10.1)

- **Inspection Finding**: Workspace was inspected for exported Stitch project files. **No Stitch export files** were present in the repository.
- **Design Tokens Applied**: As instructed in Section 10.1, the application was built using the approved enterprise industrial tokens:
  - Sidebar: `#172D38`, Sidebar Secondary: `#203B46`
  - Primary Teal: `#176B63`, Primary Hover: `#11564F`
  - Workspace Background: `#F4F6F5`, Surface: `#FFFFFF`
  - Typography: IBM Plex Sans with system fallbacks, IBM Plex Mono for IDs
  - Status Palette: Success Green (`#277653`), Warning Amber (`#A86F1F`), Critical Red (`#B44545`), Info Blue (`#54758A`)

---

## 8. Out of Scope (Roadmap)

Per Section 12, the following features are deliberately out of scope for this release:
- AI chatbot / LLM conversational assistant
- Statutory payroll formulas (PF, ESI, TDS) and PDF payslip generation
- Barcode scanner camera integration
- External SMS / WhatsApp notification gateway
- Payment gateway card/net-banking redirect integrations
- Progressive Web App (PWA) / offline caching mode
