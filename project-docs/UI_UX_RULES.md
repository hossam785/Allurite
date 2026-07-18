# UI/UX Rules: Allurite CRM

## User Experience Principles
1. **Consistency**:
   - Layout grids, button positions, navigation systems, and form patterns must match across all modules.
2. **Efficiency**:
   - Users should be able to perform primary actions (like creating a lead, adding a note) in 2 clicks or fewer.
   - Quick-access keyboard shortcuts must be supported for searching and navigation.
3. **Data Hierarchy**:
   - Important metrics (KPIs, active alarms, recent changes) must reside above the fold.
   - Use visual grouping (cards, borders) to segregate content.

## Navigation & Layout
- **Sidebar**: Sticky left sidebar containing navigation items with clear visual states (active, hover).
- **Topbar**: User settings, global search, and notifications access.
- **Content Area**: Flexible workspace grid, responsive padding, clear section headers.
- **Modals**: Restricted to confirmation, short creations, or quick detail views. Standardized size variations (small, medium, large).

## Interaction States
- **Hover**: Subtle brightness/color shifts with smooth CSS transitions (`transition: all 0.2s ease`).
- **Active/Focus**: Clearly distinguishable borders/rings for accessibility.
- **Loading**: Skeletal loaders for large tables, spinner animations for inline buttons.
- **Feedback**: Instant toast notifications for actions (success, info, warning, error).
