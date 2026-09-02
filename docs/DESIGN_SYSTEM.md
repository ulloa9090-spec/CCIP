# Design System

Living reference for what's actually implemented. Full rationale and the complete token/component list are specified in [`PHASE_0_BLUEPRINT.md`](./PHASE_0_BLUEPRINT.md) §H. View every primitive live at `/dev/components`.

## Tokens

Defined once in `app/globals.css` as CSS custom properties, light values on `:root`, dark overrides on `.dark` (dark is the default theme), then mapped into Tailwind utilities via `@theme inline`:

| Token | Tailwind utility | Purpose |
|---|---|---|
| `--background` | `bg-background` | Page background |
| `--surface` | `bg-surface` | Sunken/secondary surfaces (inputs, skeletons) |
| `--surface-raised` | `bg-surface-raised` | Cards, modals, popovers |
| `--border` | `border-border` | All borders |
| `--text-primary` | `text-text-primary` | Primary text |
| `--text-secondary` | `text-text-secondary` | Secondary/muted text |
| `--accent` | `bg-accent` / `text-accent` | Primary brand action color |
| `--success` / `--warning` / `--danger` / `--info` | `*-success` etc. | Status colors — always paired with text/icon, never color-only |
| `--radius-sm` / `--radius-md` | `rounded-(--radius-token-sm)` / `-md` | Inputs/chips vs. cards/modals |

Spacing uses Tailwind's default 4px-based scale directly (no custom spacing tokens needed on top of it).

## Components (`components/ui/`)

Button · Input · Textarea · Select · Card (+ Header/Title/Description/Content/Footer) · Modal (Radix Dialog) · Badge · Progress Bar · Progress Ring · Skeleton · Empty State · Tooltip.

Each interactive component implements: default, hover, focus-visible (ring, never outline removal), active, disabled, and — where applicable — loading and error states. Radix UI backs Select/Modal/Tooltip/Tabs for keyboard navigation and ARIA out of the box.

## Layout components (`components/layout/`)

`Sidebar` (desktop nav) · `MobileNav` (slide-over nav below `md`) · `Header` (search placeholder, Quick Add, notifications placeholder, theme toggle, profile) · `QuickAdd` (capture modal, 7 types, local-only in Phase 1) · `ThemeToggle` / `ThemeProvider` · `PageHeader` (per-page title/description/action) · `AppShell` (composes Sidebar + Header).

## Icons

`lucide-react`, one icon per nav item and per empty-state, chosen for semantic match — no decorative icons.
