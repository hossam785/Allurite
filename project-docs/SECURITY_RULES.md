# Security Rules: Allurite CRM

## Authentication & Sessions
- **Mechanism**: JWT (JSON Web Tokens) or secure session cookies.
- **Token Storage**: JWT tokens must be stored in HTTP-Only, Secure, SameSite=Strict cookies to protect against XSS (Cross-Site Scripting).
- **Expiration**: Access tokens must expire within 15 minutes. Refresh tokens must be stored in database, rotated on every usage, and expire in 7 days.
- **Session Auditing**: Every login, logout, and token refresh must be logged with IP address and User Agent.

## Authorization & RBAC
- Access control must be enforced at the server API layer on every endpoint. Client-side hiding is for UX only.
- Define explicit roles (e.g. `SuperAdmin`, `Manager`, `Employee`, `Viewer`).
- Define actions (e.g. `create:leads`, `delete:clients`).
- Use middleware to intercept requests and check permissions.

## Data Encryption & Protection
- **In-Transit**: All connections must enforce HTTPS/TLS 1.3.
- **At-Rest**: Secure all sensitive strings (passwords) using bcrypt with a salt factor of 12 before database insertion. Never store plaintext credentials.
- **MongoDB Atlas**: Enforce Encryption-At-Rest via Atlas default options.

## Request Sanitization & Defenses
- Validate and sanitize all query parameters, request bodies, and headers.
- Prevent NoSQL Injection: Never pass raw user inputs directly into MongoDB query objects. Use Mongoose query builders or sanitize objects.
- Enable CORS with a strict origin whitelist (no wildcard `*` allowed in production).
- Implement standard Security Headers (CSP, X-Frame-Options, HSTS).
