# TexFlow

**Tagline:** From Yarn to Delivery, Every Roll Accounted For.  
**Demo Factory:** Everest Textile Mills  
**Specification Version:** v2.3  
**Architecture:** Decoupled Two-Tier Platform (`frontend/` + `backend/` + `database/`)

TexFlow is an industrial operations platform built for Everest Textile Mills to replace paper registers, floor walks, notebooks, slips, and phone calls with one unified digital operational backbone.

---

## 1. Professional Project Layout

```text
texflow/
├── frontend/                     # Next.js 16 Web Application (TypeScript, Tailwind CSS)
│   ├── src/                      # App router, components, hooks, api-client, lib
│   ├── public/                   # Static assets & icons
│   ├── package.json              # Frontend dependencies and build scripts
│   ├── next.config.ts            # Next.js Turbopack config
│   └── tsconfig.json             # TypeScript path alias configuration
│
├── backend/                      # Python 3.12 FastAPI Backend
│   ├── app/                      # Routes, domain services, SQLAlchemy models, schemas
│   ├── alembic/                  # Database migration configuration and scripts
│   ├── tests/                    # Pytest test suite (20 automated tests)
│   ├── requirements.txt          # Python dependencies
│   ├── alembic.ini               # Alembic configuration
│   └── .env.example              # Backend environment template
│
├── database/                     # Database files and migration records
│   ├── dev.db                    # Primary SQLite 3 database
│   ├── dev.db.bak                # Verified database backup
│   ├── README.md                 # Database ownership & schema guide
│   └── migrations/               # Migration documentation
│
├── docs/                         # Technical documentation
│   └── architecture.md           # Full system architecture specification
│
├── scripts/                      # Seed scripts and acceptance test runner
├── .gitignore                    # Secrets, build artifacts, and virtual environment rules
├── .env.example                  # Root environment variable template
├── README.md                     # This file
├── TASKS.md                      # Milestone task tracking and verification logs
└── AGENTS.md                     # Agent conventions and Next.js rules
```

---

## 2. Quick Start & Execution Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js (v18.17+ or v20+)
- npm (v9+)

### A. Python FastAPI Backend (`backend/`)
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Run automated Pytest suite (all 20 backend tests)
pytest tests/ -v

# 4. Start the FastAPI backend server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Root: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Interactive OpenAPI Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### B. Next.js Frontend (`frontend/`)
```bash
# 1. Navigate to frontend directory (or run from root)
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### C. Workspace-Level Root Commands
You can also run commands directly from the workspace root:
```bash
# Run development frontend server
npm run dev

# Run production build
npm run build

# Run comprehensive acceptance test suite (32 tests)
npm test

# Run backend test suite
pytest backend/tests/ -v
```

---

## 3. Demo Accounts (All 7 Logins)

A one-click demo login helper is embedded on the `/login` screen. Every password is `everest2026`.

| # | Role | Email | Password | Scoping / Description |
|---|---|---|---|---|
| 1 | **OWNER** | `owner@everest.demo` | `everest2026` | Full factory access, finance, cost margins, wage closure and payment marking |
| 2 | **OFFICE** | `office@everest.demo` | `everest2026` | Buyers, suppliers, orders, review panel, invoices, payments, attendance |
| 3 | **FLOOR** | `floor@everest.demo` | `everest2026` | Yarn store receipt & adjust, production output, machine assignment & breakdown, roll registration, QC inspection |
| 4 | **BUYER** | `buyer.madras@everest.demo` | `everest2026` | Madras Cotton Guild: Scoped orders, self-submit orders, view own invoices and rolls |
| 5 | **BUYER** | `buyer.coimbatore@everest.demo` | `everest2026` | Coimbatore Weaving Hub: Scoped portal access |
| 6 | **BUYER** | `buyer.tirupur@everest.demo` | `everest2026` | Tirupur Knits Ltd: Scoped portal access |
| 7 | **BUYER** | `buyer.bengaluru@everest.demo` | `everest2026` | Bengaluru Apparel Corp: Scoped portal access |

---

## 4. Key Business Rules (Verified in Code)

1. **BR-01 / BR-02**: Positive magnitude convention for receipt, reserve, release, consume; signed deltas for adjustments.
2. **BR-03**: Real-time yarn health thresholds: Healthy (>1.5x reorder), Low (>1.0x), Critical (≤1.0x), Out of Stock (=0).
3. **BR-04 to BR-06**: Order requirements calculate with 1.05 waste allowance and allocate yarn lots via FIFO.
4. **BR-07**: Cancellation requires a minimum 5-character reason and automatically releases reserved yarn lots.
5. **BR-08 to BR-12**: Three-stage sequential pipeline (Knitting &rarr; Dyeing &rarr; Finishing) with 105% output tolerance cap.
6. **BR-13 / BR-14**: Fabric roll 4-point defect grading (`PASSED`, `REJECTED`, `QUARANTINED`, `PENDING_REVIEW`) with immutable history.
7. **BR-15 to BR-17**: Only `PASSED` rolls in store are dispatch-eligible. Creating a dispatch generates a matching invoice.
8. **BR-18 / BR-19**: 4-section store view with payment recording and outstanding balance tracking.
9. **BR-20 to BR-23**: Shift attendance, monthly wage computation, and order costing with actual yarn and labor costs.
10. **BR-24**: Office review of buyer-submitted orders with real-time yarn shortage checks.
11. **BR-25 / BR-26**: Three distinct progress indicators (Production, QC, Dispatch) and strict separation of actual cash flows from outstanding obligations.

---

## 5. Automated Verification Results

- **Backend Pytest Suite (`pytest backend/tests/ -v`)**: 20 / 20 tests passed.
- **Acceptance Test Suite (`npm test`)**: 32 / 32 tests passed.
- **Production Build (`npm run build`)**: Compiled successfully with 0 TypeScript/build errors.
