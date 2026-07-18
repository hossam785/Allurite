# API Rules: Allurite CRM

## Protocol & Formats
- **Protocol**: HTTP/2 or HTTP/1.1 over TLS (HTTPS).
- **Format**: All payloads must use valid JSON format. `Content-Type: application/json` is required.
- **REST Conventions**:
  - `GET /api/v1/<resource>`: Read list (paginated).
  - `GET /api/v1/<resource>/:id`: Read single.
  - `POST /api/v1/<resource>`: Create.
  - `PATCH /api/v1/<resource>/:id`: Partial update (preferred over PUT).
  - `DELETE /api/v1/<resource>/:id`: Delete (logical or physical).

## Response Structure
All API responses must follow a standard JSON envelope:

### Success Response
```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Detailed error message readable by user",
    "details": []
  }
}
```

## HTTP Status Codes
- `200 OK`: Success (GET, PATCH).
- `201 Created`: Success (POST).
- `400 Bad Request`: Input validation or logical client error.
- `401 Unauthorized`: Unauthenticated session or expired token.
- `403 Forbidden`: Authenticated, but lacks required permissions (RBAC).
- `404 Not Found`: Resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Server failure.

## Limitations & Security
- **Payload Limits**: Restrict JSON body size to maximum 1MB. File uploads must bypass JSON body and be handled via multipart/form-data.
- **Versioning**: Prefix all API routes with `/api/v1/`.
