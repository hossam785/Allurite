# SYSTEM MAP — ALLURITE CRM V2 ENTERPRISE PLATFORM

## 1. Route Hierarchy

```
/
├── /login (Public Authentication Page)
└── /dashboard (Protected Dashboard Layout)
    ├── /dashboard/clients (Client Directory & Management)
    │   └── /dashboard/clients/[id] (Client Profile & Notes Detail)
    ├── /dashboard/followups (Follow-Up Planner & Management)
    │   └── /dashboard/followups/[id] (Follow-Up Detail)
    ├── /dashboard/tasks (Task Management Board & List)
    │   └── /dashboard/tasks/[id] (Task Workspace, Deliverables & Comments)
    ├── /dashboard/files (Enterprise Cloud File Storage Catalog)
    │   └── /dashboard/files/[id] (File Details, Tags & Logs)
    ├── /dashboard/reports (Analytics & KPI Reports Generator)
    ├── /dashboard/notifications (User Notification & Alert Center)
    ├── /dashboard/employees (SuperAdmin: Employee Directory & RBAC) [SuperAdmin Only]
    │   └── /dashboard/employees/[id] (SuperAdmin: Employee Profile & Credentials)
    ├── /dashboard/audit-logs (SuperAdmin: Security & System Audit Trail) [SuperAdmin Only]
    ├── /dashboard/backups (SuperAdmin: Database Snapshots & Restoration) [SuperAdmin Only]
    └── /dashboard/settings (SuperAdmin: System & Company Global Settings) [SuperAdmin Only]
```

---

## 2. Page Hierarchy

```
App Shell (RootLayout)
├── LanguageProvider (Arabic / English RTL Support)
├── ThemeProvider (Dark / Light Theme Context)
└── DashboardLayout
    ├── Header (Real-time Notifications, Theme Switcher, User Profile Menu, Breadcrumbs)
    ├── Sidebar (Responsive Navigation, Collapsible State, Role-based Nav Filtering)
    └── Page Views:
        ├── Overview Dashboard (KPI Widgets, Quick Actions, Activity Timelines, Performance Charts)
        ├── Clients View (Client Cards/Tables, Status Filters, Agent Scoping, Add/Edit Modals, Notes Drawer)
        ├── FollowUps View (Timeline View, Reschedule Modal, Outcome Closure Drawer, Overdue Badges)
        ├── Tasks View (Kanban / List Views, Status Gates, Deliverables Upload, Review Workflow)
        ├── Files Catalog (Category Tabs, Tags Filter, Cloud Storage Upload, Activity Log Drawer)
        ├── Reports Center (KPI Summary Cards, Chart Visualizations, Export CSV/Excel)
        ├── Notification Center (Read/Unread Tabs, Preference Checkboxes, Action Redirect Links)
        ├── Employee Management (Staff Table, Role Assignment, Status Toggle, Password Reset Dialog) [SuperAdmin]
        ├── Audit Trail (Filterable System Event Log, IP/Device Inspector, Severity Badges) [SuperAdmin]
        ├── Backup Manager (Snapshot Generator, Restore Confirmation Modal, Download Triggers) [SuperAdmin]
        └── System Settings (Company Identity Form, Security Thresholds, Workweek Config) [SuperAdmin]
```

---

## 3. Feature Hierarchy

