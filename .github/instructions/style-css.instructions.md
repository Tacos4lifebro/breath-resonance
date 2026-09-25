---
applyTo: "style.css"
---

# style.css — Copilot Instructions

## CSS Custom Properties — Never Hardcode Colors
All colors must reference CSS variables defined in `:root` or a theme `body[data-theme="..."]` block.

```css
/* Correct */
color: var(--text-primary);
background: var(--bg-surface);

/* WRONG — never do this */
color: #f0f4fc;
background: rgba(18, 22, 34, 0.75);
```

## Theme System
5 themes defined via `body[data-theme]` attribute:
- `midnight` (default OLED dark)
- `twilight` (violet purple)
- `emerald` (forest green)
- `dawn` (amber rose gold)
- `light` (Zen minimal light)

Each theme must override: `--bg-primary`, `--bg-surface`, `--orb-gradient`, `--orb-shadow`, `--accent-glow`.

## Mobile Safe Areas (iOS Notch / Dynamic Island)
Always use env() insets for any fixed/sticky header or footer:
```css
padding: calc(var(--safe-top) + 12px) 16px calc(var(--safe-bottom) + 16px) 16px;
```
Where `--safe-top: env(safe-area-inset-top, 0px)` and `--safe-bottom: env(safe-area-inset-bottom, 0px)`.

## Glassmorphism Pattern
Modal sheets and surface cards must use:
```css
background: var(--bg-surface);           /* semi-transparent */
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid var(--border-subtle);
```

## Transitions
Use the spring easing for all interactive state changes:
```css
transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
```
Never use linear or ease-in-out on UI components.
