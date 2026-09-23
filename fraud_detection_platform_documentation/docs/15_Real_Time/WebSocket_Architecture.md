# WebSocket Architecture

Authenticate the connection. Authorize channels. Define event schemas and heartbeat/reconnect behavior.

Recommended events:
transaction.created
transaction.scored
alert.created
alert.updated
case.updated
system.health

Clients should handle reconnects and missed events safely.
