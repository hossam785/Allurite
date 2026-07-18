# CRM Business Modules Blueprint: Allurite CRM

This document details the functional specifications, features, user flows, permission requirements, and business rules for the core modules of the Allurite CRM ecosystem.

---

## 1. Employee Management Module

### Purpose
Administer organizational hierarchy, department mapping, and security credentials for CRM users.

### Features
- Staff directory with pagination, search, and filtering by department or status.
- Employee registration and onboarding workflows.
- User account creation link with role assignment.
- Employee profile editing (phone, department, active status).

### User Flows
1. **Onboarding Flow**:
   - Admin fills out the employee profile details and assigns a department.
   - Admin configures credentials and associates a role (e.g. `SalesAgent`).
   - The user account is activated, and a record is logged in the `audit_logs` collection.
2. **Offboarding Flow (Soft Delete)**:
   - Admin disables the employee. The system triggers a soft-delete query flagged in the user profile, restricting access to endpoints while retaining historical data.

### Permissions
- `create:employees` (Admin only)
- `read:employees` (Admin, Manager)
- `update:employees` (Admin only)
- `delete:employees` (Admin only)

### Business Rules
- An employee cannot be deleted from the system if they have active clients assigned to them. Clients must first be reassigned.
- Every employee record must map to exactly one active `User` account.

---

## 2. Client Management Module

### Purpose
Track and manage acquisition pipelines, communication histories, and status lifecycles of leads and clients.

### Features
- Dynamic client pipeline dashboard split by status categories (`Lead`, `Qualified`, `ActiveCustomer`, `Churned`).
- Profile detail views containing full communication timelines, files, notes, and task lists.
- Client creation, update, and soft-delete actions.
- Assigned agent assignment controls.

### User Flows
1. **Lead Conversion Flow**:
   - A Sales Agent identifies a lead as qualified.
   - The Agent updates the status field to `Qualified`. The system records the transition timestamp.
2. **Timeline Auditing Flow**:
   - When a note is added or a followup is completed, a chronological log is appended to the client profile.

### Permissions
- `create:clients` (Admin, Manager, Employee)
- `read:clients` (Admin, Manager, assigned Employees)
- `update:clients` (Admin, Manager, assigned Employees)
- `delete:clients` (Admin, Manager only)

### Business Rules
- Only `Admin` and `Manager` roles are authorized to delete client profiles.
- Any change in the `assignedAgentId` must trigger a system notification to the newly assigned agent.

---

## 3. Follow-Up System Module

### Purpose
Orchestrate call logs, meetings, email schedules, and outcomes to ensure clients receive structured updates.

### Features
- Scheduler interface for picking dates, times, types, and clients.
- Reminders pane displaying today's pending followups.
- Outcome input controls for updating status to Completed or Cancelled.

### User Flows
1. **Scheduling Flow**:
   - User navigates to a client's page and clicks "Schedule Follow-up".
   - User inputs time, type (Call/Email), and details. The record is inserted into the `follow_ups` collection.
2. **Outcome Logging Flow**:
   - On the scheduled time, the agent completes the call, inputs an outcome log, and updates the status to `Completed`.

### Permissions
- `create:followups` (Admin, Manager, Employee)
- `read:followups` (Admin, Manager, assigned Employees)
- `update:followups` (Admin, Manager, assigned Employees)

### Business Rules
- A followup cannot be scheduled in the past.
- Completed followups cannot be reverted to a "Scheduled" status.

---

## 4. Task Management Module

### Purpose
Create, assign, track, and complete work tasks related to client pipelines and internal CRM operations.

### Features
- Kanban-style status boards (`Todo`, `InProgress`, `InReview`, `Done`).
- Priority filters and due date calendars.
- Task assignments with creator and assignee tracking.

### User Flows
1. **Task Assignment Flow**:
   - Manager creates a task, links it to a client, assigns it to a Sales Agent, and sets a deadline.
   - An insert query runs on `tasks`, and a notification is pushed to the assignee.