```
Authentication & Identity
├── Login with Rate Limiting & Account Lockout
├── JWT HTTP-Only Cookie Session Validation
├── Password Hashing (Bcrypt) & Verification
├── Role Verification (SuperAdmin vs Employee)
└── Real-time Theme & Language Preference Sync

Client Relationship Management (CRM)
├── Client CRUD (Create, Read, Update, Delete)
├── Client Lifecycle Statuses (Lead -> Qualified -> ActiveCustomer -> Churned)
├── Egyptian Phone Number Format Validation (+20 / 01x)
├── Assigned Agent Scoping & Reassignment (SuperAdmin)
└── Timeline Notes (Create Note, Author-only Delete, Note History)

Follow-Up Operations
├── Scheduled Appointment Creation (Call, Email, Meeting, Demo, Other)
├── Auto-check Overdue Engine (Scheduled -> Missed)
├── Reschedule Workflow (Date validation in future)
├── Outcome Closure (Mandatory closure notes for Completed/Cancelled)
└── Automatic Notifications on Schedule / Reschedule

Task Deliverables & Review Workflow
├── Task Lifecycle (Pending -> In Progress -> Under Review -> Completed / Rejected / Overdue / Cancelled)
├── Role-gated Review Process (Employee submits for review -> SuperAdmin Approves/Rejects)
├── Deliverables Upload & Storage Attachment
├── Task Commenting System with Activity Log
└── Auto-check Overdue Engine (DueDate < Now -> Overdue status update)

Document & Cloud File Catalog
├── Multipart Form Upload (Vercel Blob / Simulation fallback)
├── Automatic Category Classification (PDF, Image, Document, Spreadsheet, Archive, Other)
├── File Metadata Tagging & Rename
├── Soft Archiving & Restoration
└── Scoped Access Control (Owner / Assigned Client / Assigned Task)

Analytics & Reporting Engine
├── Dynamic Analytics Calculator (Productivity, Tasks, Follow-ups, Clients, Employees)
├── 15-Minute Caching Strategy for Performance Optimization
├── KPI Metrics & Chart Series Assembly
└── Export Support (CSV and Native Excel TSV)

Security & Governance (SuperAdmin)
├── Employee Account Provisioning & Password Resets
├── Granular Permissions Matrix (Role Model)
├── Real-time Immutable Audit Logger (IP address, User Agent, Severity, Entity tracking)
├── Full Database Backup Snapshot Generation & Recovery Restoration
└── Global System Security Settings (Max Login Attempts, Session Timeout, Min Password Length)
```

---

## 4. Workflow Hierarchy

```
1. User Authentication & Authorization Workflow
   Login Request -> Verify Email & Pass -> Check Lockout -> Validate Active Status -> Issue JWT -> Set Cookie -> Redirect Dashboard

2. Client Onboarding & Assignment Workflow
   Submit Client Form -> Validate Egyptian Phone & Email -> Assign Agent (Auto if Employee, Manual if Admin) -> Save Client -> Audit Log Event

3. Follow-Up Execution Workflow
   Create Follow-Up -> Dispatch Agent Notification -> Trigger Background Overdue Checker -> (Agent Marks Completed + Notes OR Reschedules) -> Audit & History Log

4. Task Submission & Quality Review Workflow
   SuperAdmin Creates Task & Assigns Employee -> Employee Begins (In Progress) -> Uploads Deliverable -> Submits (Under Review) -> SuperAdmin Reviews -> Approves (Completed) or Rejects (With Feedback)

5. Backup & Recovery Workflow
   Trigger Backup -> Compile JSON Collections Snapshot -> Upload to Cloud Storage -> Create Backup Record -> (On Restore: Wipe Current DB -> Restore Collections -> Seed Lockout Prevention SuperAdmin -> Audit Log)
```

---

## 5. Permissions Matrix

| Category / Feature | SuperAdmin | Employee (Assigned / Self) | Guest / Unauthenticated |
| :--- | :--- | :--- | :--- |
| **Dashboard Overview** | Full Access | Full Access (Scoped Metrics) | Denied |
| **Client Management** | View All, Create, Edit All, Reassign, Delete | View Assigned, Create, Edit Assigned | Denied |
| **Client Notes** | View All, Add, Delete Any | View Assigned, Add, Delete Authored Only | Denied |
| **Follow-Up Operations** | View All, Create, Reschedule, Close | View Assigned, Create, Reschedule Assigned, Close Assigned | Denied |
| **Task Management** | View All, Create, Edit All, Reassign, Approve/Reject | View Assigned, Create, Progress, Submit Review | Denied |
| **Deliverables & Comments** | View All, Attach, Comment, Delete | View Assigned, Attach, Comment | Denied |
| **File Storage Catalog** | View All, Upload, Rename, Archive, Delete | View Owned/Linked, Upload, Rename Owned, Archive Owned | Denied |
| **Reports & Analytics** | View All Categories & All Staff | View Personal/Assigned Metrics Only | Denied |
| **Notifications Center** | View Personal + System/Security | View Personal Only | Denied |
| **Employee Management** | View, Create, Edit, Toggle Status, Reset Password, Delete | Denied (Redirected to Dashboard) | Denied |
| **Audit Log Trail** | View All, Filter by IP/User/Date/Severity | Denied (Redirected to Dashboard) | Denied |
| **Database Backups** | Generate Backup, Restore DB, Delete Backup | Denied (Redirected to Dashboard) | Denied |
| **System Settings** | View & Edit Global Settings | Denied (Redirected to Dashboard) | Denied |

