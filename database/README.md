# TexFlow Database Management — TiDB Cloud Serverless

## Overview
TexFlow stores **all production data exclusively in TiDB Cloud Serverless**. 
No local `.db` files are required or stored in this repository.

All entity definitions, constraints, indexes, and relationships are declared in Python via SQLAlchemy 2.0 models in [`backend/app/models/entities.py`](../backend/app/models/entities.py).

---

## Active Database Configuration

- **Engine**: **TiDB Cloud Serverless** (Distributed, MySQL 8.0 wire-compatible SQL)
- **Host**: `gateway01.ap-northeast-1.prod.aws.tidbcloud.com`
- **Port**: `4000`
- **Username**: `3aSDDEtX2DMhV19.root`
- **Active Schema**: `texflow`
- **Connection URL**:
  ```
  mysql+pymysql://3aSDDEtX2DMhV19.root:<password>@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/texflow?ssl_verify_cert=false&ssl_verify_identity=false
  ```
- **Connection Security**: TLS/SSL encryption with automatic connection pooling (`pool_pre_ping=True`, `pool_recycle=300`).
- **Timestamp Strategy**: Millisecond epoch timestamps stored as `BIGINT` (via `PrismaDateTime(TypeDecorator)`) ensuring zero data truncation.

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

Total: **22 Tables** hosted live on TiDB Cloud.

---

## Migrations (Alembic)

Migrations are tracked and executed from the `backend/` directory using Alembic directly against TiDB Cloud:

```powershell
# In backend/ directory:
# Check current migration revision:
alembic current

# Generate new migration when models change:
alembic revision --autogenerate -m "describe_schema_change"

# Apply pending migrations:
alembic upgrade head
```

The migration version history is tracked in the `alembic_version` table on TiDB Cloud.
