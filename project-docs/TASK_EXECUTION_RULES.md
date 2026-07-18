# Task Execution & Production Rules: Allurite CRM

This document governs how future development tasks are structured, executed, verified, and pushed to production.

## Task Structuring Rules (Medium-Sized Tasks)
- **Scale Constraint**: Tasks must be medium-sized. They must never be huge (e.g. "Build the entire lead management module") and never be tiny (e.g. "Change button hover color").
- **Independence**: Each task must be independently testable, deliverable, and deployable.
- **Specification Template**: Each task must define:
  1. **Goal**: The ultimate business/technical objective.
  2. **Scope**: What files are modified/created and what files are out of bounds.
  3. **Requirements**: Clear functional and technical criteria.
  4. **Validation**: Test procedures to verify correctness.
  5. **Completion Criteria**: Explicit definitions of done (compilation, type checks, lint checks).

---

## Production Integrity Rules
To ensure the system remains production-ready at all times:
- **No Dummy Data**: Do not write mock arrays, fake user lists, or placeholder variables in database or server code.
- **No Placeholder Values**: All UI text must be final. Do not use "Lorem Ipsum" or "TBD" labels.
- **No Mock APIs**: All client-server communication must use actual MongoDB-backed endpoints. Do not create fake API endpoints that return hardcoded client data.
- **No Temporary Fixes**: Avoid comments like `// TODO: fix this later`. Implement standard error handling immediately.
- **No Hardcoded Business Data**: Business constants and configurations must reside in database settings collections or environment variables.
- **No Prototype Shortcuts**: Do not skip security checks, RBAC validation, or error catching even for initial implementations.

---

## System Development Standards

### UI & UX Design
- Follow the branding tokens defined in `DESIGN_SYSTEM_RULES.md`.
- Implement responsive drawer controls and touch targets as defined in `RESPONSIVE_RULES.md`.

### Component Design & State Management
- Components must be functional, modular, and reusable.
- Keep local component state scoped. Global state (like active user session, system alerts) must be managed using robust context patterns, preventing race conditions or UI-data synchronization lag.

### Backend & API Architecture
- Strict REST patterns using the standard JSON envelope specified in `API_RULES.md`.
- Use middlewares for authentication and roles validation on every endpoint.

### Database Architecture
- MongoDB Atlas only. No SQL or local file databases.
- Enforce indices and schema validations on every write.

### File Storage, Notifications, & Logging
- File uploads renamed with UUIDs and validation of size limits/MIME types.
- Real-time notifications must be persistent in MongoDB and trigger immediate visual indicators in the UI.
- All errors, authentication events, and critical operations must be logged to a centralized server log with timestamp, event code, and context.

### Error Handling & Performance
- All API exceptions must be caught, parsed into the standardized JSON error envelope, and mapped to user-friendly messages.
- Monitor API response times, database query execution plans, and bundle sizes. Keep performance within the thresholds specified in `SYSTEM_GOALS.md`.
