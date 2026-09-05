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

### Typography scale (Premium Polish pass)

Semantic type roles, each a paired font-size + line-height (+ font-weight where the role implies one) registered in the `--text-*` theme namespace so they're ordinary Tailwind utilities (`text-title`, not a wrapper component):

| Utility | Size / line-height | Weight | Use |
|---|---|---|---|
| `text-display` | 2.25rem / 2.5rem | 600 | Page-level hero text (rare — most pages use `PageHeader`, not a raw display) |
| `text-headline` | 1.5rem / 2rem | 600 | Section headlines, top-level page `<h1>` |
| `text-title` | 1rem / 1.5rem | 600 | Card/widget titles, empty-state titles, modal titles |
| `text-body` | 0.9375rem / 1.375rem | — | Descriptions, general reading text |
| `text-label` | 0.8125rem / 1.125rem | 500 | Form labels, secondary inline text |
| `text-caption` | 0.75rem / 1rem | — | Timestamps, helper text, badge-adjacent text |
| `text-metric` | 2.5rem / 1 | 700 | A dominant standalone number (e.g. Weekly Score) — pair with `text-label`/`text-caption` for its unit, never the same size |

These are additive to Tailwind's default scale (`text-sm`, `text-xs`, etc. still work) — existing call sites were not force-migrated; `components/ui/card.tsx` (`CardTitle`/`CardDescription`) and `components/ui/empty-state.tsx` now use `text-title`/`text-body` as the first adopters. See ADR 0018 for scope.

### Motion tokens (Premium Polish pass)

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | State toggles — button press, tooltip fade |
| `--duration-standard` | 200ms | Layout/content changes — modal enter/exit |
| `--duration-emphasized` | 320ms | Value changes worth noticing — progress bar/ring fill animating to a new value |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | The one easing curve used everywhere, for consistency |

A global `prefers-reduced-motion: reduce` media query (in `app/globals.css`) collapses every `animation-duration`/`transition-duration` to near-zero — this is handled once, centrally, rather than gated per component. `Button` gets a `active:scale-[0.98]` press-feedback micro-motion; `Modal`'s overlay/content and `Tooltip`'s content each get a real enter/exit transition (previously: none) via hand-written `@keyframes` + `--animate-*` theme entries in `globals.css` — no animation library dependency was added for this (see ADR 0018).

### Category colors (Premium Polish, iterations 2-3 — ADR 0019, ADR 0020)

Eleven `--category-*` tokens (`blue/indigo/violet/cyan/teal/orange/amber/rose/pink/sky/slate`, each with light/dark values like every other color token) exist **only** for decorative categorization. `--accent` itself is untouched and remains the only color used for interactive elements app-wide — category colors never appear on a button, link, or focus ring. Shared infrastructure lives in `lib/design/category-colors.ts`: `CategoryColor` type, `CATEGORY_CHIP_CLASSES` (icon chips), `CATEGORY_DOT_CLASSES` (small solid dots), `CATEGORY_BORDER_CLASSES`, `CATEGORY_SURFACE_CLASSES` (border + soft bg tint), `CATEGORY_CSS_VAR` (raw `var(--category-x)` for non-Tailwind consumers like Recharts), and `pickCategoryColor(seed)` (stable hash-based color for entities with no fixed category, e.g. a user-created Habit) — literal Tailwind class records, not string interpolation, since Tailwind's compiler needs to see each class name as-written.

Applied per screen (each screen's own file, e.g. `features/tasks/components/status-accent.ts`, `features/analytics/metric-accent.ts`, decides its own mapping):
- **Dashboard**: `WidgetCard`'s `accent` prop — one fixed color per widget.
- **Tasks**: `TASK_STATUS_ACCENT` — one fixed color per Kanban column (workflow stage); `TaskPriorityBadge`'s danger/warning/accent/neutral variants are untouched (severity, not category).
- **Habits**: `pickCategoryColor(habit.id)` — a stable color per habit (no fixed enum exists), shown as a dot next to the name in both the week grid and the heatmap. The done/missed cell coloring (success/danger) is untouched — that's execution status, not decoration.
- **Analytics**: `METRIC_ACCENT` — one color per metric, reusing the *same* color already assigned to the analogous Dashboard widget (Habit Consistency=orange, Focus Minutes=teal, Weekly Score Trend=rose, Weekly Priority Completion=cyan) so a concept reads as one color everywhere. `overdueTasks` uses the real `danger` token instead (severity, not category).

`ProgressRing` additionally has a `tone` prop (`accent | success | warning | danger`) for the one place a ring's color should track a value rather than a fixed category (Weekly Score) — always paired with a visible text label, per the "never color alone" rule above.

## Components (`components/ui/`)

Button (supports `asChild` via `@radix-ui/react-slot` — render as a styled `<Link>` without a nested `<button>`) · Input · Textarea · Select · Card (+ Header/Title/Description/Content/Footer) · Modal (Radix Dialog) · Badge · Dropdown Menu · Progress Bar (`label` for a visible caption, `ariaLabel` when a visible one would duplicate text already on screen — always has *some* accessible name, defaulting to "Progress") · Progress Ring · Skeleton · Empty State · Tooltip.

Each interactive component implements: default, hover, focus-visible (ring, never outline removal), active, disabled, and — where applicable — loading and error states. Radix UI backs Select/Modal/Tooltip/Tabs/DropdownMenu for keyboard navigation and ARIA out of the box.

Every `role="progressbar"` on the page must have an accessible name (checked by the axe scan in `tests/dashboard-smoke.mjs`) — pass `label` or `ariaLabel` at every call site; the component's own default only prevents a *missing* name, not a *generic* one.

## Layout components (`components/layout/`)

`Sidebar` (desktop nav) · `MobileNav` (slide-over nav below `md`) · `Header` (async Server Component — real session, search placeholder, Quick Add, notifications placeholder, theme toggle, `UserMenu`) · `QuickAdd` (capture modal, 7 types, each tagged with the phase that makes it live; submit is disabled until then) · `ThemeToggle` / `ThemeProvider` · `PageHeader` (per-page title/description/action, used by every route except Dashboard) · `AppShell` (composes Sidebar + Header).

## Dashboard widget components (`features/dashboard/components/`)

`WidgetCard` (the Card-based shell every widget renders into — icon chip with an optional category `accent` color, title, optional header action), `WidgetSkeleton` (Suspense fallback, shaped like a resolved `WidgetCard` to avoid layout shift), `WidgetError` (inline module-failure fallback, never shows a raw error message), `DashboardGrid` (the responsive ordering shell — see `ARCHITECTURE.md`'s Dashboard section), `DashboardHeader` (real per-user greeting), `widget-accent.ts` (the category-color class map, see Tokens above). The 12 module widgets (`TodayCard`, `ActiveProjectCard`, `NinetyDayGoalCard`, `WeeklyPrioritiesCard`, `HabitSnapshotCard`, `CalendarSnapshotCard`, `FocusSummaryCard`, `ProgressCard`, `WeeklyScoreCard`, `IdeaParkingCard`, `WeeklyReviewCard`, `RecentActivityCard`) each split into a pure `<X>CardBody` (render only, given a `ModuleResult`) and an async `<X>Card` (fetch, then delegate) — see `features/dashboard/demo/fixtures.ts` for why.

## Icons

`lucide-react`, one icon per nav item and per empty-state, chosen for semantic match — no decorative icons.
