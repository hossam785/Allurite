# Design System Rules: Allurite CRM

This document establishes the official brand identity and UI token rules based on the analyzed company logo.

## Design Tokens

### Color Palette (Brand Colors)
- **`--bg-primary`**: `#040D21` (Midnight Dark Blue - Deep background)
- **`--bg-surface`**: `#0D1B3E` (Dark Navy - Card and table backgrounds)
- **`--text-primary`**: `#FFFFFF` (Pure white - Headers, main content)
- **`--text-muted`**: `#A0AEC0` (Cool Grey - Secondary text, labels)
- **`--accent-primary`**: `#00D2FF` (Electric Cyan - Main action buttons, active indicators)
- **`--accent-secondary`**: `#0082C8` (Electric Blue - Secondary actions, hover accents)
- **`--accent-highlight`**: `#3CE0FF` (Neon Cyan - Alerts, highlights, brand swoops)
- **`--accent-glow`**: `rgba(0, 210, 255, 0.4)` (Neon glow box-shadows)
- **`--border-color`**: `#1E2E5D` (Dark Blue Slate - Component borders)

### Typography
- **Primary Font Family**: `'Outfit', 'Inter', sans-serif`
- **Headings Font Family**: `'Outfit', sans-serif`
- **Font Sizes**:
  - `h1`: `2.25rem` (36px)
  - `h2`: `1.75rem` (28px)
  - `h3`: `1.25rem` (20px)
  - `body-large`: `1rem` (16px)
  - `body-small`: `0.875rem` (14px)
  - `caption`: `0.75rem` (12px)

### Spacing Scale
Use a consistent 8-pixel grid for margins and paddings:
- `--space-1`: `4px`
- `--space-2`: `8px`
- `--space-3`: `12px`
- `--space-4`: `16px`
- `--space-6`: `24px`
- `--space-8`: `32px`

### Border Radii
- `--radius-sm`: `4px`
- `--radius-md`: `8px`
- `--radius-lg`: `12px`
- `--radius-full`: `9999px`

---

## Styling & Component Principles
1. **Styling Engine**: 
   - Use Vanilla CSS variables defined in `:root` inside a global `index.css`.
   - Utility-first CSS classes (like Tailwind) are prohibited unless requested. Inline styles are strictly prohibited.
2. **Component Isolation**:
   - Every component must have isolated stylesheet rules using BEM methodology (Block-Element-Modifier) or CSS Modules.
   - Example: `.c-btn {}`, `.c-btn--primary {}`.
3. **Visual Aesthetics**:
   - Premium dark theme by default.
   - Subtle gradients and cyan/electric-blue glow effects on hover or active state (`box-shadow: 0 0 10px var(--accent-glow)`).
   - Use smooth, non-intrusive micro-animations for interactive transitions.
