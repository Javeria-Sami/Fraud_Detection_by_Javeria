# Real-Time Architecture

Base implementation can use FastAPI WebSockets.

For higher scale:
Producer → Kafka/Redis Streams → Processing Workers → PostgreSQL/Analytical Store → WebSocket Gateway → Clients.

Document:
- Event names
- Event schema
- Ordering
- Deduplication
- Reconnection
- Backpressure
- Consumer authorization
- Delivery latency
- Failure recovery
