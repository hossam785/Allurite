# Database Blueprint: Allurite CRM

This document details the MongoDB database architecture, collection schemas, relationships, indexing strategies, audit log mechanisms, soft delete logic, and backup/recovery strategies for the Allurite CRM ecosystem.

---

## 1. Soft Delete Strategy
To prevent permanent data loss, Allurite CRM implements a strict **Soft Delete** pattern across all core collections (Clients, Employees, Tasks, Files).
- **Control Fields**:
  - `isDeleted` (Boolean, default: `false`)
  - `deletedAt` (Date, nullable)
  - `deletedBy` (ObjectId, FK to Users, nullable)
- **Execution**: All select queries (`find`, `findOne`) must include `{ isDeleted: { $ne: true } }` in their filter.
- **Hard Deletes**: Restricted strictly to SuperAdmin users invoking a dedicated purge API, which requires secondary confirmation.

---

## 2. Audit Logs Design
All mutative database actions (Create, Update, Delete) must record an audit entry.
- **Collection Name**: `audit_logs`
- **Fields**:
  - `_id` (ObjectId)
  - `userId` (ObjectId, FK to Users)
  - `action` (String - e.g. `CREATE_CLIENT`, `SOFT_DELETE_LEAD`, `UPDATE_ROLE`)
  - `collectionName` (String - target collection)
  - `documentId` (ObjectId - reference to target document)
  - `diff` (Object - stores key-value changes: `{ before: {}, after: {} }`)
  - `ipAddress` (String)
  - `userAgent` (String)
  - `timestamp` (Date)
- **Indexes**:
  - Compound Index: `{ userId: 1, timestamp: -1 }`
  - Single Index: `{ documentId: 1 }`

---

## 3. Database Collections & Fields Design

### 3.1. Permissions Collection (`permissions`)
Represents granular access permission tags.
- `_id` (ObjectId)
- `name` (String, unique - e.g. `create:leads`, `delete:clients`)
- `description` (String)
- `category` (String - e.g. `Leads`, `SystemSettings`)
- `createdAt` (Date)
- `updatedAt` (Date)

### 3.2. Roles Collection (`roles`)
Contains security roles that bundle permissions.
- `_id` (ObjectId)
- `name` (String, unique - e.g. `SuperAdmin`, `SalesManager`, `SalesAgent`)
- `description` (String)
- `permissions` (Array of ObjectIds, FK to `permissions`)
- `createdAt` (Date)
- `updatedAt` (Date)

### 3.3. Users Collection (`users`)
Authenticable security principals in the system.
- `_id` (ObjectId)
- `email` (String, unique)
- `passwordHash` (String)
- `roleId` (ObjectId, FK to `roles`)
- `status` (String - enum: `Active`, `Suspended`, `Pending`)
- `lastLoginAt` (Date)
- `createdAt` (Date)
- `updatedAt` (Date)

### 3.4. Employees Collection (`employees`)
Contains profile information for CRM staff users.
- `_id` (ObjectId)
- `userId` (ObjectId, FK to `users`, unique)
- `firstName` (String)
- `lastName` (String)
- `phone` (String)
- `department` (String - enum: `Sales`, `Support`, `Operations`, `Management`)
- `isDeleted` (Boolean)
- `deletedAt` (Date)
- `deletedBy` (ObjectId, FK to `users`)
- `createdAt` (Date)
- `updatedAt` (Date)

### 3.5. Clients Collection (`clients`)
Contains client/customer records.
- `_id` (ObjectId)
- `name` (String)
- `company` (String)
- `email` (String)
- `phone` (String)
- `status` (String - enum: `Lead`, `Qualified`, `ActiveCustomer`, `Churned`)
- `assignedAgentId` (ObjectId, FK to `users`)
- `source` (String - e.g. `Website`, `Referral`, `ColdCall`)
- `isDeleted` (Boolean)
- `deletedAt` (Date)
- `deletedBy` (ObjectId, FK to `users`)
- `createdAt` (Date)
- `updatedAt` (Date)

### 3.6. Client Notes Collection (`client_notes`)
Contains comments, timeline events, and notes regarding a client.
- `_id` (ObjectId)
- `clientId` (ObjectId, FK to `clients`)
- `authorId` (ObjectId, FK to `users`)
- `content` (String)
- `isDeleted` (Boolean)
- `deletedAt` (Date)
- `deletedBy` (ObjectId, FK to `users`)
- `createdAt` (Date)
- `updatedAt` (Date)