---

## 6. API Inventory

```
Authentication API
├── POST /api/v1/auth/login            (Public) Login, check lockout, return JWT HTTP-Only cookie
├── POST /api/v1/auth/logout           (Protected) Expire JWT cookie, log audit event
├── GET  /api/v1/auth/me               (Protected) Return current user session profile
└── PUT  /api/v1/auth/theme            (Protected) Update user theme preference (dark/light)

Employee Management API [SuperAdmin Only]
├── GET  /api/v1/employees             List employees with pagination, search, department & status filter
├── POST /api/v1/employees             Create new user + employee profile
├── GET  /api/v1/employees/[id]        Get detailed employee profile
├── PUT  /api/v1/employees/[id]        Update employee profile & sync user status
├── DELETE /api/v1/employees/[id]      Delete employee & associated user account
└── POST /api/v1/employees/[id]/reset-password Reset employee password

Department & Role API
├── GET  /api/v1/departments           List departments with manager populate
├── POST /api/v1/departments           Create new department with unique code check
├── PUT  /api/v1/departments/[id]      Update department details / status
└── GET / POST /api/v1/roles           List & Save permissions matrix for system roles

Client Management API
├── GET  /api/v1/clients               List clients (Scoped by role, searchable, filterable)
├── POST /api/v1/clients               Create client record with Egyptian phone validation
├── GET  /api/v1/clients/[id]          Get client details & notes
├── PUT  /api/v1/clients/[id]          Update client profile (SuperAdmin reassign allowed)
├── DELETE /api/v1/clients/[id]        Delete client record (SuperAdmin only)
├── POST /api/v1/clients/[id]/notes    Append note to client profile
└── DELETE /api/v1/clients/[id]/notes/[noteId] Delete note (Author or SuperAdmin)

Follow-Up API
├── GET  /api/v1/followups             List follow-ups (Triggers auto-overdue check)
├── POST /api/v1/followups             Schedule new follow-up appointment & send notification
├── GET  /api/v1/followups/[id]        Get follow-up details & history
└── PUT  /api/v1/followups/[id]        Update status/reschedule & record audit log

Task API
├── GET  /api/v1/tasks                 List tasks (Triggers auto-overdue check, filterable)
├── POST /api/v1/tasks                 Create task & dispatch assignment notification
├── GET  /api/v1/tasks/[id]            Get task details, comments, attachments & history
├── PUT  /api/v1/tasks/[id]            Update task state/priority/due date (Role review gates)
├── DELETE /api/v1/tasks/[id]          Delete task (SuperAdmin only)
├── POST /api/v1/tasks/[id]/comments   Add comment to task
└── POST /api/v1/tasks/[id]/attachments Attach file deliverable to task

File Storage API
├── GET  /api/v1/files                 List files (Scoped by owner/linked module, filterable)
├── POST /api/v1/files                 Upload file to Vercel Blob / simulation fallback
├── GET  /api/v1/files/[id]            Get file details & activity logs
├── PUT  /api/v1/files/[id]            Rename, update tags, archive/restore file
└── DELETE /api/v1/files/[id]          Delete file from Vercel Blob & DB metadata

Reports & Analytics API
├── GET  /api/v1/reports               Calculate/fetch cached analytics snapshot
└── GET / POST /api/v1/reports/[id]    Export analytics snapshot as CSV / Excel TSV

System Governance API [SuperAdmin Only]
├── GET  /api/v1/notifications         List notifications for user/system
├── PUT  /api/v1/notifications         Mark all or single notification as read
├── PUT / DELETE /api/v1/notifications/[id] Mark read / soft-delete notification
├── GET  /api/v1/audit-logs            List audit logs with search, filters & pagination
├── GET  /api/v1/backups               List database backups
├── POST /api/v1/backups               Generate full JSON database snapshot
├── POST /api/v1/backups/[id]          Restore database from snapshot (Includes lock safety net)
├── DELETE /api/v1/backups/[id]        Delete backup file from cloud & DB
├── GET  /api/v1/settings              Fetch singleton global company settings
└── PUT  /api/v1/settings              Update company identity & security parameters
```

---

## 7. Database Inventory

