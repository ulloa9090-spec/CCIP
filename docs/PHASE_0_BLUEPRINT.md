# Atlas OS — Phase 0 Blueprint

Product Definition, UX Blueprint & Architecture Lock. No production code, no Next.js init, no Supabase project, no APIs connected. This document is the design authority for Phases 1–12; anything not defined here is either out of scope or requires an explicit decision before it enters a phase.

---

## A. Product Understanding

Atlas OS is a **personal execution operating system**. It is explicitly **not**:

- a to-do app (tasks without traceability to a goal are a code smell in this system)
- a calendar (the calendar is one surface, not the product)
- a habit tracker (habits are one input into a larger progress model)
- a chatbot (AI is a context-aware advisor over structured data, not a conversation product)
- a traditional project manager (no client billing, no team assignment, no multi-user collaboration in MVP)

Every level of the hierarchy exists to feed the level below it and justify the level above it:

```
Life Vision (implicit, expressed via Life Areas)
  → Life Area          "why this matters" grouping (Health, Career, Finance...)
    → Goal              a measurable outcome inside an area
      → 90-Day Plan     the quarter that operationalizes a goal
        → Project        the vehicle that produces the outcome
          → Milestone     a checkpoint inside the project
            → Weekly Priority   this week's slice of the milestone
              → Task            the atomic unit of work
                → Calendar/Time Block   when the task actually happens
                  → Habit (parallel input, not a child of Task)
                    → Focus Session    logged proof of work
                      → Review          weekly/monthly interpretation
                        → Analytics       trend detection across reviews
                          → Replanning     feeds back into Goal/Project
```

Each arrow is a **feed**, not a strict cascade requirement — see Section J for which links are mandatory vs. optional. The system's job is to make the upward question ("why am I doing this task?") answerable in at most 3 hops, and the downward question ("what does this goal actually require this week?") answerable in one screen (Today).

---

## B. Core Product Loop

```
CAPTURE → CLARIFY → PRIORITIZE → PLAN → SCHEDULE → EXECUTE → TRACK → REVIEW → ADJUST
```

| Stage | Question answered | Primary modules |
|---|---|---|
| **Capture** | "I have this, don't let it disappear" | Quick Add, Idea Parking Lot, Journal |
| **Clarify** | "What is this, really?" | Idea evaluation (Impact/Effort/Alignment), Task edit, Decision Log |
| **Prioritize** | "Does this deserve my attention?" | Active Project rule, P1–P4, Weekly Top 3, Most Important Task |
| **Plan** | "What sequence gets me there?" | Goals, 90-Day Plan, Projects, Milestones |
| **Schedule** | "When does this happen?" | Calendar, Time Blocking, Recurrence |
| **Execute** | "Doing the work" | Today screen, Focus Timer, Kanban |
| **Track** | "What actually happened?" | Task completion, Habit logs, Focus Sessions |
| **Review** | "What does this mean?" | Weekly Review, Monthly Review |
| **Adjust** | "What changes next?" | Replanning flow (back into Plan), AI Weekly Coach (Phase 10) |

The loop is circular, not linear: Review's output is new Capture/Plan input. No module owns more than one stage — this is the rule used later to keep feature scope bounded per phase (§54 of the master prompt).

---

## C. MVP Scope

### MUST HAVE (Phases 1–9)
Auth (email/password) · Life Areas · Goals · 90-Day Cycles · Projects with single Active Project rule · Milestones · Weekly Priorities (max 3) · Tasks (full field set, manual scheduling) · Kanban board · Today screen · Calendar (day/week/month, internal only) · Time Blocking · Habits with streaks · Focus Timer + Focus Sessions · Idea Parking Lot · Journal · Decision Log · Weekly Review (with auto-aggregated metrics) · Monthly Review · Analytics (fixed metric set, 7/30/90/365-day ranges) · Weekly Execution Score · Dark/Light mode · Responsive layout · Quick Add (basic modal) · Settings (profile, timezone, week start, theme) · RLS on every table.

### SHOULD HAVE (fold in during Phases 1–9 if capacity allows, else immediately after)
21-Day Challenges · Global Search (basic) · Command Palette (Cmd/Ctrl+K) · Task recurrence (simple patterns only) · Notification center (in-app only, no push) · Data export (JSON).

### LATER (Phase 10–12, explicitly scheduled)
AI Assistant (Morning Brief, Evening Review, Weekly Coach, Planning Assistant, Decision Assistant, Anti-Distraction Guard) · Automation engine (trigger/condition/action) · Google/Apple/Outlook Calendar sync · Push/email notifications · PWA installable shell + partial offline read · Social login (Google/Apple) · Magic link auth · CSV/PDF export, full backup.

### DO NOT BUILD YET (no phase currently owns these — require a new decision to enter any roadmap)
Native mobile apps · Multi-user/team collaboration · Real-time multiplayer editing · Gamification (points, badges, leaderboards) · Full offline write-sync with conflict resolution · Custom user-defined metric builder UI · Third-party plugin/integration marketplace · Voice input · Local/self-hosted LLM adapter (interface allows it later, not implemented now).

### Primary user (single-user-first design target)
One person managing overlapping personal and professional responsibilities, prone to starting more than they finish, who wants one place that connects "what I'm doing today" to "what I actually said mattered." Optimize every screen for this person deciding fast, not for a team coordinating. Multi-tenant data model (RLS by `user_id`) is kept from day one so multi-user is a future capability, not a rewrite — but no UI/UX decision should be made "because a team might use this."

### Definition of Done (applies to every feature built from Phase 1 onward)
A feature is done only if: it works end-to-end · data persists correctly · errors are handled with a user-readable message · it is responsive (desktop/tablet/mobile) · meets the accessibility baseline (§H) · is fully typed (no `any` on the touched surface) · has tests appropriate to its risk (§R) · does not break existing verified functionality · is documented where a future phase needs the context (ADR, DATABASE.md update, etc.).

---

## D. Information Architecture

### Navigation (final)
**Primary (sidebar, always visible):** Dashboard · Today · Goals · 90-Day Plan · Projects · Tasks · Calendar · Habits · Focus · Journal · Ideas · Reviews · Analytics · AI Coach
**Utility (sidebar footer):** Settings · Profile
**Global, not in sidebar:** Quick Add (floating/header button) · Search (header) · Command Palette (keyboard-triggered overlay)

### Primary vs. secondary screens
- **Primary (own nav entry, full page):** Dashboard, Today, Goals, 90-Day Plan, Projects (list), Tasks (Kanban/List), Calendar, Habits, Focus, Journal, Ideas, Reviews, Analytics, AI Coach, Settings.
- **Secondary (reached via drill-down, no nav entry):** Project Detail, Goal Detail, Task Detail/Edit modal, Habit Detail, Weekly Review session, Monthly Review session, Idea Detail, Decision Detail, Challenge Detail.

### Duplication avoidance rule
Every entity has exactly one canonical detail view. Other screens **reference** it (card, row, chip) and link into it — they never fork a second editing surface. Example: a Task can appear on Dashboard, Today, Kanban, and Calendar, but editing always opens the same Task Detail component (as modal or side panel depending on breakpoint).

### D.1 — Official hierarchy: dependency rules (§0.5)

| Entity | Requires (mandatory) | Optional link | Can exist standalone? |
|---|---|---|---|
| Life Area | — | — | Yes (seeded defaults, user-editable) |
| Goal | Life Area | Quarter Cycle | No — must belong to an Area |
| 90-Day Goal (= Goal with `timeframe=90_day`) | Life Area | Quarter Cycle (recommended, not enforced at DB level) | Yes, but UI nudges linking to a cycle |
| Project | — | Goal | **Yes** — projects may exist without a goal (a "just do it" project), but cannot be Active without at least a status decision |
| Milestone | Project | — | No — always belongs to a project |
| Weekly Priority | Task (it is a flag on a task, not a separate row) | — | No |
| Task | — | Project, Goal, Milestone | **Yes** — a task can be a pure inbox item with no parent |
| Time Block | — | Task, Project | Yes — a block can be unlinked (e.g. "Deep Work" with no assigned task yet) |
| Habit | — | Goal, Project | Yes — most habits are standalone |
| Focus Session | — | Task, Project | Yes — can log unassigned focus time |
| Review | — | (aggregates everything in its date range) | Yes — always standalone, read-only aggregation + user reflection |
| Idea | — | Promoted Project (after promotion) | Yes — that's its entire purpose |
| Decision | — | Goal, Project, Task | Yes |

**Rule of thumb:** nothing above "Project" can exist without its parent (Milestone needs Project, Goal needs Area). Everything at or below "Task" (Task, Time Block, Habit, Focus Session, Idea, Decision, Journal Entry) can exist standalone — forcing a parent on capture-time entities would recreate the "must categorize before I can even write it down" friction the Idea Parking Lot exists to avoid.