2. **Progress Upgrading Flow**:
   - Agent moves the task card from `InProgress` to `InReview` upon completion.

### Permissions
- `create:tasks` (Admin, Manager, Employee)
- `read:tasks` (All authenticated users)
- `update:tasks` (Assignee, Creator, Admin, Manager)
- `delete:tasks` (Creator, Admin, Manager)

### Business Rules
- A task's due date cannot be set before the creation date.
- Tasks assigned to other users can only be closed or moved to `Done` by the Assignee, the Creator, or a Manager/Admin.

---

## 5. Notification Center Module

### Purpose
Inform CRM users immediately of events, changes, and assignments affecting their daily workflows.

### Features
- In-app notification bell with real-time indicators and badges.
- Standard toast popups on the screen for critical alerts.
- Mark all as read action.

### User Flows
1. **Push Alert Flow**:
   - A system event occurs (e.g. task assigned). A document is added to the `notifications` collection.
   - If the user is online, the frontend receives a server-sent event (SSE) payload and shows an instant banner.
2. **Clear History Flow**:
   - User clicks "Mark all as read". An update query sets `isRead: true` for all notifications matched to the active user.

### Permissions
- `read:notifications` (All authenticated users - scoped to recipientId)
- `update:notifications` (All authenticated users - scoped to recipientId)

### Business Rules
- Notifications are strictly user-private; a user can only read or update notifications where `recipientId` matches their authenticated ID.
- Read notifications must be automatically purged after 30 days.

---

## 6. File Management Module

### Purpose
Provide a secure repository for files and documents associated with clients or company operations.

### Features
- Secure file upload area supporting drag-and-drop.
- Dynamic file directory tracking uploads per client.
- Secure URLs linking to Vercel Blob storage.

### User Flows
1. **Upload Document Flow**:
   - User drags a file into the upload zone.
   - Backend validates the file type and size.
   - File is streamed to Vercel Blob, renamed with a UUID, and a metadata entry is written to MongoDB.

### Permissions
- `create:files` (Admin, Manager, Employee)
- `read:files` (Admin, Manager, assigned Employees)
- `delete:files` (Admin, Manager only)

### Business Rules
- Files must be associated with an active client unless flagged as internal branding assets.
- If a client is soft-deleted, access to all related files must be blocked for standard employees.

---

## 7. Reports Center Module

### Purpose
Compile, summarize, and display operational insights, sales velocities, and department KPIs.

### Features
- Interactive graphs showing lead conversion trends and activity metrics.
- Export options (CSV/PDF) for client listings and activity data.
- Filters for filtering reporting scopes by agent or department.

### User Flows
1. **Monthly Conversion Analysis Flow**:
   - Manager opens Reports Center, sets date filters, and clicks "Render".
   - Backend queries MongoDB Atlas collections, computes aggregates, and returns values to populate chart components.

### Permissions
- `read:reports` (Admin, Manager only)

### Business Rules
- Only users with the `Admin` or `Manager` role can access the Reports Center or download performance reports.
- Reports data must reflect real-time database state without caching delays exceeding 5 minutes.

---

## 8. Backup Center Module

### Purpose
Manage, monitor, and verify database states and automated backup snapshots.

### Features
- Snapshot status log showing recent Atlas backup operations.
- On-Demand snapshot triggering controls.
- Recovery system to select snapshots and trigger restorals.

### User Flows
1. **Emergency Backup Flow**:
   - Admin clicks "Trigger On-Demand Backup" before running a batch update.
   - Backend calls the MongoDB Atlas API, monitors snapshot creation, and logs completion.

### Permissions
- `manage:backups` (SuperAdmin only)

### Business Rules
- Only a `SuperAdmin` can access the Backup Center, trigger on-demand backups, or initiate database recovery workflows.
- Restore procedures must be disabled on the production cluster during high-traffic hours.
