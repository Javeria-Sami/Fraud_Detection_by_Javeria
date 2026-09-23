# Acceptance Criteria

For every feature, define:
- Given
- When
- Then
- Expected API/UI behavior
- Expected audit event
- Expected database state
- Expected error state

Example:
Given a valid new transaction, when it is submitted, then it is persisted, analyzed, assigned a risk score, and the resulting transaction event is published to authorized live-feed clients.