### D.2 — Active Project rule (§0.6)

State machine, one Project per user at a time carries `is_primary_active = true` (partial unique index enforces this at the DB level, not just in application code).

**Trigger:** user marks Project B as Primary Active while Project A already holds that flag.

**System response (blocking modal, no silent switch):**
```
"You already have a primary project: [A — 45% complete]."

[ Replace Current Primary ]   → A.status = 'secondary', B.is_primary_active = true
[ Make Secondary ]            → B.status = 'secondary', A unchanged
[ Send to Parking Lot ]       → B is converted back to an idea (status='archived' project + new idea row), A unchanged
[ Cancel ]                    → no change
```
The same modal fires when an Idea is promoted directly to Active status while a primary project exists (§0.29 promotion flow) and — later, Phase 10 — when the AI's Anti-Distraction Guard detects the same condition. One rule, three entry points.

### D.3 — Prioritization system (§0.7)

- **Task priority (P1–P4):** Critical / Important / Normal / Low. A simple 4-tier field on every task, used for sorting and for overdue-escalation, never auto-assigned in bulk.
- **Most Important Task (MIT) — daily:** exactly one task per day flagged `is_mit`. Enforced as at most one active MIT per user per day.
- **Top 3 — daily:** the MIT plus up to 2 more tasks surfaced on Today. Not a separate list — just the day's `is_weekly_priority`-eligible or manually starred tasks capped at 3.
- **Weekly Priorities (Top 3 — weekly):** up to 3 tasks/outcomes per week flagged `is_weekly_priority`, tied to `week_start_date`. These are the tasks Dashboard's "Weekly Priorities" module shows.
- **Most Important Outcome (MIO) — weekly:** one designated Weekly Priority marked as the outcome the week is judged by; feeds the Weekly Execution Score's "Top 3" component with extra weight (see §L).

