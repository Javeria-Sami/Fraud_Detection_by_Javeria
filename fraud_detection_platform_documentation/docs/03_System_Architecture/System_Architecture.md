# System Architecture

## Logical Architecture

Transaction Source
→ Ingestion API/Event Layer
→ Validation
→ Feature Engineering
→ Rule Engine + ML Engine
→ Risk Engine
→ Alert Engine
→ PostgreSQL
→ WebSocket/Event Delivery
→ Analyst Dashboard

Supporting services:
Authentication/RBAC, Audit Service, Analytics/Search, Model Registry, Monitoring, Admin Configuration.

## Architectural Principles
- Separate ingestion, detection and presentation concerns.
- Keep business rules configurable.
- Keep ML artifacts versioned.
- Make processing idempotent.
- Record enough evidence for investigation.
- Avoid coupling the dashboard directly to model internals.
