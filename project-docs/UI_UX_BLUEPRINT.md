# UI/UX Blueprint: Allurite CRM

This document defines the layout grids, visual components, interaction systems, state transitions, and design specifications for all screens in the Allurite CRM ecosystem.

---

## 1. Global UI Framework

### 1.1. Sidebar Structure
- **Position**: Fixed left column (width: `260px` expanded, `72px` collapsed on hover/toggle).
- **Theme**: Pure Dark Slate (`#0D1B3E`) with a 1px border (`#1E2E5D`) separating it from the content area.
- **Top Section**: Official Logo (Electric Cyan triangle symbol with white text "Allurite").
- **Navigation Links**: Vertical stack of items with outline-style icons.
  - Active State: Background color shifts to `#1E2E5D` with a left-edge indicator bar (`#00D2FF`, width: 4px).
  - Hover State: Subtle brightness highlight (`background-color: rgba(255,255,255,0.05)`) with a CSS transition.
- **Bottom Section**: User profile avatar, name, and collapse toggle button.

### 1.2. Header Structure
- **Position**: Sticky top bar (height: `70px`), spanning the content area width.
- **Background**: Semi-transparent dark blue backdrop-filter blur (`background: rgba(4, 13, 33, 0.85); backdrop-filter: blur(12px)`).
- **Left**: Current module title (breadcrumbs where applicable).
- **Center**: Global Search Input (dark background, electric cyan focus ring).
- **Right**: In-app Notification Bell (with red badge indicating unread count) and direct settings gear.

### 1.3. Global Navigation Rules
- Routing must preserve browser history state.
- Transition between routes must be smooth using layout animations.
- Unauthorized routes must redirect users to a custom `403 Unauthorized` page instead of breaking the UI.

### 1.4. Search Rules
- Search inputs must trigger search queries with a 300ms debounce to prevent server overload.
- Search result drops must display dynamic highlight indicators matching the searched queries.

### 1.5. Table Rules
- Columns must align contextually (text left-aligned, numbers/monetary values right-aligned, status badges centered).
- Hovering over a row must highlight the background (`background-color: rgba(0, 210, 255, 0.05)`).
- Headers must support interactive sorting indicators.

### 1.6. Form Rules
- All fields must display validation errors immediately on blur (`focusout`).
- Primary buttons must display a spinner loader when submitted, blocking duplicate clicks.

### 1.7. Modal Rules
- Background must use a dark overlay backdrop (`rgba(4, 13, 33, 0.75)`).
- Modals must slide in vertically from the top edge and support pressing `Esc` or clicking outside to close.

---

## 2. Screen Designs

### 2.1. Login Screen
- **Purpose**: Authenticate CRM users.
- **Layout Structure**: Centered grid layout against a deep midnight background (`#040D21`) featuring a subtle gradient.
- **Components**:
  - Centered brand logo card.
  - Input fields for Email and Password.
  - "Remember Me" checkbox and "Forgot Password" text link.
  - "Sign In" primary action button.
- **User Actions**: Input login credentials, submit form.
- **Permissions**: Public access.
- **Empty States**: N/A.
- **Loading States**: Button shows spinner and switches to disabled text "Signing In...".
- **Error States**: Banner displaying validation or authentication failure messages above the inputs.

### 2.2. Dashboard Screen
- **Purpose**: Provide a high-level operational overview of sales pipelines and daily metrics.
- **Layout Structure**: 4-column KPI row above a 2-column split content area (Charts / Activity Feed).
- **Components**:
  - KPI Cards: Leads generated, Active Customers, Conversion Rate, Closed Tasks.
  - Line Charts: Conversion trend over time.
  - Recent Activities Feed: List of audit logs and updates.
- **User Actions**: Date filter switching (7 Days, 30 Days, Year-to-Date), detail navigation clicking.
- **Permissions**: `read:dashboard` (All authenticated users).
- **Empty States**: "No activity metrics found for the selected date range."
- **Loading States**: Skeletal card layouts fading in and out.
- **Error States**: Banner warning that data fetching failed.

### 2.3. Employees Screen
- **Purpose**: Staff index and workspace directory.
- **Layout Structure**: Top toolbar (Search + Onboard Button) above a structured tabular grid.
- **Components**:
  - Staff table displaying name, email, department badge, role, and actions.
  - Filter drawer for departments.
- **User Actions**: Search by name/email, toggle active/inactive status, click "Onboard Employee" (opens modal).
- **Permissions**: `read:employees` (All authenticated users), `create:employees` (Admin only).
- **Empty States**: "No staff members found matching criteria."
- **Loading States**: 5 rows of shimmering table skeletal bars.
- **Error States**: Full-pane inline alert card with retry action.

### 2.4. Clients Screen
- **Purpose**: Central hub for lead pipeline and customer directories.
- **Layout Structure**: Top toolbar above a dynamic grid board or tabular grid.
- **Components**:
  - Grid cards for client summaries (Name, company, pipeline status badge, assigned agent).
  - Search field and stage tabs (All, Leads, Qualified, Customers, Churned).
- **User Actions**: Filter by stage, search by company/name, click "Add Client" (opens sidebar drawer), click a card to open Profile.
- **Permissions**: `read:clients` (Scoped to assigned user or absolute for Manager/Admin).
- **Empty States**: "No customer files or leads found."
- **Loading States**: Grid of shimmering outline cards.
- **Error States**: Modal overlay indicating data connection failure.