```
1. User Model (`users` collection)
   - Fields: email (unique, required), passwordHash, role (SuperAdmin | Employee), status (Active | Suspended | Pending), theme (dark | light), loginAttempts (number), lockoutUntil (Date), notificationPreferences (Object), timestamps (createdAt, updatedAt).

2. Employee Model (`employees` collection)
   - Fields: user (Ref: User, unique), firstName, lastName, phone, department, position, status (Active | Inactive), timestamps (createdAt, updatedAt).
   - Indexes: { status: 1 }, { department: 1 }.

3. Department Model (`departments` collection)
   - Fields: name (unique), code (unique, uppercase), manager (Ref: Employee), status (Active | Inactive), timestamps.

4. Role Model (`roles` collection)
   - Fields: name (unique), description, permissions (Array of { category, actions }), isDefault (boolean), timestamps.

5. Client Model (`clients` collection)
   - Fields: firstName, lastName, email (lowercase), phone, companyName, website, industry, status (Lead | Qualified | ActiveCustomer | Churned), source, assignedAgent (Ref: Employee), notes (Array of subdocuments), timestamps.
   - Indexes: { status: 1 }, { assignedAgent: 1 }, { email: 1 }.

6. FollowUp Model (`followups` collection)
   - Fields: client (Ref: Client), assignedAgent (Ref: Employee), title, description, type (Call | Email | Meeting | Demo | Other), scheduledAt (Date), status (Pending | Scheduled | Completed | Missed | Cancelled), notes, history (Array of log subdocuments), timestamps.
   - Indexes: { status: 1 }, { assignedAgent: 1 }, { scheduledAt: 1 }.

7. Task Model (`tasks` collection)
   - Fields: title, description, status (Pending | In Progress | Under Review | Completed | Rejected | Cancelled | Overdue), priority (Low | Medium | High | Critical), dueDate (Date), assignedTo (Ref: Employee), createdBy (Ref: User), client (Ref: Client), followUp (Ref: FollowUp), attachments (Array), comments (Array), history (Array), timestamps.
   - Indexes: { status: 1 }, { assignedTo: 1 }, { dueDate: 1 }.

8. File Model (`files` collection)
   - Fields: fileName, originalName, fileSize, mimeType, blobUrl, uploadedBy (Ref: User), uploadedEmail, owner (Ref: Employee), relatedModule, relatedId, category (PDF | Image | Document | Spreadsheet | Archive | Other), tags (Array of strings), archived (boolean), archivedAt (Date), activityLogs (Array), timestamps.
   - Indexes: { owner: 1 }, { archived: 1 }, { relatedModule: 1, relatedId: 1 }, { category: 1 }, { tags: 1 }.

9. Report Model (`reports` collection)
   - Fields: title, category (Employee | Sales | Client | Follow-Up | Task | Productivity | Activity | System), generatedBy (Ref: User), generatedEmail, dateRange ({ start, end }), kpis (Mixed), chartsData (Mixed), rawMetrics (Mixed), createdAt.
   - Indexes: { category: 1, "dateRange.start": 1, "dateRange.end": 1, createdAt: -1 }.

10. Notification Model (`notifications` collection)
    - Fields: recipient (Ref: User), title, message, type (Reminder | Overdue | System), category, priority, read (boolean), readAt, actionUrl, metadata, deleted (boolean), timestamps.
    - Indexes: { recipient: 1 }, { read: 1 }, { category: 1 }, { deleted: 1 }.

11. AuditLog Model (`auditlogs` collection)
    - Fields: action, entityType, entityId, details, performedBy (Ref: User), performedEmail, performedName, performedRole, ipAddress, deviceInfo, severity (Low | Medium | High | Critical), metadata, createdAt.
    - Indexes: { action: 1 }, { entityType: 1 }, { performedEmail: 1 }, { severity: 1 }, { createdAt: -1 }.

12. Backup Model (`backups` collection)
    - Fields: name, createdBy (Ref: User), createdEmail, size, status (Pending | Completed | Failed | Restored), blobUrl, restoredAt, restoredBy, restoredEmail, createdAt.
    - Indexes: { createdAt: -1 }.

13. CompanySettings Model (`companysettings` collection)
    - Fields: key (unique, default "global_settings"), companyName, companyEmail, companyPhone, companyAddress, companyWebsite, country, timezone, language, currency, workWeekStart, workWeekEnd, followupIntervalDays, reminderOffsetMinutes, notificationRetentionDays, emailNotificationsEnabled, passwordMinLength, maxLoginAttempts, sessionTimeoutMinutes, timestamps.
```
