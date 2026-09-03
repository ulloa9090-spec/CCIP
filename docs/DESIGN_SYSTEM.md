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

Button (supports `asChild` via `@radix-ui/react-slot` — render as a styled `<Link>` without a nested `<button>`) · Input · Textarea · Select · Card (+ Header/Title/Description/Content/Footer) · Modal (Radix Dialog) · Badge · Dropdown Menu · Progress Bar (`label` for a visible caption, `ariaLabel` when a visible one would duplicate text already on screen — always has *some* accessible name, defaulting to "Progress") · Progress Ring · Skeleton · Empty State · Tooltip.

Each interactive component implements: default, hover, focus-visible (ring, never outline removal), active, disabled, and — where applicable — loading and error states. Radix UI backs Select/Modal/Tooltip/Tabs/DropdownMenu for keyboard navigation and ARIA out of the box.

Every `role="progressbar"` on the page must have an accessible name (checked by the axe scan in `tests/dashboard-smoke.mjs`) — pass `label` or `ariaLabel` at every call site; the component's own default only prevents a *missing* name, not a *generic* one.

## Layout components (`components/layout/`)

`Sidebar` (desktop nav) · `MobileNav` (slide-over nav below `md`) · `Header` (async Server Component — real session, search placeholder, Quick Add, notifications placeholder, theme toggle, `UserMenu`) · `QuickAdd` (capture modal, 7 types, each tagged with the phase that makes it live; submit is disabled until then) · `ThemeToggle` / `ThemeProvider` · `PageHeader` (per-page title/description/action, used by every route except Dashboard) · `AppShell` (composes Sidebar + Header).

## Dashboard widget components (`features/dashboard/components/`)

`WidgetCard` (the Card-based shell every widget renders into — icon, title, optional header action), `WidgetSkeleton` (Suspense fallback, shaped like a resolved `WidgetCard` to avoid layout shift), `WidgetError` (inline module-failure fallback, never shows a raw error message), `DashboardGrid` (the responsive ordering shell — see `ARCHITECTURE.md`'s Dashboard section), `DashboardHeader` (real per-user greeting). The 11 module widgets (`TodayCard`, `ActiveProjectCard`, `NinetyDayGoalCard`, `WeeklyPrioritiesCard`, `HabitSnapshotCard`, `CalendarSnapshotCard`, `FocusSummaryCard`, `ProgressCard`, `WeeklyScoreCard`, `IdeaParkingCard`, `WeeklyReviewCard`) each split into a pure `<X>CardBody` (render only, given a `ModuleResult`) and an async `<X>Card` (fetch, then delegate) — see `features/dashboard/demo/fixtures.ts` for why.

## Icons

`lucide-react`, one icon per nav item and per empty-state, chosen for semantic match — no decorative icons.
