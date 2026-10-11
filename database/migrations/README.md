# Database Migrations

This directory documents the database migration history for TexFlow.
The active executable Alembic migrations are located in [`backend/alembic/`](../../backend/alembic/).

## Migration Revisions
- **Base Schema**: Preserved initial schema with 22 entity tables for yarn, orders, production, rolls, dispatch, invoicing, finance, and attendance.
- **Alembic Version Table**: Initialized and linked to SQLAlchemy DeclarativeBase metadata.

To apply migrations, run:
```powershell
cd backend
alembic upgrade head
```
