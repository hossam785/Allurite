# Technology Architecture Blueprint: Allurite CRM

This document details the production-ready technical architecture, folder structure, system data flows, and runtime specifications for the Allurite CRM ecosystem.

---

## 1. System Architecture Diagram

```mermaid
graph TD
    %% Clients
    subgraph ClientLayer [Client Tier]
        WebBrowser["Web Browser (HTML/CSS/JS)"]
        TauriApp["Tauri Desktop Wrapper (Windows)"]
    end

    %% API Gateway & Application Server
    subgraph ServerLayer [Application Tier]
        NextServer["Next.js Application Server (Node.js runtime)"]
        AuthMiddleware["Auth & RBAC Middleware"]
        Router["API Router (/api/v1/*)"]
        Controllers["Service Controllers"]
    end

    %% External Services & Databases
    subgraph StorageLayer [Data & Storage Tier]
        MongoAtlas[("MongoDB Atlas Cloud Database")]
        VercelBlob["Vercel Blob Storage (Object Storage)"]
    end

    %% Connections
    WebBrowser -->|HTTPS / WSS| NextServer
    TauriApp -->|IPC Wrapper / Local Host| WebBrowser
    NextServer --> AuthMiddleware
    AuthMiddleware --> Router
    Router --> Controllers
    Controllers -->|Mongoose ODM| MongoAtlas
    Controllers -->|Vercel Blob SDK| VercelBlob
```

---

## 2. Frontend Structure

The frontend layer is built with high performance, visual consistency, and responsive layouts in mind, using standard CSS variables and semantic HTML.

```
/src/
├── app/                  # Next.js App Router (Layouts and Pages)
│   ├── api/              # API route definitions
│   ├── dashboard/        # Authenticated workspace routes
│   ├── login/            # Authentication interface
│   └── layout.tsx        # Base HTML and global design tokens
├── components/           # Core isolated components
│   ├── layout/           # Sidebar, Topbar, and PageContainer
│   └── ui/               # Design System controls (Buttons, Cards, Inputs)
├── features/             # Business domain modules
│   ├── leads/            # Lead feature context and UI
│   ├── clients/          # Client feature context and UI
│   ├── tasks/            # Task orchestration feature
│   └── settings/         # CRM configurations
├── hooks/                # Global React hooks (useAuth, etc.)
├── providers/            # React Context providers (Theme, Auth, Language)
└── styles/               # Global stylesheet and custom themes
```

---

## 3. Backend Structure

The application backend runs on a serverless Node.js environment integrated into the Next.js framework, strictly maintaining separate layers for controllers, services, and models.

```
/src/
├── app/api/v1/           # REST Endpoint Controllers
├── models/               # MongoDB Mongoose Schema definitions
│   ├── User.ts
│   ├── Client.ts
│   ├── Lead.ts
│   ├── Task.ts
│   └── AuditLog.ts
├── lib/                  # Server configuration and database clients
│   ├── db.ts             # MongoDB client initialization
│   ├── auth.ts           # JWT and encryption utils
│   └── storage.ts        # Vercel Blob client wrapper
├── middlewares/          # Security and validation middlewares
│   ├── auth.ts           # Session validation
│   └── rbac.ts           # Permission boundary checks
└── services/             # Core business logic handlers
```

---

## 4. Database Structure (MongoDB Atlas)

Allurite CRM relies exclusively on MongoDB Atlas. Data relationships are defined via Mongoose schemas with indexes for high-speed reads.

```mermaid
erDiagram
    USER {
        ObjectId id PK
        string email UK
        string passwordHash
        string role
        string status
        date createdAt
    }
    CLIENT {
        ObjectId id PK
        string name
        string email
        string phone
        string status
        ObjectId assignedUser FK
        date createdAt
    }
    LEAD {
        ObjectId id PK
        string companyName
        string contactName
        string email
        string status
        ObjectId assignedUser FK
        date createdAt
    }
    TASK {
        ObjectId id PK
        string title
        string description
        string status
        date dueDate
        ObjectId assignedUser FK
        ObjectId clientId FK
    }
    AUDIT_LOG {
        ObjectId id PK
        ObjectId userId FK
        string action
        string ipAddress
        date timestamp
    }

    USER ||--o{ CLIENT : manages
    USER ||--o{ LEAD : owns
    USER ||--o{ TASK : assigned_to
    CLIENT ||--o{ TASK : references
    USER ||--o{ AUDIT_LOG : triggers
```

