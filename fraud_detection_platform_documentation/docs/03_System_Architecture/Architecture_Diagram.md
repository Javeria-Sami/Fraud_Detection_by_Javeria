# Architecture Diagram

```text
             TRANSACTION SOURCES
                    |
                    v
          +---------------------+
          | Ingestion/API Layer |
          +----------+----------+
                     |
                     v
          +---------------------+
          | Validation &        |
          | Idempotency         |
          +----------+----------+
                     |
                     v
          +---------------------+
          | Feature Engineering |
          +----------+----------+
                     |
             +-------+-------+
             |               |
             v               v
      +------------+   +-------------+
      | Rule Engine|   |  ML Engine  |
      +------+-----+   +------+------+
             |                |
             +-------+--------+
                     v
              +-------------+
              | Risk Engine |
              +------+------+ 
                     |
          +----------+----------+
          |                     |
          v                     v
   +-------------+       +-------------+
   | Alert Engine|       | Transaction |
   +------+------+       | /Risk Store |
          |              +------+------+
          +---------------------+
                                |
                         +------+------+
                         | PostgreSQL  |
                         +------+------+
                                |
                              WebSocket
                                |
                                v
                      +-------------------+
                      | Analyst Dashboard |
                      +-------------------+

 Cross-cutting: Auth/RBAC, Audit Logs, Monitoring, Admin Configuration
```
