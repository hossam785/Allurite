# Responsive Rules: Allurite CRM

## Breakpoints Grid
Define CSS media query breakpoints based on device widths:
- **Mobile**: `xs` (up to 479px) and `sm` (480px - 767px)
- **Tablet**: `md` (768px - 1024px)
- **Desktop**: `lg` (1025px - 1440px)
- **Large Desktop**: `xl` (1441px and above)

## Layout Methodologies
1. **Fluid Typography & Spacing**:
   - Use relative units (`rem`, `em`, `vh`, `vw`, `%`) instead of hardcoded pixels (`px`) for layouts.
   - Use CSS Grid and Flexbox for page structures, enabling dynamic auto-wrapping and column collapsing.
2. **Sidebars & Navigation**:
   - On screens smaller than 1024px (tablet/mobile), the main sidebar must collapse into a fly-out drawer toggled by a hamburger menu.
   - On screens smaller than 768px (mobile), grid columns must stack vertically.
3. **Tables & Large Data Grids**:
   - Data tables must not overflow screen edges.
   - Enable horizontal scrolling container wrappers for wide tables, or implement responsive list cards for mobile views.
4. **Touch Targets**:
   - Interactive elements must have a minimum target size of `44px x 44px` on mobile/tablet widths.