### 3.7. Follow Ups Collection (`follow_ups`)
Orchestrates scheduled followups and outcomes.
- `_id` (ObjectId)
- `clientId` (ObjectId, FK to `clients`)
- `assignedAgentId` (ObjectId, FK to `users`)
- `scheduledTime` (Date)
- `type` (String - enum: `Call`, `Email`, `Meeting`)
- `status` (String - enum: `Scheduled`, `Completed`, `Cancelled`, `NoShow`)
- `outcome` (String)
- `createdAt` (Date)
- `updatedAt` (Date)

### 3.8. Tasks Collection (`tasks`)
Task tracking for internal staff members.
- `_id` (ObjectId)
- `title` (String)
- `description` (String)
- `status` (String - enum: `Todo`, `InProgress`, `InReview`, `Done`)
- `priority` (String - enum: `Low`, `Medium`, `High`, `Critical`)
- `dueDate` (Date)
- `clientId` (ObjectId, FK to `clients`, nullable)
- `assigneeId` (ObjectId, FK to `users`)
- `creatorId` (ObjectId, FK to `users`)
- `isDeleted` (Boolean)
- `deletedAt` (Date)
- `deletedBy` (ObjectId, FK to `users`)
- `createdAt` (Date)
- `updatedAt` (Date)

### 3.9. Notifications Collection (`notifications`)
Direct, real-time alert notifications for users.
- `_id` (ObjectId)
- `recipientId` (ObjectId, FK to `users`)
- `title` (String)
- `message` (String)
- `type` (String - enum: `TaskAssignment`, `LeadUpdate`, `Alert`)
- `isRead` (Boolean)
- `readAt` (Date, nullable)
- `createdAt` (Date)

### 3.10. Files Collection (`files`)
Contains storage links and metadata for assets uploaded via Vercel Blob.
- `_id` (ObjectId)
- `clientId` (ObjectId, FK to `clients`, nullable)
- `uploadedById` (ObjectId, FK to `users`)
- `filename` (String - original uploaded name)
- `uuid` (String - unique generated name)
- `url` (String - Vercel Blob URL)
- `size` (Number - file size in bytes)
- `mimeType` (String)
- `isDeleted` (Boolean)
- `deletedAt` (Date)
- `deletedBy` (ObjectId, FK to `users`)
- `createdAt` (Date)
- `updatedAt` (Date)

### 3.11. Backups Collection (`backups`)
Logs database backup metadata and system statuses.
- `_id` (ObjectId)
- `backupId` (String - Atlas snapshot ID)
- `triggeredById` (ObjectId, FK to `users`, nullable for automated)
- `status` (String - enum: `Completed`, `Failed`, `Running`)
- `size` (Number - snapshot size in bytes)
- `snapshotType` (String - enum: `Scheduled`, `OnDemand`)
- `createdAt` (Date)

---

## 4. Key Indexes Design

To maintain fast reads and query execution times under 200ms:

- **Users**:
  - Unique Index: `{ email: 1 }`
- **Employees**:
  - Unique Index: `{ userId: 1 }`
- **Clients**:
  - Compound Index: `{ assignedAgentId: 1, isDeleted: 1 }`
  - Index: `{ status: 1 }`
- **Client Notes**:
  - Index: `{ clientId: 1, createdAt: -1 }`
- **Tasks**:
  - Compound Index: `{ assigneeId: 1, status: 1 }`
  - Index: `{ dueDate: 1 }`
- **Follow Ups**:
  - Compound Index: `{ assignedAgentId: 1, scheduledTime: 1 }`
- **Files**:
  - Index: `{ clientId: 1 }`
- **Notifications**:
  - Compound Index: `{ recipientId: 1, isRead: 1 }`

---

## 5. Relationships Blueprint

```
[roles] 1 <=========> Many [users]
[users] 1 <=========> 1 [employees]
[users] 1 <=========> Many [clients] (via assignedAgentId)
[clients] 1 <=======> Many [client_notes]
[clients] 1 <=======> Many [follow_ups]
[clients] 1 <=======> Many [tasks]
[users] 1 <=========> Many [tasks] (via assigneeId)
[users] 1 <=========> Many [notifications]
[clients] 1 <=======> Many [files]
```

---

## 6. Backup & Recovery Strategy

1. **Snapshots**: Automatically managed via MongoDB Atlas Backups.
2. **On-Demand Backups**: Triggered before any major database schema upgrades or deployments, recorded in the `backups` collection.
3. **Retention**: Weekly backups are retained for 30 days. Monthly backups are stored in a dedicated cold storage bucket for 1 year.
4. **Restoration Testing**: Once per quarter, backups are restored to a isolated staging cluster to verify schema integrity and recoverability.
