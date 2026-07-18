# Accessibility Rules: Allurite CRM

## Standards & Compliance
1. **Target**: WCAG 2.1 AA level compliance.
2. **Contrast Ratios**:
   - Normal text: Minimum 4.5:1 against the background.
   - Large text (18pt/24px or larger): Minimum 3:1.
   - Interactive components, borders, and state changes: Minimum 3:1.

## HTML Semantics
- Use semantic HTML tags exclusively (`<main>`, `<nav>`, `<header>`, `<footer>`, `<section>`, `<article>`).
- Every interactive element (like icon buttons) must have descriptive `aria-label` or `aria-labelledby` attributes.
- Use `aria-expanded` and `aria-hidden` to control screen-reader visibility on collapse/modal transitions.

## Keyboard Navigation
- All interactive controls must be focusable via `Tab` key.
- Custom dropdowns, modals, and autocompletes must support keyboard controls (`Esc` to close, `Arrow` keys to navigate, `Enter` / `Space` to select).
- Keep focus rings visible and clear. Default browser outlines should be replaced with custom high-contrast focus styles.
- Example focus style: `outline: 2px solid var(--accent-primary); outline-offset: 2px;`

## Screen Readers
- Use `role="alert"` for real-time status notifications (e.g. dynamic toast success messages).
- Document structures must follow an ordered heading hierarchy (`h1` -> `h2` -> `h3`). Do not skip heading levels.
