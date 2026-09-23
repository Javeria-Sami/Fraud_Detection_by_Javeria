# Database Migrations & Versioning Guide

## Alembic Migration Framework

The platform uses **Alembic** alongside **SQLAlchemy 2.0** for declarative schema migrations.

### Configuration Files
* `alembic.ini`: Primary configuration defining migration environment and logging.
* `alembic/env.py`: Asynchronously introspects models from `backend.app.core.database.Base.metadata`. Supports seamless connection URL normalization across PostgreSQL (`asyncpg` / `psycopg2`) and local SQLite.
* `alembic/versions/001_initial_schema.py`: Baseline migration establishing the 26 core domain tables, composite indexes, foreign keys, unique constraints, and rollback logic.

### Commands

#### Run Pending Migrations
```bash
python -m alembic upgrade head
```

#### Check Current Version
```bash
python -m alembic current
```

#### Downgrade Schema (Rollback)
```bash
python -m alembic downgrade base
```

#### Generate New Migration
```bash
python -m alembic revision --autogenerate -m "describe_schema_change"
```
