# Non-Functional Requirements

Define measurable targets before production.

## Performance
- API p95 latency: <TARGET_MS>
- Detection p95 processing time: <TARGET_MS>
- Alert publication p95 latency: <TARGET_MS>

## Reliability
- Duplicate processing rate: 0
- Failed event recovery: <TARGET_WINDOW>

## Security
- Passwords hashed using an approved password hashing algorithm.
- Secrets never committed to source control.
- Authorization checked server-side.
- Sensitive actions audited.

## Scalability
Stateless API components should be horizontally scalable. Real-time delivery should support multiple instances through a shared event/broker strategy when required.

## Availability
Target: <SLO_PERCENT> uptime for production.

## Retention
Define transaction, alert, case, audit and ML artifact retention according to the intended deployment and applicable requirements.
