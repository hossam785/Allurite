# Database Rules: Allurite CRM

## Core Database Requirements
1. **Primary Store**: MongoDB Atlas only.
2. **Strict Exclusions**:
   - SQLite, PostgreSQL, MySQL or other SQL variants are prohibited.
   - Local database instances (e.g. NeDB, Lowdb) are prohibited.
   - Local Storage or IndexedDB as primary database stores are prohibited (IndexedDB can only be used for caching transient client-side UI states).

## MongoDB Schema Validation
- All MongoDB collections must have a strict schema defined via Mongoose models or raw MongoDB JSON schema validation.
- Schema fields must specify correct data types, defaults, and validation rules (e.g. email regex, non-empty checks).
- Every record must automatically track creation and modification times using timestamps (`createdAt`, `updatedAt`).

## Indexing Strategy
- Primary keys (`_id`) must have index usage optimization.
- Create single-field indexes on fields used frequently in query filters (e.g., `status`, `userId`, `clientId`).
- Create compound indexes for sorting and filtering combinations to avoid in-memory sorting. Example: `{ clientId: 1, createdAt: -1 }`.
- Restrict indexes to active fields to avoid excessive RAM consumption on MongoDB cluster.

## Query & Writing Rules
- All write operations must perform schema-level validation first.
- Avoid `$where` or arbitrary Javascript execution in queries.
- Use aggregation pipelines for complex analytics, and paginate all search results using limit/skip or cursor-based pagination.
- Enforce MongoDB connection limits and configure automatic retryable writes (`retryWrites=true`).
