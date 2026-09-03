# Security

Living record of the security model as actually implemented. See `PHASE_0_BLUEPRINT.md` §N for the full target design.

## Authentication

Supabase Auth, email/password. Session stored as httpOnly cookies via `@supabase/ssr` (never `localStorage`). `proxy.ts` refreshes the session and revalidates the user (`getUser()`, not just a cached `getSession()`) on every request to a protected route.

## Authorization: Row Level Security

Every user-owned table has RLS enabled **in the same migration that creates it** — never added later. As of Phase 2: `profiles` and `settings`, both with `select`/`update` policies scoped to `(select auth.uid()) = user_id`, no `insert`/`delete` policy (rows are managed only by the signup trigger and the `auth.users` cascade).

**RLS is the only authorization boundary.** No Server Action or Route Handler trusts a client-supplied user id — every query re-derives the user from the authenticated session server-side, and the database enforces isolation independent of whatever the application layer does or forgets to do.

### Isolation verified

Tested directly against Postgres's RLS engine (not just reasoned about) using two real `auth.users` rows and Postgres's own JWT-claim simulation (`set local role authenticated; set local request.jwt.claim.sub = '<user-id>'`) via `mcp__Supabase__execute_sql`, run as a single transaction that cleaned up after itself:

- User A sees exactly their own `profiles`/`settings` row, never User B's.
- User A's `update` against User B's `profiles` row affects 0 rows.
- User A's `delete` against User B's `profiles` row affects 0 rows (no delete policy exists at all).
- User A's `insert` of an arbitrary `profiles` row is rejected (`violates row-level security policy`).
- User B, symmetrically, sees only their own row and can update it.

This exercises the same policy engine PostgREST uses in production — it is not a mock.

## Secrets

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: safe to ship to the browser by Supabase's own design (RLS is the real boundary, not key secrecy), but still supplied only via env vars, never hardcoded.
- `SUPABASE_SERVICE_ROLE_KEY`: present in `.env.example` as a name only, left **blank** in this project's `.env.local` — nothing server-side needs elevated access yet. Never referenced in a Client Component; if a future phase needs it, it stays in a Route Handler/Server Action only.
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`: unused until Phase 10, never referenced client-side when they are.
- `.env.local` is gitignored (verified with `git check-ignore`); only `.env.example`, which holds no real values, is committed.

## Database hardening (via `get_advisors`)

Both `security` and `performance` advisors report zero findings as of the last migration. Fixed during Phase 2:
- `set_updated_at()` had a mutable `search_path` — pinned to `public`.
- `handle_new_user()` (a `security definer` function) was callable directly via PostgREST RPC by `anon`/`authenticated` — `EXECUTE` revoked from both, and from the trigger-only `set_updated_at()` too. Neither function should ever be called directly; both still work as triggers, since trigger invocation bypasses `EXECUTE` grants.
- All four RLS policies re-evaluated `auth.uid()` per row — rewritten to `(select auth.uid())` so Postgres evaluates it once per query.

## Known limitation of this development session

This session's outbound network access is restricted to a small host allowlist; `*.supabase.co` is not on it (confirmed via the egress proxy's own diagnostics — a `403` policy denial logged against the project's host). This means the running Next.js app, inside this sandbox, cannot itself complete a live signup/login round trip here — only the privileged `mcp__Supabase__*` tool channel could reach the database, which is what all schema and RLS testing above used. This is specific to this remote session's egress policy, not a defect in the app or an issue that exists when running `npm run dev` on a normal machine or in a Preview/Production deployment (see `docs/ENVIRONMENT.md`).

## Live auth E2E validation: PENDING

`tests/auth-smoke.mjs` (Playwright, drives the real UI through signup → profile check → logout → protected-route redirect → login → session persistence → wrong-password handling) has **not yet been run against real network access**. Two Claude Code Remote cloud environments on this account were tried as alternates to this sandbox and both were unable to complete a live run — one confirmed the identical `*.supabase.co` block, the other never got a live result. Phase 2 is **provisionally approved** by the project owner on the strength of the schema/RLS verification above alone; the live E2E result is an explicit open item, to be completed from the owner's local machine and then recorded here (pass/fail, date, environment). Until that entry exists, do not treat live authentication as confirmed working end-to-end — only the database-level guarantees (RLS isolation, schema correctness) and static code review are verified.
