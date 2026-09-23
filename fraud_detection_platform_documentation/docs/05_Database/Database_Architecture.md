# Database Architecture

PostgreSQL is the system-of-record database.

Design principles:
- Normalize operational entities.
- Index common search paths.
- Use foreign keys and constraints.
- Use timestamps consistently.
- Store model/rule versions.
- Preserve audit history.
- Consider partitioning for very large transaction/audit tables.