### 2.5. Client Profile Screen
- **Purpose**: 360-degree view of a single customer, communications, and files.
- **Layout Structure**: Left-hand sidebar panel (Client Details) + Right-hand tabbed container (Timeline, Notes, Tasks, Files).
- **Components**:
  - Detailed metadata panel (Contact details, assigned agent, status selector).
  - Notes form and chronological timeline log.
  - File uploader and list grid.
- **User Actions**: Change status dropdown, type and save notes, assign tasks, drop files to upload.
- **Permissions**: `read:clients`, `update:clients`.
- **Empty States**: Tabs show "No notes added yet" or "No files uploaded yet".
- **Loading States**: Detail panel loading skeleton + tabs spin-loader.
- **Error States**: Toast notification on write failure.

### 2.6. Follow-Ups Screen
- **Purpose**: Action tracker for scheduled interactions.
- **Layout Structure**: 2-column split (Left: Calendar list of scheduled events; Right: Detail view & Outcome logger).
- **Components**:
  - Date lists with color indicators (Overdue: Red, Today: Cyan, Future: Grey).
  - Detailed follow-up form showing client contact, notes, and outcome selector.
- **User Actions**: Click event to view, change schedule time, log outcome as Completed.
- **Permissions**: `read:followups`, `update:followups`.
- **Empty States**: "No follow-ups scheduled for this period."
- **Loading States**: Shimmer calendar blocks.
- **Error States**: Banner indicating sync error.

### 2.7. Tasks Board Screen
- **Purpose**: Kanban board for task workflows.
- **Layout Structure**: 4 columns (Todo, InProgress, InReview, Done) taking up the full width.
- **Components**:
  - Kanban Column wrappers.
  - Task Cards (Title, Description snippet, due date badge, priority flag, assignee avatar).
  - Add Task floating action buttons.
- **User Actions**: Drag-and-drop cards between columns to change status, click card to view task modal.
- **Permissions**: `read:tasks`, `update:tasks`.
- **Empty States**: Empty columns display "No tasks in this column".
- **Loading States**: Skeleton task cards.
- **Error States**: Toast indicating drag operation could not be saved to server.

### 2.8. Notifications Center Screen
- **Purpose**: Feed of personal notifications.
- **Layout Structure**: Centered single-column scroll card feed.
- **Components**:
  - Toolbar with "Mark all as read" button.
  - List of notifications grouped by time (Today, Yesterday, Earlier).
- **User Actions**: Click notification to navigate to target resource, click check icon to mark read.
- **Permissions**: `read:notifications`, `update:notifications`.
- **Empty States**: "You are all caught up! No unread notifications."
- **Loading States**: Spinner loader on scroll.
- **Error States**: Inline alert.

### 2.9. Files Manager Screen
- **Purpose**: Library for files across the workspace.
- **Layout Structure**: Top filter panel (search and folder structure) above a list table showing metadata.
- **Components**:
  - Upload target zone.
  - File data list (Filename, MIME type, size, upload date, linked client, owner).
- **User Actions**: Search files, drag-and-drop to upload, click delete file, click row to download.
- **Permissions**: `read:files`, `create:files`, `delete:files` (Admin/Manager only).
- **Empty States**: "No documents found in the database storage."
- **Loading States**: Rows displaying animated shimmer loaders.
- **Error States**: Banner warning message.

### 2.10. Reports Center Screen
- **Purpose**: Business analytics.
- **Layout Structure**: 2-column analytics dashboards.
- **Components**:
  - Conversion funnel graphs.
  - Date scope filters.
  - CSV/PDF Export action buttons.
- **User Actions**: Filter dates, toggle charts, download CSV.
- **Permissions**: `read:reports` (Admin/Manager only).
- **Empty States**: "Insufficient data to compile aggregate report for the selected parameters."
- **Loading States**: Faded chart graphics with central spinner.
- **Error States**: Data load failure warning card.

### 2.11. Settings Screen
- **Purpose**: Configure system thresholds, business information, and metadata collections.
- **Layout Structure**: Tabbed options panel (General, Brand Settings, Security).
- **Components**:
  - Brand configurations (Upload custom logo, modify visual colors).
  - Security options (Password rotation options, MFA settings).
  - Metadata dropdown collections settings.
- **User Actions**: Edit form text fields, upload files, toggle options, click save changes.
- **Permissions**: `read:settings` (All users), `update:settings` (Admin/Manager only).
- **Empty States**: N/A.
- **Loading States**: Layout loader.
- **Error States**: Field validation banners.

### 2.12. Backup Center Screen
- **Purpose**: Database recovery dashboard.
- **Layout Structure**: 2-column layout (Left: Trigger manual backup / status feed; Right: Snapshot restore list).
- **Components**:
  - Snapshot status table showing date, size, type, and status.
  - "Trigger On-Demand Backup" CTA button.
  - Restore action icons.
- **User Actions**: Click trigger backup, click restore snapshot (requires secondary validation modal).
- **Permissions**: `manage:backups` (SuperAdmin only).
- **Empty States**: "No backup records logged in the system."
- **Loading States**: Shimmer table records.
- **Error States**: Alert banner if database backup API returns an exception.
