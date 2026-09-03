# AI Architecture

Living record of the AI layer as actually built (Phase 10). Design target is `PHASE_0_BLUEPRINT.md` §M; this file tracks what's true *now*. Atlas OS's AI is a context-aware advisor over structured data, not a chatbot — every feature here either reads (no approval needed) or suggests (a card the user must Approve/Modify/Ignore before anything changes).

## Provider abstraction (`lib/ai/provider.ts`, `features/ai/providers/`)

```ts
interface AIProvider {
  chatCompletion(messages, options?): Promise<AIResponse>;
  structuredCompletion<T>(messages, schema, options?): Promise<T>;
}
```

`getAIProvider(preferredProvider?)` is the one place an adapter is instantiated (dynamic `import()`, so an unused SDK never enters another route's bundle). Provider selection: an explicit `preferredProvider` argument (the caller's resolved `settings.ai_provider`) wins; otherwise the deployment's `AI_PROVIDER` env var; otherwise `anthropic`.

- **`AnthropicAdapter`** (`@anthropic-ai/sdk`) — `chatCompletion` via `messages.create`; `structuredCompletion` via forced tool-use (`tool_choice: {type: "tool", name: ...}`, the tool's `input_schema` is the caller's JSON Schema, the response's `tool_use` block's `input` is the typed result).
- **`OpenAIAdapter`** (`openai`) — `chatCompletion` via `chat.completions.create`; `structuredCompletion` via `response_format: {type: "json_schema", ...}`.
- **`LocalModelAdapter`** — a stub. Blueprint §C: "Local/self-hosted LLM adapter (interface allows it later, not implemented now)." Always throws a clear error; exists so selecting it fails predictably rather than silently falling through to a different provider.

Each adapter's constructor reads its own env var (`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`) and throws `AIUnavailableError` immediately if missing — never a bare crash later mid-call. Every AI entry point (`features/ai/actions.ts`) catches this (and any other error from the provider call) and degrades: the thread/message it was already writing stays as-is, no assistant reply is added, and the UI (`app/(app)/ai-coach/[threadId]/page.tsx`) shows "AI Coach is unavailable right now" when the last message has no reply — never a crashed page, never blocking any other feature (blueprint §O.7).

## Context Engine (`features/ai/context/`)

Split into two files per the same pattern Phase 9's `aggregate.ts`/`execution-score.ts` established:

- **`build.ts`** (`server-only`) — one exported function per builder, each doing its own Supabase reads (reusing existing `features/*/queries.ts` functions from Phases 3–9 wherever the same data is already assembled elsewhere — Morning Brief in particular pulls from exactly the same fetchers Dashboard's widgets use), then handing the shaped data to a pure formatter.
- **`format.ts`** (no `server-only`, `tsx`-testable) — one pure `formatXPrompt(data)` function per builder, turning already-fetched data into the text block sent to the model. Deliberately caps list lengths (10 tasks, 5 related decisions, etc.) rather than truncating a finished string, so the token budget is bounded by *what's included*, never by cutting a sentence in half. Verified directly: `tests/ai-context-format.ts`, 24 cases, run via `npx tsx`.

| Builder | Context type | Reads |
|---|---|---|
| Morning Brief | `morning_brief` | today's tasks, Active Project, weekly priorities, today's calendar, today's due habits, overdue/critical tasks |
| Evening Review | `evening_review` | today's completed vs. planned tasks, today's focus minutes, today's habit marks |
| Weekly Coach | `weekly_coach` | `computeWeeklyMetrics()` (the exact `WeeklyMetrics` shape Weekly Review's `auto_summary` uses — Phase 9's `features/reviews/aggregate.ts`, reused not recomputed), weekly-priority detail, last 4 completed weeks' locked execution scores |
| Planning Assistant | `planning` | the target Goal/Project, its linked Life Area or Goal, everything already broken down under it (to avoid duplicate suggestions) |
| Decision Assistant | `decision_assistant` | the decision's context/options, related past decisions sharing the same `goal_id`/`project_id` that have been resolved (with their outcome and lesson) |

`ContextPayload = { contextType, summary, promptText }` — `summary` is the same structured data the prompt was built from (available for a future "context chips" UI showing what was in scope), `promptText` is what's actually sent.

## Action Model (blueprint §M.3)

Three tiers, enforced in `features/ai/actions.ts` — never just hidden in the UI:

- **READ** — Morning Brief, Evening Review, Decision Assistant, and freeform chat call `chatCompletion` and store the reply as an `ai_messages` row. No `ai_insights` row, nothing to approve, nothing writable.
- **SUGGEST** — Weekly Coach and Planning Assistant call `structuredCompletion` with a JSON Schema asking for a narrative message *and* an optional structured suggestion. If the model proposes one, it's written to `ai_insights` with `status='pending'` — never applied. `InsightCard` (`features/ai/components/insight-card.tsx`) renders it with **Approve** (optionally after editing fields inline — the blueprint's "Modify"), and **Ignore**.
- **WRITE** — happens only in `approveInsight()`, and only by calling the *exact same Server Action a human edit already uses*:
  - `plan_breakdown` → `createTask()` per task item, `addMilestone()` per milestone item (both pre-existing, Phase 4/5 actions) — the same `taskSchema`/`milestoneSchema` Zod validation a human's form submission goes through, since `approveInsight()` builds a real `FormData` and calls them the same way a `<form action={...}>` would.
  - `suggest_reschedule` → `rescheduleTask(taskId, newDueDate)`, a small new action added to `features/tasks/actions.ts` this phase (mirrors `updateTaskStatus`'s existing shape exactly — a direct-call mutation, not a form-shaped one).

No destructive tier exists for AI — nothing here can delete or archive anything, matching blueprint §M.3's explicit exclusion.

## Insight payload shapes (`features/ai/types.ts`)

```ts
type AiInsightPayload =
  | { kind: "plan_breakdown"; targetType: "goal" | "project"; targetId: string; targetTitle: string;
      items: { title: string; kind: "milestone" | "task"; priority?: string }[] }
  | { kind: "suggest_reschedule"; taskId: string; taskTitle: string;
      fromDate: string | null; toDate: string; reason: string };
```

`ai_insights.type`'s check constraint currently allows exactly these two values (`plan_breakdown`, `suggest_reschedule`) — see ADR 0013 for why the other four blueprint-named AI features (Morning Brief, Evening Review, Decision Assistant, and the deferred Anti-Distraction Guard) don't produce insights.

## AI Coach UI (`app/(app)/ai-coach/`)

- **`/ai-coach`** — three generate-on-demand cards (Morning Brief, Evening Review, Weekly Coach — each a direct `<form action={...}>` calling its Server Action, same pattern as Phase 9's `startOrGetWeeklyReview`), a "New Conversation" freeform form, and a list of recent threads.
- **`/ai-coach/[threadId]`** — the message list, any pending `InsightCard`s for that thread, and a `ChatInput` (`useActionState` over `sendChatMessage`) so any thread — including a generated brief — can be followed up on.
- **Entry points elsewhere**: "Ask AI to Break This Down" on Goal Detail (`/goals/[id]`) and Project Detail (`/projects/[id]`) call `startPlanningAssistant()`; "Ask AI for Perspective" on an unresolved Decision Detail (`/journal/decisions/[id]`) calls `startDecisionAssistant()`.

## Settings (`features/settings/`)

`AiProviderForm` (Settings page) writes `settings.ai_provider` via `updateAiProvider()` — "Use deployment default" clears the override (stores `null`). This is the first thing in `features/settings/` at all; every other Settings group (Working Hours, Notification Preferences, Privacy, Data Export, Archived Content) remains a documented placeholder, unrelated to this phase.

## Security (blueprint §N)

- Provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) are read only inside each adapter's constructor, server-side, never logged, never included in any `ai_messages`/`ai_insights` row.
- No provider SDK is ever imported by a Client Component — `lib/ai/provider.ts` and `features/ai/providers/*.ts` are all `server-only`; the UI never knows which provider is active beyond the display name in Settings.
- RLS is the only authorization boundary on `ai_threads`/`ai_messages`/`ai_insights`, same as every other table — see `docs/SECURITY.md` for the isolation test.

## Known limitations (see ADR 0013)

- Live success-path testing against a real Anthropic/OpenAI key has not been run in this development sandbox (no key configured here) — PENDING, same honest status as Phase 2's auth E2E test.
- The Anti-Distraction Guard (blueprint §D.2/§C) is deferred, not built this phase — its proactive-detection shape doesn't fit any of this phase's read-on-demand or approve-a-suggestion patterns.
- `DEFAULT_WEEKLY_FOCUS_TARGET_MINUTES` (Phase 9, ADR 0011) remains a fixed constant; Weekly Coach's context includes the same fixed target, not a per-user one.
