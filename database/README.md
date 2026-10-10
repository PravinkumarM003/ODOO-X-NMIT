# TexFlow Database & Migration Management

## Overview
TexFlow uses an embedded **SQLite** database (`database/dev.db`) managed exclusively by **SQLAlchemy 2.x** and **Alembic** in the Python backend.

All entity definitions, constraints, indexes, and relationships are declared in Python via SQLAlchemy models in [`backend/app/models/entities.py`](../backend/app/models/entities.py).

---

## Database Architecture

- **Engine**: SQLite 3 with WAL mode support
- **ORM**: SQLAlchemy 2.0 (Declarative Base)
- **Active Data File**: `database/dev.db`
- **Backup Snapshot**: `database/dev.db.bak`
- **Timestamp Strategy**: Millisecond integer timestamps compatible with epoch time via `PrismaDateTime(TypeDecorator)` to ensure zero data corruption across legacy timestamps.

---

## Schema Ownership & Entities

Schema ownership belongs strictly to the **Python FastAPI Backend** (`backend/`):
1. **Users & Authentication**: `User` (with bcrypt password hashes and roles `OWNER`, `OFFICE`, `FLOOR`, `BUYER`).
2. **Yarn Management**: `YarnType`, `YarnLot`, `StockMovement` (ledger-based inventory arithmetic).
3. **Buyer Orders**: `BuyerOrder`, `Buyer`, `Supplier`, `SupplierBill`.
4. **Production Pipeline**: `WorkOrder`, `Machine`, `ProductionOutput`, `MachineBreakdown`.
5. **Quality Control & Rolls**: `FabricRoll`, `DefectLog`, `RollQCInspection`.
6. **Dispatch & Invoicing**: `DispatchRecord`, `Invoice`, `Payment`.
7. **Human Resources & Finance**: `Employee`, `AttendanceRecord`, `MonthlyWage`, `FloorEvent`.

---

## Migration Workflow (Alembic)

Migrations are tracked and executed from the `backend/` directory using Alembic:

```powershell
# In backend/ directory:
# Check current migration revision:
alembic current

# Generate new migration when models change:
alembic revision --autogenerate -m "describe_schema_change"

# Apply pending migrations:
alembic upgrade head
```

The migration version history is stored in the `alembic_version` table in SQLite.

---

## Data Safety & Rollback Policy

1. **Automatic Backup**: Always duplicate `database/dev.db` to `database/dev.db.bak` before schema revisions.
2. **No Data Loss**: Never run destructive drop or recreate scripts against production data files.
3. **Audit History**: All stock movements and floor activities use append-only ledger tables (`stock_movement`, `floor_event`) to preserve complete traceability.
