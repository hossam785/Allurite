# Design Implementation Blueprint: Allurite CRM

This document codifies the design tokens, classes, naming conventions, and layout structures for the visual frontend implementation of Allurite CRM.

---

## 1. CSS Custom Properties (Design Tokens)

All design variables must be defined in the `:root` scope within the global stylesheet.

### 1.1. Color Tokens
```css
--clr-bg-primary: #040D21;      /* Midnight Dark Blue background */
--clr-bg-surface: #0D1B3E;      /* Navy Surface background for cards/tables */
--clr-border: #1E2E5D;          /* Slate border color */
--clr-text-primary: #FFFFFF;    /* Primary white text */
--clr-text-muted: #A0AEC0;      /* Muted secondary grey text */
--clr-accent-primary: #00D2FF;  /* Electric Cyan for main branding/actions */
--clr-accent-secondary: #0082C8;/* Electric Blue for secondary active states */
--clr-accent-glow: rgba(0, 210, 255, 0.4); /* Neon shadow glow effect */
--clr-error: #E53E3E;           /* Crimson red for error states */
--clr-success: #38A169;         /* Forest green for success badges */
--clr-warning: #DD6B20;         /* Amber orange for pending alerts */
```

### 1.2. Typography Scale
```css
--fs-h1: 2.25rem;       /* 36px - Page Headings */
--fs-h2: 1.75rem;       /* 28px - Module Sections */
--fs-h3: 1.25rem;       /* 20px - Card Headers, Modals */
--fs-body-lg: 1.00rem;  /* 16px - Form controls, large text */
--fs-body-sm: 0.875rem; /* 14px - Default text, inputs, grid content */
--fs-caption: 0.75rem;  /* 12px - Timestamps, helper labels */

--fw-regular: 400;
--fw-medium: 500;
--fw-bold: 700;

--lh-base: 1.5;
--lh-heading: 1.2;
```

### 1.3. Spacing Scale
```css
--sp-1: 0.25rem; /* 4px */
--sp-2: 0.50rem; /* 8px */
--sp-3: 0.75rem; /* 12px */
--sp-4: 1.00rem; /* 16px */
--sp-5: 1.25rem; /* 20px */
--sp-6: 1.50rem; /* 24px */
--sp-8: 2.00rem; /* 32px */
--sp-12: 3.00rem;/* 48px */
```

### 1.4. Border Radius Scale
```css
--radius-sm: 4px;   /* Small badges and tag elements */
--radius-md: 8px;   /* Buttons, inputs, structural widgets */
--radius-lg: 12px;  /* Cards, panels, modal boxes */
--radius-full: 9999px; /* Rounded pill badge controls */
```

### 1.5. Shadows
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.25);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
--shadow-glow-accent: 0 0 12px var(--clr-accent-glow);
```

### 1.6. Animations
```css
--transition-fast: all 0.15s ease;
--transition-normal: all 0.25s ease;
--transition-slow: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 2. Naming Conventions (BEM Methodology)

To avoid styling collisions across components, the team must adhere strictly to the BEM (Block-Element-Modifier) naming convention:

- **Block**: The standalone entity (`.c-card`, `.c-btn`, `.c-input`).
- **Element**: Parts of the block, prefixed by double underscores (`.c-card__title`, `.c-input__label`).
- **Modifier**: Flags that change the appearance or state of the block, prefixed by double hyphens (`.c-btn--primary`, `.c-btn--disabled`, `.c-card--highlighted`).

---

## 3. Component Variant Designs

### 3.1. Button Variants (`.c-btn`)
- **Primary (`.c-btn--primary`)**:
  - Background: `var(--clr-accent-primary)`
  - Text: `var(--clr-bg-primary)` (High contrast dark)
  - Hover: Background shifts to `var(--clr-accent-secondary)`, applies `var(--shadow-glow-accent)`.
- **Secondary (`.c-btn--secondary`)**:
  - Background: Transparent
  - Border: `1px solid var(--clr-accent-primary)`
  - Text: `var(--clr-accent-primary)`
  - Hover: Background shifts to `rgba(0, 210, 255, 0.1)`.
- **Destructive (`.c-btn--destructive`)**:
  - Background: `var(--clr-error)`
  - Text: `#FFFFFF`
  - Hover: Brightness shifts down, applies red glow.

### 3.2. Input Variants (`.c-input`)
- **Default Structure (`.c-input__field`)**:
  - Background: `rgba(4, 13, 33, 0.6)`
  - Border: `1px solid var(--clr-border)`
  - Text: `var(--clr-text-primary)`
  - Focus: Border shifts to `var(--clr-accent-primary)`, outline `2px solid var(--clr-accent-glow)`.
- **Error state (`.c-input__field--error`)**:
  - Border: `1px solid var(--clr-error)`
  - Focus: Outline `2px solid rgba(229, 62, 62, 0.4)`.

### 3.3. Table Variants (`.c-table`)
- **Header (`.c-table__header`)**:
  - Background: `rgba(30, 46, 93, 0.4)`
  - Text: `var(--clr-text-muted)`
  - Font: Bold, size `var(--fs-body-sm)`.
- **Row (`.c-table__row`)**:
  - Border Bottom: `1px solid var(--clr-border)`
  - Hover: Background shifts to `rgba(0, 210, 255, 0.03)`.

### 3.4. Card Variants (`.c-card`)
- **Default Surface (`.c-card`)**:
  - Background: `var(--clr-bg-surface)`
  - Border: `1px solid var(--clr-border)`
  - Radius: `var(--radius-lg)`
- **Glow Variant (`.c-card--glow`)**:
  - Outer shadow includes `var(--shadow-glow-accent)`.

### 3.5. Modal Variants (`.c-modal`)
- **Overlay (`.c-modal__overlay`)**:
  - Background: `rgba(4, 13, 33, 0.85)` (High opacity backdrop)
- **Container (`.c-modal__container`)**:
  - Background: `var(--clr-bg-surface)`
  - Border: `1px solid var(--clr-border)`
  - Radius: `var(--radius-lg)`
  - Shadows: `var(--shadow-lg)`

### 3.6. Badge Variants (`.c-badge`)
- **Pill layout (`.c-badge`)**:
  - Radius: `var(--radius-full)`, Padding: `var(--sp-1) var(--sp-2)`.
- **Status Modifiers**:
  - `.c-badge--success`: Green background (`rgba(56, 161, 105, 0.15)`), green text (`var(--clr-success)`).
  - `.c-badge--warning`: Orange background (`rgba(221, 107, 32, 0.15)`), orange text (`var(--clr-warning)`).
  - `.c-badge--error`: Red background (`rgba(229, 62, 62, 0.15)`), red text (`var(--clr-error)`).
  - `.c-badge--info`: Cyan background (`rgba(0, 210, 255, 0.15)`), cyan text (`var(--clr-accent-primary)`).
