# TexFlow Database & Migration Management

## Overview
TexFlow uses an embedded **SQLite** database (`database/dev.db`) managed exclusively by **SQLAlchemy 2.x** and **Alembic** in the Python backend.

All entity definitions, constraints, indexes, and relationships are declared in Python via SQLAlchemy models in [`backend/app/models/entities.py`](../backend/app/models/entities.py).

---

## Database Architecture

- **Primary Cloud Database**: **TiDB Cloud Serverless** (MySQL 8.0 wire-compatible distributed SQL)
  - **Host**: `gateway01.ap-northeast-1.prod.aws.tidbcloud.com`
  - **Port**: `4000`
  - **Username**: `3aSDDEtX2DMhV19.root`
  - **Active Database**: `texflow` (561 rows across 22 production tables)
  - **Connection URL**: `mysql+pymysql://3aSDDEtX2DMhV19.root:<password>@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/texflow?ssl_verify_cert=false&ssl_verify_identity=false`
  - **System Database Note**: The cluster includes the default catalog `sys`. Full DDL and operations reside in the `texflow` schema.
- **Local Fallback**: Embedded SQLite 3 (`database/dev.db` and backup `database/dev.db.bak`)
- **ORM**: SQLAlchemy 2.0 (Declarative Base with dual SQLite and MySQL/TiDB dialect support)
- **Timestamp Strategy**: Millisecond epoch timestamps stored as `BIGINT` (via `PrismaDateTime(TypeDecorator)`) providing cross-database consistency without data truncation.

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
