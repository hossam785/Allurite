# System Goals: Allurite CRM

## Performance Metrics
- **Page Load Time (LCP)**: Under 1.5 seconds under normal network conditions.
- **Interactive Time (FID/INP)**: Under 100ms for user input responsiveness.
- **API Response Latency**: 
  - Read queries: Under 200ms.
  - Write operations (insert/update): Under 300ms.
  - Heavy aggregation queries: Under 800ms.

## Reliability and Availability
- **System Uptime Target**: 99.9% availability.
- **Database Availability**: Guaranteed via MongoDB Atlas multi-region replication.
- **Session Persistence**: Robust recovery of sessions on token refresh without forcing re-login.

## Scalability Goals
- **Simultaneous Active Sessions**: Support up to 10,000 concurrent active users.
- **Data Volume Capacity**: Handle up to 1,000,000 lead/client profiles and associated interactions without performance degradation.
- **Concurrency Strategy**: Non-blocking asynchronous I/O at the backend layer, with optimized database connection pooling.

## Data Integrity and Security Goals
- **Zero Loss Recovery**: Multi-zone database backups scheduled daily, with point-in-time recovery (PITR) enabled.
- **Strict Isolation**: No raw database queries executed from the client. All access routed through verified REST API endpoints.
- **State Consistency**: Client state must perfectly synchronize with database writes. Double writes or desynchronized UI updates are forbidden.