---

## 5. Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser / Client
    participant Server as Next.js API Server
    participant DB as MongoDB Atlas

    User->>Server: POST /api/v1/auth/login {email, password}
    Server->>DB: Query User by Email
    DB-->>Server: Return User details and password hash
    Server->>Server: Verify password (bcrypt.compare)
    alt Invalid Credentials
        Server-->>User: HTTP 401 Unauthorized
    else Valid Credentials
        Server->>Server: Generate JWT Access Token (15m expiry) & Refresh Token (7d expiry)
        Server->>DB: Store active session & refresh token hash
        Server-->>User: Set HTTP-Only cookies & HTTP 200 OK
    end
```

---

## 6. Authorization Flow (RBAC)

1. **Request Interception**: The client makes an authenticated request carrying a JWT cookie.
2. **Token Verification**: Middleware parses and validates the signature of the JWT token.
3. **Role Validation**:
   - The token contains the User's `role` (e.g. `Manager`, `Employee`).
   - The route handler configures a permission check via the RBAC middleware. Example: `rbacMiddleware(['create:leads'])`.
4. **Endpoint Resolution**: If the role is authorized, execution proceeds. Otherwise, a `403 Forbidden` JSON envelope is immediately returned.

---

## 7. File Upload Flow (Vercel Blob)

All files (documents, client assets, images) must use Vercel Blob. No local storage is used in production.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant Server as Next.js API Server
    participant Blob as Vercel Blob Storage
    participant DB as MongoDB Atlas

    User->>Server: POST /api/v1/files/upload (multipart/form-data)
    Server->>Server: Validate file size (<5MB) & MIME-type whitelist
    Server->>Server: Generate secure file UUID
    Server->>Blob: Stream file payload using Vercel Blob SDK
    Blob-->>Server: Return permanent storage URL
    Server->>DB: Create file record (UUID, URL, owner, MIME-type)
    DB-->>Server: Save confirmation
    Server-->>User: HTTP 201 Created { success: true, url: URL }
```

---

## 8. Notification Flow

1. **Trigger Event**: A state change occurs (e.g., a task is assigned, a lead changes status).
2. **Database Record Creation**: The service layer writes a notification record to the MongoDB `notifications` collection with `read: false`.
3. **Delivery Mechanism**:
   - **Active Sessions**: A server-sent event (SSE) stream or WebSocket connection pushes the notification payload to active clients instantly.
   - **UI Rendering**: The client UI intercepts the notification event, updates the badges without reloading, and displays a localized alert.

---

## 9. Backup Flow (MongoDB Atlas)

- **Execution Tier**: Handled entirely at the MongoDB Atlas infrastructure layer.
- **Frequency**: Automatic snapshot backups taken every 24 hours.
- **Retention**: Daily snapshots retained for 7 days, weekly snapshots retained for 4 weeks, monthly snapshots retained for 12 months.
- **Continuous Backups**: Point-in-Time Recovery (PITR) enabled on production clusters to allow database state restoration to any exact second within the last 7 days.

---

## 10. Desktop App Flow (Tauri Wrapper)

- **Frontend Hosting**: Tauri loads compiled assets directly from the application package (`localhost` origin via custom protocol) to prevent external scripting vulnerabilities.
- **System Communications**: Whenever system resources (local file paths, system alerts, hardware APIs) are needed, the frontend triggers a typed IPC command: `invoke('command_name', { args })`.
- **Backend Sync**: Tauri's frontend communicates with the remote Next.js production backend over standard HTTPS endpoints.

---

## 11. Deployment Flow

```mermaid
graph LR
    Push["1. Git Push to main"] --> CI["2. CI Run (TypeScript compilation & Linting)"]
    CI -->|Pass| VercelBuild["3. Vercel Build (Asset minification & serverless bundle)"]
    VercelBuild --> EnvVerify["4. Production Env Validation"]
    EnvVerify --> Deploy["5. Live Production Rollout (Zero-downtime)"]
    Deploy --> SmokeTest["6. Smoke Test (DB and storage ping)"]
```
