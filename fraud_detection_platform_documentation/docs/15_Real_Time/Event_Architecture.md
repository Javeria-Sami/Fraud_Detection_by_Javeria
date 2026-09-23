# Event Architecture

Define event envelope:
event_id, event_type, occurred_at, correlation_id, schema_version, entity_id, payload.

Events should be versioned and idempotently consumable.