**Interaction:** MIO (1, week) ⊃ Weekly Top 3 (≤3, week) ⊃ daily Top 3 (≤3, day, drawn from the week's priorities plus MIT) ⊃ MIT (1, day). P1–P4 is priority *urgency/importance metadata* on any task, independent of whether it's a Weekly Priority — a P4 task can still be this week's MIO if the user says so; the system does not auto-promote by priority level, only the user (and later, suggested-not-forced, the AI) decides what's "most important."

---

## E. User Flows

Format per flow: **Trigger → Steps → System response → Errors → Success state.**

**Flow 1 — New user signs up**
Trigger: visits `/signup`. Steps: enters email/password → confirms → Supabase Auth creates user → app creates `profiles` row with defaults (timezone from browser, week start = Monday) → seeds default Life Areas. System response: redirect to Dashboard in empty state with onboarding prompts ("Create your first Goal"). Errors: email in use, weak password, network failure — inline field errors, no dead ends. Success: authenticated session, profile row exists, Dashboard renders empty states.

**Flow 2 — Create first Goal**
Trigger: Dashboard empty state CTA or Goals screen "+ New Goal". Steps: select Life Area → title, description → timeframe → target date → optional metric (metric name, starting/target value). System response: Goal created with `status=planned`; user prompted "Activate now?". Errors: missing required Area/title blocks submit inline. Success: Goal appears in Goals list and Life Map.

**Flow 3 — Convert Goal into 90-Day Plan**
Trigger: from Goal Detail, "Add to 90-Day Plan" or from 90-Day Plan screen "+ New Cycle". Steps: create/select a `quarter_cycle` (name, start/end date, expected outcome, primary indicator) → attach Goal(s) to it → define up to 3 cycle milestones. System response: cycle progress view initializes at 0%. Errors: end date before start date blocked. Success: Goal shows its cycle; 90-Day Plan screen lists the cycle with linked goals.

**Flow 4 — Create a Project**
Trigger: "+ New Project" from Projects screen or from a Goal Detail. Steps: name, description, optional Goal link, status (default `someday` unless user explicitly sets Active), priority, start date, deadline. System response: if `status=active` and another project already is, trigger the Active Project modal (§D.2). Errors: same active-project conflict. Success: Project appears in Projects list under correct status column.

**Flow 5 — Create Milestones**
Trigger: inside Project Detail, "+ Milestone". Steps: title, target date, order/sequence. System response: milestone added to project's ordered list, project progress recalculated (§K). Errors: none blocking beyond required title. Success: milestone visible in Project Detail timeline.

**Flow 6 — Convert Milestone into Tasks**
Trigger: from Milestone row, "+ Task" or "Break down". Steps: create one or more tasks pre-linked to `milestone_id` + parent `project_id`/`goal_id` inherited. System response: tasks appear in project's task list and in Kanban Backlog. Errors: none beyond standard task validation (§Flow layout below). Success: milestone shows task count/completion fraction.

**Flow 7 — Select Weekly Top 3**
Trigger: Sunday/Monday prompt (or manual, from Dashboard "Set Weekly Priorities"). Steps: system suggests candidates (overdue high-priority tasks, tasks tied to the active project's current milestone) → user selects up to 3, flags one as MIO. System response: `is_weekly_priority=true`, `week_start_date` set on chosen tasks. Errors: attempting a 4th priority is blocked with inline message ("Weekly Priorities are capped at 3 — remove one first"). Success: Dashboard "Weekly Priorities" module populated.

**Flow 8 — Schedule a Task**
Trigger: from Task Detail, Today, or Calendar drag. Steps: set `scheduled_date` (all-day) or convert to a Time Block (start/end time, `focus_context`). System response: task appears on Calendar at the chosen slot. Errors: overlapping time blocks are allowed but visually flagged (soft warning, not blocked — user's call). Success: task visible on Calendar and Today (if scheduled for today).

**Flow 9 — Run a Focus Session**
Trigger: "Start Focus" from Task, Today, or Focus screen. Steps: pick duration (25/30/45/60/90 or custom) → optional task/project link + context → start timer → pause/resume allowed → finish (early or on time) → optional quick note. System response: creates `focus_sessions` row with actual elapsed minutes (not just the preset). Errors: none blocking; leaving mid-session prompts "Save partial session?" rather than silently discarding. Success: session logged, feeds Today's "focus time" and Analytics.

**Flow 10 — Complete a Task**
Trigger: checkbox toggle anywhere (Today, Kanban, Task Detail, Calendar). Steps: status → `done`, `completed_at=now()`. System response: optimistic UI update everywhere the task appears; project/milestone progress recalculated. Errors: none; undo available for a short window (toast "Undo"). Success: task shows completed state, contributes to today's/week's score.

**Flow 11 — Mark Habits**
Trigger: Habit checklist on Dashboard, Today, or Habits screen. Steps: tap to mark done for the current period (day/week depending on frequency). System response: `habit_logs` row written, streak recalculated per rules in §K.2. Errors: cannot mark a future date; marking a past date within a grace window is allowed with a visible "logged late" indicator. Success: streak counter updates, 7-day view reflects the mark.

**Flow 12 — Weekly Review**
Trigger: scheduled prompt (Sunday, configurable) or manual "Start Weekly Review". Steps: system renders auto-aggregated read-only summary (§0.30) → user answers reflection questions → selects next week's Top 3/MIO. System response: `weekly_reviews` row created with both the aggregated snapshot and the user's answers; Weekly Execution Score for the closing week is finalized and locked. Errors: leaving mid-review saves a draft (`status=in_progress`), resumable. Success: review marked complete, next week's priorities pre-populated on Dashboard.

**Flow 13 — Capture a new Idea**
Trigger: Quick Add → "Idea", or Ideas screen "+ New Idea". Steps: title (required), optional description/category/notes; potential/urgency/effort are optional at capture time, addable later. System response: idea created with `status=new`. Errors: none beyond title required. Success: idea appears in Idea Parking Lot in "New" column.

**Flow 14 — Promote an Idea to a Project**
Trigger: from Idea Detail, "Promote to Project". Steps: confirm mapped fields (title, description carry over) → choose initial status. System response: if chosen status is Active and a primary project exists, fire the Active Project modal (§D.2); on confirmation, `idea.status='promoted'`, `idea.promoted_project_id` set, new `projects` row created. Errors: none beyond the active-project conflict path. Success: idea shows "Promoted →" link to the new project; project appears in Projects list.

**Flow 15 — Replan after a deficient week**
Trigger: Weekly Review shows Execution Score below a user-visible threshold, or user manually opens "Replan". Steps: system surfaces what didn't move (stale milestones, missed Top 3, low habit consistency) → user is offered to: adjust this week's priorities, extend a milestone date, pause a habit, or send a project to Waiting. System response: whichever entities the user edits are updated normally through their own flows (4/5/7/11) — Replan is a **guided entry point**, not a new data model. Errors: none new. Success: user leaves with a concretely adjusted next week, not just a bad-feeling score.

---

## F. Screen Inventory & Wireframe Specifications

Primary screens (16) below; secondary/detail views are noted inline where they diverge structurally from their parent.

**Dashboard** (see §G — full blueprint)

**Today**
```
┌─ Header: date, "X tasks left today" ────────────────────┐
│  MOST IMPORTANT TASK (large, single card)                │
│  TOP 3 (checklist, max 3 rows)                            │
│  Today's Calendar (compact agenda strip)                  │
│  Habits due today (checklist)                              │
│  Overdue & Critical (collapsed by default, badge count)    │
│  Quick Capture (inline input, always visible at bottom)    │
└────────────────────────────────────────────────────────────┘
```
Deliberately excludes: full project lists, analytics, anything not actionable today.

**Goals** (list/grid) → **Goal Detail** (secondary): header with progress ring, linked Area, linked Quarter Cycle, linked Projects list, metric chart, notes.

**90-Day Plan**: current cycle hero (dates, expected outcome, indicator, progress bar) + 3 milestones timeline + linked goals/projects grid + past cycles archive (collapsed).

**Projects** (List / Cards / Kanban toggle) → **Project Detail** (secondary): header (status, priority, Active badge), progress bar, milestones (ordered, expandable to tasks), task list/kanban scoped to project, notes, decisions linked, blockers list, attachments.

**Tasks**: filterable/sortable table (project, goal, priority, status, due date) — the "everything" view, distinct from Kanban's workflow view.

**Kanban**: columns Backlog · This Week · Today · In Progress · Done, drag-and-drop, per-card mini info (project chip, priority, due date), column WIP is not enforced in MVP (visible but not blocking).

**Calendar**: Day/Week/Month tabs. Renders Time Blocks (filled, color by `focus_context`), Task due dates (outline chip), Calendar Events (solid), distinguished per §I.5. Click-to-create a block; drag task from a side "unscheduled" tray onto a slot.

**Habits**: grid (habit rows × day columns) for the week, streak + consistency % per row, tap-to-toggle cells, secondary 30-day heatmap view toggle.

**Focus**: large timer, duration presets, active task/project selector, start/pause/finish, session history list below (today's sessions).

**Journal**: reverse-chronological entry list, category filter chips, "+ New Entry" opens composer (category select, body, optional links to Goal/Project/Task/Decision).

**Ideas (Parking Lot)**: Kanban-style by status (New / Review Later / Evaluating / Promoted / Rejected / Archived), card shows title + optional impact/effort/urgency badges if scored.

**Reviews**: tabs Weekly / Monthly, each a list of past reviews + "Start This Week's Review" CTA; opening a review (past or new) is the secondary Weekly/Monthly Review session screen (auto-summary → reflection form → next-period priorities).

**Analytics**: metric cards row (Task Completion Rate, Weekly Priority Completion, Habit Consistency, Focus Minutes, Overdue Tasks, Created vs Completed, Weekly Score trend) + range selector (7/30/90/365d) + one trend chart per metric, no decorative charts.

**AI Coach** (Phase 10, screen scaffolded earlier as empty/disabled state): conversation thread + context chips showing what data is in scope + suggestion cards with Approve/Modify/Ignore actions.

**Settings**: Profile, Timezone & Week Start, Working Hours, Theme, Notification Preferences, AI Provider (Phase 10+), Privacy, Data Export, Archived Content.

---

## G. Dashboard Blueprint

Visual hierarchy, strictly top-to-bottom priority (matches the reference image's density, reinterpreted with real data bindings, not copied literally):

- **Level 1 — Today + Active Project**: the two answers to "what matters now" and "what's the one thing I'm building." Largest cards, top of viewport, no scroll required.
- **Level 2 — 90-Day Goal + Weekly Priorities**: the mid-horizon context — why this week's choices matter.
- **Level 3 — Habits + Calendar (week strip) + Focus snapshot**: the mechanics of consistency.
- **Level 4 — Analytics summary + Idea Parking (compact) + Weekly Review status**: reflection-tier information, lowest priority, can require a scroll.

**10-second test:** Level 1 alone must answer "what matters now" and "what do I do today"; Level 1+2 together must answer "am I advancing" via the 90-Day progress bar and Weekly Priority checkmarks — no need to reach Analytics for the basic pulse-check.

**Quick Add (§0.15):** floating action button, top-right of header. Opens a modal with a type selector (Task / Idea / Note / Project / Goal / Habit / Event) as tabs, not a dropdown (fewer clicks). Minimum fields per type shown by default:
- Task: title, (optional) due date, project — that's it.
- Idea: title only.
- Note (Journal): body only, category defaults to "Free Note."
- Project: name, status (defaults to `someday`, so Quick Add never silently triggers the Active Project conflict).
- Goal: title, Life Area.
- Habit: name, frequency.
- Event: title, date/time.
All other fields (description, tags, energy level, metric targets, etc.) live behind a "More options" disclosure — closed by default. Submitting commits immediately; no draft state.

**Command Palette (§0.16, architecture only — not implemented until it has a real backing search index in Phase 8):** `Cmd/Ctrl+K` opens a fuzzy-matched list combining (a) navigation targets ("Go to Today", "Go to Project X"), (b) quick actions ("Create Task", "Start Focus Session", "Open Weekly Review"), (c) live search results once Global Search exists. Architecture: a single client-side command registry (`{id, label, keywords, action}[]`) that both the palette and any future voice/AI entry point can read from — one source of truth for "things Atlas can do," not palette-specific logic duplicated elsewhere.

---

## H. Design System

**Typography:** one variable sans-serif family (system-ui fallback stack until a specific font is chosen in Phase 1), 4–5 sizes max for body/UI (xs/sm/base/lg/xl), a distinct heading scale (h1–h4), tabular numerals for metrics/timers.

**Spacing:** 4px base unit, scale 4/8/12/16/24/32/48/64 — no arbitrary pixel values in components.

**Radius:** 2 tokens — `radius-sm` (inputs, chips, badges), `radius-md` (cards, modals). No fully-rounded (pill) buttons except badges/tags.

**Core components (built once in `components/ui`, reused everywhere):** Button (primary/secondary/ghost/destructive, with loading state), Input/Textarea/Select, Card (with optional header/footer slots), Modal/Dialog, Dropdown Menu, Sidebar Nav Item, Top Nav/Header, Badge (status, priority), Progress Bar (linear) and Progress Ring (circular, for goal %), Chart primitives (thin wrapper over the charting library, §O.5), Status Dot/Indicator (never color-only, always paired with a label or icon — accessibility requirement), Tooltip, Empty State (icon/illustration + message + primary action), Skeleton (per-component shape, not a generic gray box), Toast/Inline Error.

**States every interactive component must define:** default, hover, focus-visible, active, disabled, loading, error.

---

## I. Database Architecture

### I.1 — Timezone strategy (§0.23)
All timestamps stored `timestamptz` in UTC. `profiles.timezone` (IANA string, e.g. `America/New_York`) is the single source of truth for presentation conversion — never store local time. "Day" boundaries (habit due-today, streak day, task `due_date`/`scheduled_date`) are computed server-side using the user's stored timezone at query time, not the browser's, so a user's "today" is consistent across devices. Weekly boundaries use `profiles.week_start_day` (default Monday) to compute `week_start_date` for Weekly Priorities/Reviews.

### I.2 — Calendar architecture: four distinct concepts (§0.24)
| Concept | Table | Meaning | Time precision |
|---|---|---|---|
| Task Due Date | `tasks.due_date` | Deadline, not a commitment to work | date only |
| Scheduled Task | `tasks.scheduled_date` | "I intend to work this on day X" | date only |
| Time Block | `time_blocks` | A committed slot of time, optionally tied to a task | start/end timestamptz |
| Calendar Event | `calendar_events` | A standalone event (meeting, appointment) unrelated to task execution | start/end timestamptz |
On the Calendar screen, all four render on the same grid but visually distinct (outline chip for due dates, ghost block for scheduled-but-not-timeblocked tasks, filled colored block for Time Blocks, solid bordered block for Events) — never merged into one generic "calendar item" type in the data model, only in the rendering layer.

### I.3 — Task recurrence (§0.25)
MVP supports a small closed set, stored as `tasks.recurrence_rule jsonb`: `{"freq":"daily"|"weekdays"|"weekly"|"biweekly"|"monthly","by_weekday":[0-6]?,"until":date?}`. No full RRULE/iCal grammar in MVP ("Custom" beyond this set is explicitly SHOULD/LATER). Occurrences are **not** pre-materialized as rows; the app computes visible occurrences for the queried date range at read time and writes a concrete `tasks` row only when an occurrence is actually completed/edited (so history is per-occurrence, template stays clean).

### I.4 — Habit vs. Task (§0.26)
**Task** = a finite outcome; done means it's over. **Habit** = a repeated behavior measured over time; "done today" doesn't close it, it extends a streak. UI guardrail: Quick Add's Task and Habit forms are visibly distinct tabs (not a checkbox toggle on one form), and if a user names a task with habitual language patterns (e.g., repeated identical titles across days), no automatic conversion happens — at most a non-blocking suggestion ("This looks like it repeats — turn it into a Habit?"), never silent reclassification.

### I.5 — Journal architecture (§0.27)
`journal_entries.category` enum: `daily_reflection | learning | win | problem | observation | free_note` (nullable, defaults to `free_note`). Optional polymorphic-lite links via nullable FKs `goal_id`, `project_id`, `task_id`, `decision_id` (all nullable — never required).

### I.6 — Decision Log (§0.28)
Flow fields on `decisions`: `title, context, options (jsonb array), chosen_option, reasoning, decided_at, expected_outcome, review_date, actual_outcome (nullable until review_date passes), lesson (nullable)`. A decision with a future `review_date` and no `actual_outcome` is surfaced once on that date (Dashboard/notification), not repeatedly — this is the mechanism that prevents decisions from being silently reopened without new information.

### I.7 — Idea Parking architecture (§0.29)
Status flow: `new → review_later → evaluating → promoted | rejected → archived` (rejected/archived are terminal but not deleted — soft state, not soft-deleted). Optional scoring fields `impact, effort, urgency` (small int scale 1–5, all nullable) plus a computed, non-stored `alignment` badge when the idea is linked to a Life Area at capture time. Scoring is opt-in — MVP never blocks capture on filling these in.

### I.8 — Data ownership & export (§0.38)
Every user-owned table is exportable by construction (all data reachable via `user_id`). MVP ships no export UI (LATER, §C), but the schema avoids anything that would make later export hard: no server-only computed state without a source-of-truth row, no data stored exclusively in a third-party system without a local mirror.

### I.9 — Table blueprints (§0.17 / §0.18)

Notation: `column type constraints`. All tables include `id uuid PK default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()` unless noted; these are omitted from the per-table column list below to avoid repetition. RLS is `user_id = auth.uid()` (or via parent join for child tables without a direct `user_id`) unless noted.

**Identity**
- **profiles** — 1:1 with `auth.users`. Cols: `user_id uuid PK FK→auth.users`, `full_name text`, `timezone text default 'UTC'`, `week_start_day smallint default 1`, `working_hours jsonb`, `theme text default 'dark'`. No soft delete (cascades with auth user). RLS: `user_id = auth.uid()`.
- **settings** — per-user app preferences beyond profile (notification prefs, AI provider choice). Cols: `user_id uuid PK FK→profiles`, `notification_prefs jsonb default '{}'`, `ai_provider text nullable`, `privacy jsonb default '{}'`. RLS: owner only.

**Planning hierarchy**
- **life_areas** — Cols: `user_id uuid FK`, `name text not null`, `color text`, `icon text`, `sort_order int default 0`, `deleted_at timestamptz nullable`. Unique: `(user_id, name)`. Indexes: `(user_id)`.
- **goals** — Cols: `user_id uuid FK`, `area_id uuid FK→life_areas not null`, `quarter_cycle_id uuid FK→quarter_cycles nullable`, `title text not null`, `description text`, `timeframe text check in (lifetime,5yr,3yr,1yr,90day,monthly)`, `target_date date`, `status text default 'planned' check in (planned,active,paused,completed,cancelled)`, `priority smallint`, `notes text`, `deleted_at timestamptz nullable`. Indexes: `(user_id,status)`, `(area_id)`, `(quarter_cycle_id)`.
- **goal_metrics** — Cols: `goal_id uuid FK not null`, `metric_name text`, `starting_value numeric`, `target_value numeric`, `current_value numeric`, `unit text`. Indexes: `(goal_id)`.
- **quarter_cycles** — Cols: `user_id uuid FK`, `name text`, `start_date date not null`, `end_date date not null`, `expected_outcome text`, `primary_indicator text`, `strategy text`, `risks text`. Check: `end_date > start_date`. Indexes: `(user_id, start_date)`.
- **projects** — Cols: `user_id uuid FK`, `goal_id uuid FK nullable`, `name text not null`, `description text`, `status text default 'someday' check in (active,secondary,waiting,someday,completed,archived)`, `is_primary_active boolean default false`, `priority smallint`, `start_date date`, `deadline date`, `progress numeric default 0`, `notes text`, `deleted_at timestamptz nullable`. **Partial unique index**: `(user_id) WHERE is_primary_active = true` — enforces the single Active Project rule at the DB layer. Indexes: `(user_id,status)`, `(goal_id)`.
- **milestones** — Cols: `project_id uuid FK not null`, `title text not null`, `target_date date`, `status text default 'pending' check in (pending,in_progress,done)`, `sort_order int default 0`. Indexes: `(project_id, sort_order)`.
- **weekly_priorities** — Cols: `user_id uuid FK`, `task_id uuid FK→tasks not null`, `week_start_date date not null`, `is_most_important_outcome boolean default false`. Unique: `(user_id, week_start_date, task_id)`. Constraint enforced in application layer: max 3 rows per `(user_id, week_start_date)`. Indexes: `(user_id, week_start_date)`.

**Execution**
- **tasks** — Cols: `user_id uuid FK`, `project_id uuid FK nullable`, `goal_id uuid FK nullable`, `milestone_id uuid FK nullable`, `title text not null`, `description text`, `status text default 'inbox' check in (inbox,next,today,in_progress,waiting,done,cancelled)`, `priority text default 'medium' check in (critical,high,medium,low)`, `due_date date`, `scheduled_date date`, `estimated_minutes int`, `actual_minutes int`, `energy_level text`, `context text`, `is_mit boolean default false`, `recurrence_rule jsonb`, `completed_at timestamptz`, `deleted_at timestamptz nullable`. Indexes: `(user_id,status)`, `(user_id,scheduled_date)`, `(project_id)`, `(goal_id)`.
- **tags** — Cols: `user_id uuid FK`, `name text not null`. Unique: `(user_id, name)`.
- **task_tags** — join. Cols: `task_id uuid FK not null`, `tag_id uuid FK not null`. PK: `(task_id, tag_id)`. RLS via parent task's `user_id`.
- **calendar_events** — Cols: `user_id uuid FK`, `title text not null`, `start_at timestamptz not null`, `end_at timestamptz not null`, `all_day boolean default false`, `location text`, `notes text`. Indexes: `(user_id, start_at)`.
- **time_blocks** — Cols: `user_id uuid FK`, `task_id uuid FK nullable`, `project_id uuid FK nullable`, `start_at timestamptz not null`, `end_at timestamptz not null`, `focus_context text check in (deep_work,study,planning,family,exercise,admin,other)`. Indexes: `(user_id, start_at)`.

**Habits**
- **habits** — Cols: `user_id uuid FK`, `goal_id uuid FK nullable`, `project_id uuid FK nullable`, `name text not null`, `description text`, `category text`, `frequency text check in (daily,weekdays,weekly,custom)`, `custom_days smallint[] nullable`, `target int default 1`, `preferred_time time nullable`, `start_date date not null`, `is_active boolean default true`, `deleted_at timestamptz nullable`. Indexes: `(user_id,is_active)`.
- **habit_logs** — Cols: `habit_id uuid FK not null`, `log_date date not null`, `completed boolean default true`, `note text`. Unique: `(habit_id, log_date)`. Indexes: `(habit_id, log_date)`.
- **challenges** — Cols: `user_id uuid FK`, `goal_id uuid FK nullable`, `title text`, `daily_action text`, `start_date date not null`, `status text default 'active' check in (active,completed,abandoned)`, `final_score numeric`, `reflections text`. Indexes: `(user_id,status)`.
- **challenge_days** — Cols: `challenge_id uuid FK not null`, `day_number smallint not null check between 1 and 21`, `completed boolean default false`, `note text`. Unique: `(challenge_id, day_number)`.

**Deep work / measurement**
- **focus_sessions** — Cols: `user_id uuid FK`, `task_id uuid FK nullable`, `project_id uuid FK nullable`, `context text`, `planned_minutes int`, `actual_minutes int not null`, `started_at timestamptz not null`, `ended_at timestamptz`, `note text`. Indexes: `(user_id, started_at)`.

**Memory / capture**
- **journal_entries** — Cols: `user_id uuid FK`, `category text default 'free_note'`, `body text not null`, `goal_id uuid FK nullable`, `project_id uuid FK nullable`, `task_id uuid FK nullable`, `decision_id uuid FK nullable`. Indexes: `(user_id, created_at)`.
- **ideas** — Cols: `user_id uuid FK`, `title text not null`, `description text`, `category text`, `status text default 'new' check in (new,review_later,evaluating,promoted,rejected,archived)`, `impact smallint`, `effort smallint`, `urgency smallint`, `notes text`, `review_date date nullable`, `promoted_project_id uuid FK nullable`, `deleted_at timestamptz nullable`. Indexes: `(user_id,status)`.
- **decisions** — Cols: `user_id uuid FK`, `title text not null`, `context text`, `options jsonb`, `chosen_option text`, `reasoning text`, `decided_at timestamptz default now()`, `expected_outcome text`, `review_date date`, `actual_outcome text nullable`, `lesson text nullable`, `goal_id uuid FK nullable`, `project_id uuid FK nullable`, `task_id uuid FK nullable`. Indexes: `(user_id, review_date)`.

**Reviews**
- **weekly_reviews** — Cols: `user_id uuid FK`, `week_start_date date not null`, `status text default 'in_progress' check in (in_progress,completed)`, `auto_summary jsonb` (frozen snapshot of metrics at review time), `reflection_completed text`, `reflection_missed text`, `reflection_why text`, `reflection_progress text`, `reflection_time_wasted text`, `reflection_stop_doing text`, `reflection_learned text`, `next_week_mio_task_id uuid FK nullable`, `execution_score numeric nullable`. Unique: `(user_id, week_start_date)`.
- **monthly_reviews** — Cols: `user_id uuid FK`, `month date not null` (first of month), `status text default 'in_progress'`, `auto_summary jsonb`, `wins text`, `failures text`, `lessons text`, `next_month_priorities text`. Unique: `(user_id, month)`.

**System**
- **notifications** — Cols: `user_id uuid FK`, `type text check in (critical,actionable,informational,silent_insight)`, `title text`, `body text`, `link text`, `read_at timestamptz nullable`, `source text` (e.g. `habit_reminder`, `overdue_task`). Indexes: `(user_id, read_at)`.
- **attachments** — Cols: `user_id uuid FK`, `storage_path text not null` (Supabase Storage ref), `file_name text`, `mime_type text`, `size_bytes int`, `project_id uuid FK nullable`, `task_id uuid FK nullable`, `journal_entry_id uuid FK nullable`. Indexes: `(user_id)`.

**AI (Phase 10, schema may exist earlier as inert)**
- **ai_threads** — Cols: `user_id uuid FK`, `title text`, `context_type text` (e.g. `morning_brief`, `weekly_coach`, `planning`, `freeform`), `archived boolean default false`.
- **ai_messages** — Cols: `thread_id uuid FK not null`, `role text check in (user,assistant,system)`, `content text`, `metadata jsonb`. Indexes: `(thread_id, created_at)`.
- **ai_insights** — Cols: `user_id uuid FK`, `thread_id uuid FK nullable`, `type text` (e.g. `suggest_reschedule`, `plan_breakdown`, `flag_overload`), `payload jsonb not null` (the proposed change, structured), `status text default 'pending' check in (pending,approved,rejected,expired)`, `resolved_at timestamptz nullable`. Indexes: `(user_id,status)`.

All tables: RLS policy `USING (user_id = auth.uid())` `WITH CHECK (user_id = auth.uid())` for direct-owner tables; join/child tables without `user_id` (`task_tags`, `challenge_days`, `habit_logs`, `goal_metrics`, `ai_messages`) use a policy that joins to the parent's `user_id`. No table ships without a policy — a table with RLS enabled and no policy is equivalent to a bug (silently denies everyone, including the owner), so migrations must add table + policy atomically.

---

## J. Entity Relationships (logical ERD)

```
auth.users (Supabase) ──1:1── profiles ──1:1── settings
     │
     ├──1:N── life_areas ──1:N── goals ──1:N── goal_metrics
     │                              │  \
     │                              │   \___optional___ quarter_cycles ──1:N── goals (back-ref)
     │                              │
     │                              └──1:N── projects ──1:N── milestones ──1:N── tasks
     │                                            │                              │
     │                                            │                              ├──N:1 optional── milestones
     │                                            │                              ├──N:M── tags (via task_tags)
     │                                            │                              ├──1:N── time_blocks
     │                                            │                              ├──1:N── focus_sessions
     │                                            │                              └──1:N── weekly_priorities (flag rows)
     │                                            ├──1:N── tasks (direct, no milestone)
     │                                            ├──1:N── time_blocks
     │                                            ├──1:N── focus_sessions
     │                                            ├──1:N── decisions (optional link)
     │                                            └──1:N── journal_entries (optional link)
     │
     ├──1:N── habits ──1:N── habit_logs
     ├──1:N── challenges ──1:N── challenge_days
     ├──1:N── calendar_events
     ├──1:N── ideas ──0:1── projects (promoted_project_id)
     ├──1:N── decisions
     ├──1:N── journal_entries
     ├──1:N── weekly_reviews
     ├──1:N── monthly_reviews
     ├──1:N── notifications
     ├──1:N── attachments
     └──1:N── ai_threads ──1:N── ai_messages
                    └──1:N (via user)── ai_insights
```

Lateral relationships (not part of the main vertical spine, all optional FKs): Habits ↔ Goals/Projects, Time Blocks ↔ Tasks/Projects, Focus Sessions ↔ Tasks/Projects, Journal ↔ Goal/Project/Task/Decision, Decisions ↔ Goal/Project/Task, Ideas ↔ promoted Project.

---

## K. Progress Engine

No single arbitrary percentage. Each level has its own method, chosen for what's actually measurable at that level.

| Entity | Method (MVP) | Notes |
|---|---|---|
| **Task** | Binary (done/not done) | No partial-progress tasks in MVP — split into subtasks/multiple tasks instead of a % field. |
| **Milestone** | `completed_tasks / total_tasks` linked to it | If zero tasks linked, milestone progress is manual (`status` field only: pending/in_progress/done), not computed. |
| **Project** | Weighted blend: `50% milestone completion + 50% task completion` across the project, **with a manual override field** (`projects.progress_override numeric nullable`) that, when set, takes precedence — because not all projects decompose cleanly into tasks (e.g. "write a book" isn't well served by task-counting alone). | MVP ships the computed version; manual override is a Should-Have UI affordance, schema-ready from day one. |
| **Goal** | If `goal_metrics` present: `(current_value - starting_value) / (target_value - starting_value)`, clamped 0–100%. If no metric: average of linked projects' progress. | A goal always has *some* number, never blank. |
| **90-Day Cycle** | Average progress of its linked goals, weighted equally (no per-goal weighting in MVP). | Simple by design — cycle progress is a vibe check, not a precise KPI. |
| **Habit** | Consistency % = `completed_periods / expected_periods` over the trailing window (7d/30d), not a "progress toward 100" framing — habits don't finish. | See streak logic §K.2, which is separate from consistency %. |
| **Weekly Execution** | See §L (its own algorithm, not a rollup of the above). | |

### K.2 — Streak logic (§0.22)
- **Daily habit:** streak increments if `habit_logs` has a `completed=true` row for the immediately preceding required day; a required day with no log by end-of-day (in the user's timezone) breaks the streak to 0 at day rollover, not retroactively at query time — a background-safe rule computed as: streak = count of consecutive required days ending yesterday-or-today with a completion, walking backward until a gap.
- **Weekly/weekdays/custom habit:** "required day" is defined by `frequency`/`custom_days` — a Saturday is simply not a required day for a "weekdays" habit, so it neither extends nor breaks the streak. Streak unit for `weekly` frequency is *weeks*, not days: one completion anywhere in the ISO week (per `week_start_day`) counts as that week's mark.
- **Paused habit:** setting `is_active=false` freezes the streak (excluded from break/extend calculations) rather than resetting it; reactivating resumes counting from the reactivation date, streak preserved as historical count + new count is not silently merged — UI shows "Streak paused at N" then a fresh counter, both visible.
- **Timezone:** all "day rollover" logic uses `profiles.timezone`, computed server-side (Postgres function using the stored timezone), never the client's local clock — prevents a streak break from a user simply traveling or a laptop clock being wrong.
- **Grace window:** a log dated up to 24h in the past (server "now" minus 1 day, in user tz) may still be written by the user marking it late; this back-fill is visually marked "logged late" but counts for streak purposes at its `log_date`, not at write time.

---

## L. Weekly Execution Score

### L.1 — Formula (MVP default, versioned and user-adjustable later)
```
score = 30% × WeeklyTop3Completion
      + 25% × ImportantTaskCompletion   (P1/P2 tasks completed / P1/P2 tasks due that week)
      + 20% × HabitConsistency          (that week's habit completion %)
      + 15% × FocusTimeRatio            (actual focus minutes / a configurable weekly target, capped at 100%)
      + 10% × WeeklyReviewCompleted     (binary: 100% if the previous week's review was completed, else 0%)
Result: 0–100, rounded to nearest integer.
```
This formula from the master prompt is **kept as MVP default** — reviewed and found sound with one adjustment: `WeeklyReviewCompleted` refers to *last* week's review (you can't score this week's review before the week ends), and the score for week N is only **finalized and locked** at week N's own review (Flow 12), preventing it from silently drifting if data is edited afterward. Until finalized, Dashboard shows a **live estimate** clearly labeled "In progress."

### L.2 — Missing-data behavior
- No Weekly Priorities set that week → `WeeklyTop3Completion = 0%` (not excluded/reweighted) — the absence of priorities is itself a signal worth scoring low, not a null to skip.
- No P1/P2 tasks due → `ImportantTaskCompletion` excluded from the denominator and its 25% weight is **redistributed proportionally** across the remaining components (not silently treated as 100% or 0%, both of which would misrepresent a genuinely inactive week).
- No habits configured → same redistribution rule as above for `HabitConsistency`.
- First week of account (no prior review to check) → `WeeklyReviewCompleted` excluded from denominator, redistributed.
- Redistribution rule, generalized: any component with an undefined denominator is dropped and the remaining weights are rescaled to sum to 100%.

### L.3 — Edge cases
- User completes more than 3 "priority-worthy" tasks in a week: only the 3 flagged `is_weekly_priority` count toward that component — extra completed work shows up in `ImportantTaskCompletion` and Analytics, not in Top3Completion (prevents the score from rewarding busyness over the chosen priorities).
- A Weekly Priority task is deleted mid-week: excluded from the completion denominator retroactively (never counted as "missed" for a task the user explicitly removed) but logged in the review's `auto_summary` for transparency.
- Score is **not** computed at all for a week with zero tasks, zero habits, and no review — Dashboard shows "Not enough data" instead of a misleading 0.

---

## M. AI Architecture

*(Interface designed now; not implemented until Phase 10. Nothing in this section is built during Phases 1–9 beyond the inert `ai_threads/ai_messages/ai_insights` tables.)*

### M.1 — Provider abstraction (§0.32)
```
interface AIProvider {
  chatCompletion(messages, options): Promise<AIResponse>
  structuredCompletion<T>(messages, schema): Promise<T>   // for insight payloads
}
```
Adapters: `AnthropicAdapter`, `OpenAIAdapter`, `LocalModelAdapter` (stubbed, not implemented). Selected server-side via `AI_PROVIDER` env var; UI never imports a provider-specific SDK or knows which one is active beyond a display name from `settings.ai_provider`.

### M.2 — Context Engine (§0.33)
A `ContextBuilder` per AI function assembles only the relevant slice, never the full database:
- **Morning Brief:** today's tasks, active project snapshot, weekly priorities, today's calendar, today's habits, overdue-critical tasks.
- **Evening Review:** today's completed vs. planned tasks, today's focus minutes, today's habit marks.
- **Weekly Coach:** the week's aggregated metrics (same `auto_summary` shape the Weekly Review screen already computes — reused, not recomputed differently for AI), completed/missed priorities, habit consistency, focus sessions, last 4 weeks of review history for trend.
- **Planning Assistant:** the target Goal/Project being broken down, its existing milestones/tasks (to avoid duplicate suggestions), linked Life Area.
- **Decision Assistant:** the specific decision's context/options, plus related past decisions (same `goal_id`/`project_id`) for consistency.

Each builder is a pure function `(userId, scope) → ContextPayload`, independently testable, capped at a defined token budget per function (specific budget set in Phase 10 against the chosen model's context window).

### M.3 — Action model (§0.34)
Three tiers, enforced server-side (not just hidden in the UI):
- **READ** — AI may query any context the builder assembles. No approval needed.
- **SUGGEST** — AI may propose a change (reschedule, breakdown, priority shift). Always written to `ai_insights` with `status=pending`; rendered as a card with **Approve / Modify / Ignore**. Never applied automatically.
- **WRITE** — occurs only when the user hits Approve (or edits then approves via Modify). The write uses the exact same Server Action/mutation path a human edit would use — the AI has no privileged write path that bypasses normal validation/RLS.
No **destructive** tier exists for AI in MVP scope — delete/archive-at-scale actions are excluded from what AI can even suggest until a future phase explicitly designs guardrails for it.

### M.4 — Automation engine (§0.35, design only, not built until Phase 11)
`Trigger → Condition → Action`, all declarative (stored as rows, not code), e.g.:
```
Trigger: task.overdue_days >= 3
Condition: task.priority in (critical, high)
Action: surface_on_dashboard(task)
```
```
Trigger: schedule.weekly(sunday, 18:00, user_timezone)
Action: open_weekly_review_prompt(user)
```
MVP builds zero automation execution; this section exists so the Phase 10/11 data model (`ai_insights`-adjacent or a future `automations` table) isn't designed blind later.

---

## N. Security

- **Authentication:** Supabase Auth, email/password for MVP; session via httpOnly cookies (Supabase SSR helpers), never storing tokens in `localStorage`.
- **Authorization:** RLS is the only authorization boundary — no server-side "trust the client's user id" pattern anywhere; every query, including Server Actions, re-derives the user from the authenticated session.
- **API protection:** all mutating Route Handlers verify session server-side before touching Supabase; AI routes additionally validate that the requested context scope belongs to the caller.
- **Environment variables:** `NEXT_PUBLIC_*` only for values safe to ship to the browser (Supabase URL, anon key). `SUPABASE_SERVICE_ROLE_KEY` and all AI provider keys are server-only, never referenced in a Client Component or exposed via any API response.
- **AI secret handling:** provider keys read once at server boot/request time from env, never logged, never included in any `ai_messages`/`ai_insights` payload.
- **Rate limiting:** planned at the Route Handler level for AI endpoints (cost control) and auth endpoints (brute-force mitigation) — mechanism (Vercel/Supabase native vs. a table-based counter) decided in Phase 2/10, not now.
- **Input validation:** Zod schemas at every Server Action/Route Handler boundary — never trust client-shaped input beyond type-checking.
- **File upload restrictions:** Supabase Storage buckets scoped per user path (`/{user_id}/...`), MIME-type allowlist, size cap enforced both client-side (UX) and server-side (real gate).
- **Logging:** structured server logs for errors (no `console.log` of request bodies containing user content), no PII in log aggregation beyond `user_id`.

---

## O. Technical Architecture

- **Frontend:** Next.js (App Router) + React + TypeScript (strict mode). Server Components by default; Client Components only where interactivity requires it (Kanban DnD, Focus Timer, forms, Command Palette).
- **Server:** Next.js Route Handlers + Server Actions — no separate backend service.
- **Database:** Supabase Postgres, RLS on every table.
- **Auth:** Supabase Auth.
- **Storage:** Supabase Storage, per-user-scoped buckets.
- **Background operations (future):** Supabase Edge Functions or a queue (e.g. for automation engine execution, Phase 11) — not needed before then.
- **Deployment:** Vercel.

### O.1 — Local development experience (§0.40)
Code lives on GitHub. The owner clones the repo, runs `npm install`, copies `.env.example` to `.env.local` with their own (non-production) Supabase project credentials, runs `npm run dev`, opens `localhost:3000`. No local Postgres/Docker requirement in MVP — Supabase's hosted free-tier project serves as the "local" dev database (a separate project from Preview/Production, see §Q). Later, `npx supabase start` (local Postgres via CLI) can be adopted if offline development becomes necessary — not required for Phase 1.

### O.2 — State management (§0.44)
No Redux, no global client store for server data. Categories:
- **Server state** (goals, tasks, projects, etc.) — fetched in Server Components; where client-side interactivity needs it (Kanban, Calendar), TanStack Query wraps Server Action calls for caching/optimistic updates.
- **Local UI state** (modal open, sidebar collapsed, active timer) — component state or a small Zustand store only where state must survive across routes (e.g. the running Focus Timer).
- **Form state** — React Hook Form (justification below).
- **Cached/derived state** — computed in the query layer, not duplicated into a separate store.

### O.3 — Form strategy (§0.45)
**React Hook Form + Zod** (via `@hookform/resolvers`). Justification: uncontrolled-by-default RHF avoids re-render cost on every keystroke across forms with many fields (Task/Project detail forms are large); Zod schemas are shared verbatim between client validation and the Server Action's server-side validation — one schema, defined once per entity in `lib/validation/`. Autosave: debounced Server Action calls on Detail views (Task/Project/Goal edit) rather than an explicit Save button, matching the "reduce friction" product principle; Quick Add and creation forms remain explicit-submit (no accidental partial creates). Dirty-state indicator shown only where autosave is not instant-feeling (large text fields).

### O.4 — Drag and drop (§0.46)
Recommend **dnd-kit**: actively maintained, accessible (keyboard sensor support out of the box, satisfying §H's a11y baseline), React-native (no jQuery-era dependency), reasonably light, works acceptably on touch. Not installed yet — confirmed at the start of Phase 5 when Kanban is actually built.

### O.5 — Charting (§0.47)
Recommend **Recharts**: built on SVG (accessible DOM structure, unlike canvas-only libraries), React-idiomatic, sufficient for the fixed, non-decorative metric set in §C/§Analytics. No 3D, no animation-heavy chart library. Confirmed at start of Phase 9.

### O.6 — Calendar library (§0.48)
**Trade-off analysis:** a full-featured library (e.g. FullCalendar) buys drag-resize, recurrence rendering, and multi-view switching quickly, at the cost of a large bundle, CSS override fights to match the custom design system, and a licensing model to check for commercial use. A hand-built calendar buys exact visual/DX control and a smaller bundle, at the cost of reimplementing date-grid math, drag interactions, and accessibility that a mature library already solved.
**Recommendation:** build a **lightweight custom grid** for Day/Week/Month views (date math via `date-fns`, no calendar mega-library), since Atlas OS's calendar needs (four distinct item types rendered on one grid, tight design-system integration, no multi-calendar/timezone-juggling in MVP) are narrower than what general-purpose calendar libraries optimize for. Revisit only if Phase 6 implementation reveals the hand-built approach is consuming disproportionate time.

### O.7 — Error strategy (§0.49)
- **Expected errors** (validation failure, not found, conflict like the Active Project rule): typed error responses from Server Actions, rendered as inline/toast messages in plain language — never a raw exception string.
- **Unexpected errors:** Next.js error boundaries per route segment, logged server-side, user sees a generic "Something went wrong, try again" with a retry action, never a stack trace.
- **Network errors:** client mutation wrappers detect offline/timeout and show "Connection issue — retrying" with automatic retry (bounded) before surfacing a manual retry button.
- **Database errors:** never surfaced verbatim (no raw Postgres error text to the user); mapped to the closest expected-error category or the generic unexpected-error message.
- **Auth errors:** specific, actionable messages (wrong password vs. unconfirmed email vs. rate-limited) rather than a single generic "login failed."
- **AI errors:** provider timeout/failure degrades gracefully — the rest of the app is fully usable with AI features simply showing "AI Coach is unavailable right now," never blocking core flows.

### O.8 — Loading strategy (§0.50)
Skeletons shaped to their final content (not generic gray boxes) for Dashboard cards, lists, and Kanban columns. Optimistic updates for high-frequency low-risk actions (task complete, habit mark, kanban move) with rollback + toast on failure. Button-level loading state (spinner + disabled) for all form submits. Page-level loading only for full-route navigation via Next.js `loading.tsx`. No global blocking spinner for local mutations.

### O.9 — Offline strategy (§0.51)
Not implemented before Phase 12, but architecture decisions made now to avoid a rewrite later:
- Data fetching centralized through the query layer (§O.2), never ad hoc `fetch` calls scattered in components — this is the single seam a future service worker / cache layer plugs into.
- Read models for Today, Tasks, Habits, and Journal are kept as plain serializable JSON shapes (no functions/class instances in fetched data) so they're trivially cacheable (IndexedDB/localStorage) later.
- No feature is designed to require a live round-trip mid-interaction beyond the initial fetch + the final submit (e.g. no server-side-only computed field the UI can't render from already-fetched data) — keeps a future "stale-but-usable" offline read mode realistic without redesigning components.
- Write-while-offline is explicitly deferred (§C, DO NOT BUILD YET) — no optimistic-write queue is built prematurely.

### O.10 — Performance budget (§0.53)
Server Components by default (minimize client JS); Client Components justified per-file, not per-convenience. Pagination on any list that can exceed ~50 rows (Tasks table, Journal, Ideas archive). Lazy-load secondary routes (Analytics charts, AI Coach) via Next.js's automatic route-level code splitting. DB indexes defined alongside every table in §I.9 up front, not retrofitted. No N+1: list views fetch via a single joined/aggregated query per screen, not per-row follow-up queries — enforced by code review checklist per phase (§55/§R).

---

## P. Repository Structure

**Decision: feature-based (domain) organization over a flat/global-component split**, with a small shared `components/ui` for true design-system primitives only.

**Reasoning (§0.43 justification):** Atlas OS has ~14 distinct domains (goals, projects, tasks, calendar, habits, journal, ideas, reviews, analytics, ai...) each with meaningfully different data shapes and logic. A flat `/components` + `/hooks` + `/services` split (organized by *technical layer*) would force constant cross-navigation between 4–5 folders to work on one feature, and invites accidental coupling once files are 40+ deep. A `features/` (domain-first) structure keeps everything needed to understand or change "Habits" in one place, mirrors the mental model used throughout this blueprint (§A–§L are all organized by domain, not by layer), and scales better as phases add domains incrementally — each phase adds a folder, not a scattering of files across existing ones. The one technical-layer exception is `components/ui` (true cross-domain primitives like Button/Card/Modal) and `lib/` (cross-domain infrastructure: Supabase clients, AI provider, validation helpers) — layer-first only where sharing, not domain logic, is the point.

```
/
├── app/                          # Next.js App Router — routing + composition only
│   ├── (auth)/{login,signup,forgot-password}/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── today/
│   │   ├── goals/[id]?/
│   │   ├── plan-90-days/
│   │   ├── projects/[id]?/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── habits/
│   │   ├── focus/
│   │   ├── journal/
│   │   ├── ideas/
│   │   ├── reviews/
│   │   ├── analytics/
│   │   ├── ai-coach/
│   │   └── settings/
│   └── api/ai/                   # server-only AI route handlers
├── features/                     # domain logic, one folder per bounded context
│   ├── goals/        {components, actions, queries, types, schema.ts}
│   ├── projects/
│   ├── tasks/
│   ├── kanban/
│   ├── calendar/
│   ├── habits/
│   ├── challenges/
│   ├── focus/
│   ├── journal/
│   ├── ideas/
│   ├── decisions/
│   ├── reviews/
│   ├── analytics/
│   └── ai/
│       └── providers/{anthropic.ts, openai.ts, local.ts}
├── components/
│   ├── ui/                       # design-system primitives only (§H)
│   └── layout/                   # Sidebar, Header, QuickAdd, CommandPalette
├── lib/
│   ├── supabase/{server.ts, client.ts, middleware.ts}
│   ├── ai/{provider.ts, context-builder.ts}
│   ├── validation/                # shared Zod schemas, one file per entity
│   ├── time/                      # timezone/date helpers (§I.1)
│   └── utils/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── types/database.ts              # generated from Supabase
├── docs/
│   ├── PRODUCT_UNDERSTANDING_REPORT.md
│   ├── PHASE_0_BLUEPRINT.md        (this file)
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── PRODUCT.md
│   ├── DESIGN_SYSTEM.md
│   ├── AI_ARCHITECTURE.md
│   ├── SECURITY.md
│   └── decisions/                  # ADRs, one file per decision (§P.1)
├── tests/
├── CHANGELOG.md
└── README.md
```
Each `features/<domain>/` folder owns its Server Actions, data-fetching functions, Zod schema, types, and feature-specific components; only genuinely cross-domain UI lives in `components/`.

### P.1 — Documentation structure & ADRs (§0.55, §0.56)
Maintained continuously, not written once at the end: `README.md` (setup), `ARCHITECTURE.md` (system-level, updated each phase), `DATABASE.md` (schema, updated on every migration), `PRODUCT.md` (this blueprint's living summary), `DESIGN_SYSTEM.md`, `AI_ARCHITECTURE.md` (activated in Phase 10), `SECURITY.md`, `CHANGELOG.md`. Significant architecture decisions get a file in `/docs/decisions/NNNN-title.md` using: **Number, Title, Status, Context, Options, Decision, Consequences, Date.** Central architecture (data model shape, provider abstraction, Active Project rule, folder structure decided in §P) is never changed silently — a change requires a new ADR superseding the old one.

---

## Q. Deployment Strategy

**Environments:** Development (local, own Supabase project, dummy/test data only) → Preview (Vercel preview deployments per PR/branch, a separate Supabase project or Supabase branching if available on plan, safe to break) → Production (Vercel production, production Supabase project, real user data — never used for experimentation).

**Environment variables (names only, no real secrets created at this stage):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server-only, never in client bundle
AI_PROVIDER                      # e.g. "anthropic" | "openai" | "local"
ANTHROPIC_API_KEY                # present only if AI_PROVIDER=anthropic
OPENAI_API_KEY                   # present only if AI_PROVIDER=openai
```
Each environment has its own Supabase project (or branch) and its own `.env` set in Vercel's environment-scoped variables — no shared production secrets in Preview/Development.

**Local-to-live path for the project owner (§0.40):** code on GitHub → Claude assists development on a branch → owner runs locally (`localhost:3000`) against a Development Supabase project to verify → push triggers a Vercel Preview deployment for review → merge to main deploys to Production → accessible via the production URL from any device (desktop, phone, tablet) once deployed; no separate mobile build needed since it's a responsive web app.

---

## R. Testing Strategy

**Levels:** Type checking (`tsc --noEmit`, zero errors, gate on every phase close) → Lint (ESLint, zero errors) → Unit (Vitest — pure functions: progress calculations §K, score algorithm §L, streak logic §K.2, recurrence occurrence expansion §I.3, context builders §M.2) → Integration (Testing Library — feature components against a test Supabase instance or mocked client) → E2E (Playwright — critical flows only, not exhaustive coverage) → Build verification (`next build` succeeds) as the final gate before any phase is declared complete.

**Priority E2E flows (built incrementally as each phase lands, not all at once):**
1. Authentication (signup → login → logout → protected route redirect)
2. Create Goal → verify appears in Goals + Life Map
3. Create Project → Active Project conflict modal behavior
4. Create Task → appears in Tasks/Kanban/Today as scheduled
5. Schedule Task → appears correctly on Calendar
6. Complete Task → status + score inputs update
7. Habit tracking → mark habit → streak updates correctly across a simulated day boundary
8. Weekly Review → auto-summary renders → completion locks the score

No E2E for AI flows until Phase 10 defines mockable provider responses (never hit a real paid API in CI).

---

## S. Risks and Tradeoffs

1. **RLS misconfiguration** is the single highest-severity risk — a table shipped without (or with an incorrect) policy silently exposes or silently locks out data. Mitigation: policy is part of the same migration as the table, checklist-verified per table in Phase 2.
2. **Scope discipline vs. document size** — this blueprint is large by necessity; the risk is treating Phase 0's completeness as license to over-build inside any single later phase. Mitigation: §C's MUST/SHOULD/LATER/DO-NOT-BUILD split is the enforced gate, re-checked at the start of every phase.
3. **Weekly Score subjectivity** — changing weights retroactively breaks comparability. Mitigation: §L.1's finalize-at-review-time rule plus future versioning (store which formula version produced each historical score) once the algorithm becomes user-adjustable (post-MVP).
4. **Kanban optimistic UI race conditions** — two views editing the same task near-simultaneously. Mitigation: `updated_at`-based conflict detection, last-write-wins with a visible "this was updated elsewhere" toast rather than silent overwrite.
5. **Hand-built calendar (§O.6)** — the explicit trade-off is DX/control now vs. possible rework if requirements grow (multi-calendar, recurrence rendering) beyond what a lightweight grid comfortably handles. Accepted risk, flagged for revisit if Phase 6 proves it wrong.
6. **AI cost/latency (Phase 10)** — mitigated architecturally by the Context Engine (§M.2) sending scoped, not full, context; still requires real budget-setting once a provider/model is chosen.
7. **Recurrence simplicity (§I.3)** — capping MVP recurrence to a fixed pattern set is a deliberate complexity trade: covers the large majority of real recurring-task use cases without building a full RRULE engine; a user needing true custom recurrence waits for a later phase.
8. **Offline architecture readiness vs. YAGNI** — §O.9 asks Phases 1–9 to keep data-fetching centralized "for later offline support" without building offline now; risk is this constraint being forgotten under time pressure. Mitigation: it's a normal good-architecture practice (no ad hoc fetches) independent of offline, so it costs nothing extra to follow.
9. **Third-party integrations (Phase 11)** introduce OAuth/token-storage security surface not present anywhere else in the app — treated with the same rigor as Auth itself when that phase arrives, not bolted on casually.

---

## T. Revised Development Roadmap

**No reordering of the 12 phases.** Dependency analysis confirms the original sequence is sound:

1. **Foundation** — no dependencies; establishes app shell, design system, theming.
2. **Auth + DB** — must precede any data-owning feature (RLS needs authenticated users to scope to).
3. **Dashboard** — depends on 2 for real data; can render meaningful empty states even with zero domain tables populated, so it's reasonable to build the shell here and wire real modules as Phases 4–9 land (Dashboard cards are, in practice, incrementally connected — this blueprint's §G is the target state, not a single-phase deliverable in full).
4. **Goals + Life Map + 90-Day Plan** — must precede Projects (`projects.goal_id` FK) and Weekly Priorities' upward context.
5. **Projects + Tasks + Kanban** — depends on 4 for the optional Goal FK; Tasks/Kanban don't strictly require Goals to function (a task can be goalless), so this phase is not blocked if 4 slips, only enriched by it.
6. **Today + Calendar + Time Blocking** — depends on 5 (Tasks must exist to schedule/block them).
7. **Habits + Challenges + Focus Timer** — independent of Calendar's internals; correctly sequenced after the core execution loop (5–6) exists to link against, but has no hard technical dependency on 6 beyond optional FKs.
8. **Journal + Ideas + Decision Log** — lowest technical risk, correctly placed after the execution loop so linked-entity dropdowns (Goal/Project/Task) have real data to reference.
9. **Reviews + Analytics** — hard dependency on all of 4–8 (nothing to aggregate otherwise); correctly last among the non-AI phases.
10. **AI Intelligence Layer** — hard dependency on a stable, populated schema (Context Engine needs real data shapes); correctly after 9.
11. **Integrations + Automation** — expands outward only once core (1–10) is proven; correctly last-but-one.
12. **Production Hardening** — correctly final; hardening an incomplete product wastes the audit.

One clarification, not a reorder: **Phase 3 (Dashboard)** is best understood as *scaffolded* in its own phase (layout, empty states, static structure per §G) and then *progressively wired* to real data as Phases 4–9 each land their domain — rather than fully data-complete the moment Phase 3 closes. This matches how the master prompt's own Phase 3 acceptance ("Dashboard conectado a datos reales") is necessarily partial until later phases exist to connect to. Flagging this now so Phase 3's acceptance criteria (written when that phase starts) don't over-promise.

---

## U. Phase 1 Acceptance Criteria

Phase 1 ("Product Foundation") is complete only when all of the following hold:

- [ ] Next.js + TypeScript (strict) + Tailwind project initialized and building cleanly (`next build` succeeds, zero type errors, zero lint errors).
- [ ] Folder structure matches §P (`app/`, `features/`, `components/ui`, `components/layout`, `lib/`, `docs/`).
- [ ] Design system primitives from §H exist as real components (Button, Input, Card, Modal, Badge, Progress Bar/Ring, Skeleton, Empty State, Tooltip) with documented states (default/hover/focus/disabled/loading/error), usable in Storybook-less form (rendered on a temporary `/dev/components` route or equivalent) for visual verification.
- [ ] Sidebar navigation renders all §D primary items, routes to placeholder pages (empty-state stub per §F for each).
- [ ] Header with Quick Add button (opens the modal shell per §G, no persistence wired yet — that's Phase 2+ once a table exists to write to) and search/notification icon placeholders (non-functional, per §D note on deferred wiring).
- [ ] Dark/Light theme toggle functional, tokens from §0.13 defined in one place (no hardcoded colors in components).
- [ ] Responsive baseline verified at desktop/tablet/mobile breakpoints for the shell (sidebar collapses appropriately per §0.14) — no functional pages yet, but the shell itself must not break.
- [ ] Supabase project created (Development environment) and connected via env vars per §Q, but **no schema/tables created yet** (that's Phase 2) — connection verified via a trivial health check only.
- [ ] `.env.example` committed with all variable names from §Q (no real secrets).
- [ ] `README.md` updated with local setup instructions matching §O.1.
- [ ] `ARCHITECTURE.md` and `DESIGN_SYSTEM.md` stubs created in `/docs`, reflecting the decisions in this blueprint (not re-litigating them).
- [ ] No RLS, no tables, no auth flows, no AI code — those are explicitly out of Phase 1's scope per the master prompt's own phase boundaries.

Phase 1 is a **shell**, not a feature. If any checklist item requires a real database table or an authenticated user, it has leaked into Phase 2's scope and should be deferred.

---

PHASE 0 STATUS: READY FOR REVIEW
