# StudyOS — project instructions

StudyOS is a **local-first** Electron/React/TypeScript desktop app for
macOS (PDFs → intelligent library, courses, lessons, quizzes, flashcards,
and a grounded AI tutor). Full product/architecture docs live in
[`docs/`](./docs) — **read `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`,
and `docs/DECISIONS.md` (ADRs) before making a non-trivial change.**
`docs/DECISIONS.md` is the authoritative record of *why* things are the
way they are; check it before "fixing" something that looks odd.

## Adoption mode

This repo follows the user's global Elite Product Engineering Standard
(`~/.claude/CLAUDE.md`) in **HYBRID mode**:

- Preserve the established architecture and visual language below unless
  there's a strong, documented reason to change them.
- Apply the global standard to new work; improve touched areas
  opportunistically when risk is low.
- No mass redesign/rewrite without the user explicitly asking for one.
- Where this file or `docs/DECISIONS.md` conflicts with the global
  standard on a *project-specific* call (e.g. dark-mode-first, Spanish UI
  copy), this file wins per the global standard's own §19 — unless it's a
  security/privacy/accessibility/correctness risk, in which case flag it.

## Established conventions (verified in this codebase — don't reinvent)

- **Layering:** IPC handler → Service → Repository. IPC handlers wrap
  every call in a `handle()` helper that maps thrown `AppError`s to a
  serialized JSON error (`src/shared/types/errors.ts`); services hold
  business logic; repositories are the only code that touches SQL.
- **Errors:** always `AppError` (`code`, `userMessage` in Spanish,
  optional `cause`), never a bare `throw new Error(...)` across an IPC
  boundary.
- **Electron security posture is non-negotiable:** `sandbox: true`,
  `contextIsolation: true`, `nodeIntegration: false`. The preload script
  stays dependency-free (sandboxed preloads can't resolve node_modules)
  and only exposes typed `window.studyos.<domain>.<method>` functions via
  `contextBridge`.
- **Database:** `better-sqlite3`, versioned migrations via `PRAGMA
  user_version` (`src/main/database/migrations/000N_*.ts`, registered in
  `migrations/index.ts`). Schema changes are additive columns/tables
  where practical, never destructive without a real reason. IDs are
  ULIDs via the shared `ulid()` helper.
- **AI abstractions stay split:** `AIProvider` (generation) and
  `EmbeddingProvider` (embeddings) are independent interfaces
  (`src/shared/types/ai.ts`) so embeddings can stay 100% local while
  generation uses a remote provider — see ADR-004/005. Extend these
  additively; never break an existing call site.
- **Design system:** `src/renderer/src/design-system/` — before building
  a new UI primitive, check whether `Button`/`Card`/`StatusBadge`/
  `ProgressBar`/`EmptyState`/`LoadingState` already covers it. Tokens
  (color/spacing/radius/motion) live in `design-system/tokens.css`;
  never hardcode a color/spacing value that already has a token. Dark
  mode is the base identity (ADR-003); light mode is the explicit
  alternative, never auto `prefers-color-scheme`.
- **UI copy is in Spanish**, matching the rest of the app — new
  user-facing strings should be too, unless the surrounding feature is
  explicitly bilingual.
- **RAG/Tutor grounding (Closed Library Mode, ADR-014):** the Tutor only
  answers from retrieved chunks, cites sources it never fabricates, and
  has **no numeric similarity threshold** today — abstention is the
  model's own textual judgment, not a score cutoff (see ADR-024). Don't
  invent one without a new ADR.
- **Architectural/scope decisions get an ADR** in `docs/DECISIONS.md`
  (numbered, Spanish, `Contexto` → `Decisiones` → `Verificación` format)
  — especially when reality conflicts with an assumption in a spec or an
  existing doc. Document the conflict; don't silently patch around it.
- **Tests:**
  - `tests/unit/` mirrors `src/` (vitest, `pnpm test`).
  - `tests/e2e/` drives the real built app via Playwright's `_electron`
    (`pnpm build` then `pnpm test:e2e`; needs `xvfb-run` on Linux). No
    live network calls — fake providers / seeded fixtures only.
  - `tests/eval/` is the offline, deterministic Evaluation Lab (`pnpm
    eval`) — retrieval/quality regression checks with a keyword-vector
    fake embedding provider, never the real ~90MB local model.
  - `tests/ai-smoke/` is opt-in, real-OpenAI verification (`pnpm
    test:ai-smoke`, needs `OPENAI_API_KEY`) — **never** part of `pnpm
    test`/CI.
  - New test directories must be added to `tsconfig.node.json`'s
    `include` list or `pnpm typecheck` silently skips them.
- **Before calling work done:** `pnpm typecheck && pnpm lint && pnpm
  test` must pass; for a real UI change, actually run the app (see the
  `run` skill) rather than only trusting unit tests.

## Known, deliberate gaps (see `docs/ARCHITECTURE.md` "Pendiente de
concretar")

Real OpenAI calls and the embedding model's first-run download aren't
reachable from this sandboxed dev container (no network to
`api.openai.com` / the model CDN) — verify those on the target Mac, not
here. Don't treat a missing-network failure in dev as a real bug without
checking ADR-012/015/016/018/021 first.
