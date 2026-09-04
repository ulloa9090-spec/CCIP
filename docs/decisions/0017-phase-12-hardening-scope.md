# ADR 0017: Phase 12 hardening scope — PDF export, rate limiting, and offline read

**Status**: Accepted
**Date**: 2026-09-04

## Context

Phase 12 ("Production Hardening") is the last phase in the roadmap (blueprint §T) and has no dedicated checklist in the blueprint the way Phase 1 does (§U) — only two concretely-named leftover product items exist in blueprint §C's LATER list that no earlier phase claimed: "CSV/PDF export, full backup" and "PWA installable shell + partial offline read." Beyond those, "hardening" draws on §O.7 (errors), §N (security/rate limiting), and §O.10 (performance) without a fixed feature list, requiring the same kind of scoping call every prior phase's opening ADR made.

## Decision

- **PDF export is not built.** JSON (a complete per-user table dump, doubling as blueprint's "full backup" — one mechanism, not two) and CSV (Tasks, Journal) export for real. A real PDF requires a rendering library (`pdfkit`, `@react-pdf/renderer`, or a headless-browser approach) — a meaningfully heavier dependency than this pass's other work, and JSON/CSV already cover "get your data out," which is the actual blueprint concern (§I.8, data ownership).
- **Rate limiting**: Supabase Auth's own built-in brute-force protections cover login/signup/password-reset (verified and documented in `docs/SECURITY.md`, not reimplemented — blueprint §N explicitly names "Vercel/Supabase native ... mechanism decided in Phase 2/10" as one of the two acceptable approaches). AI generation gets a real, code-level cap instead — `DAILY_AI_GENERATION_LIMIT = 50` per user per day (`features/ai/actions.ts`), counted from successful completions only (a missing-key failure never wrote an assistant message, so it's never counted against the budget), reusing the exact same `AIUnavailableError`/graceful-degradation path a missing provider key already uses.
- **Offline scope**: read-only, partial, exactly as blueprint §O.9 specifies — a service worker (`public/sw.js`) caches static assets and previously-visited pages, falling back to `/offline` for anything never visited. No offline write queue, no background sync — explicitly out of scope per blueprint §C's DO-NOT-BUILD-YET list.

## Consequences

- A user wanting a PDF report of their data uses the JSON/CSV export and a tool of their choice to convert it — acceptable for MVP; revisit if PDF is specifically requested.
- The AI usage cap is a flat per-user daily number, not tiered by provider cost or plan — simplest thing that provides real cost protection; a future phase could differentiate Anthropic vs. OpenAI cost if that becomes a real concern.
- Offline read only helps a user return to a page they've already opened in that browser (the service worker's cache is per-origin, per-browser, exactly like the `localStorage`-style caveats already documented elsewhere in this codebase) — it is not a substitute for a real connection, and was never meant to be at this phase.
