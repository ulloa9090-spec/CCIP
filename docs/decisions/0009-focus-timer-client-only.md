# ADR 0009: Focus Timer runs client-side only — no cross-route/refresh persistence yet

**Status**: Accepted
**Date**: 2026-09-03

## Context

Blueprint Flow 9 (Focus Timer) expects start/pause/resume/finish, with the actual elapsed time logged as a `focus_sessions` row on finish. Separately, §O's technical architecture calls out that "local UI state ... component state or a small Zustand store only where state must survive across routes (e.g. **the running Focus Timer**)" — flagging, but not mandating for a first pass, that a fully robust timer needs to survive navigating away from `/focus` and coming back (and, implicitly, a page refresh).

## Decision

Phase 7 ships the Focus Timer confined to the `/focus` page: `features/focus/components/focus-timer.tsx` holds start/pause/resume/finish state in plain `useState`/`useRef`, with a `setInterval` tick. No global store (Zustand or otherwise) was added. Navigating away from `/focus` while a timer is running loses that timer's in-progress state — there's no persistent mini-widget elsewhere in the shell showing an active session, and no `localStorage`/`sessionStorage` backup of an in-flight timer.

The one DB write happens at `logFocusSession()` — called when the user finishes (or chooses to save a partial session from the review step) — with the actual elapsed minutes already computed client-side. Blueprint Flow 9's "leaving mid-session prompts 'Save partial session?'" is handled differently: rather than an unreliable `beforeunload` browser prompt, finishing (early or on time) always lands on an in-page review step with a Save/Discard choice before anything is written — same outcome (nothing is silently lost without the user choosing), reached without depending on browser unload events.

## Consequences

- Refreshing `/focus` or navigating to another route while the timer is running discards that session's progress — a real, user-visible gap versus a native timer app. Acceptable for a first pass; not silently pretended away.
- No new dependency (Zustand) was added for this. If cross-route persistence is wanted later, the natural shape is a small store (or `localStorage`-backed `useState` initializer) holding `{startedAt, accumulatedSeconds, taskId, projectId, context}`, plus a persistent indicator in `Header` — a scoped addition, not a rewrite of `FocusTimer` itself, since the component's start/pause/finish logic doesn't change, only where its state lives.
- Focus sessions logged from a fully-run timer are unaffected — this limitation only touches sessions interrupted by navigation/refresh before the user reaches the Save/Discard review step.
