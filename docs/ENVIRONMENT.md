# Environments

## Development

| | |
|---|---|
| Purpose | Local development only for Atlas OS. Not shared with any other project. |
| Provider | Supabase |
| Project name | `atlas-os-development` |
| Project ref | `ipqcaxjgyiqxsfgavaiw` |
| Region | `us-east-1` |
| Postgres | 17 |
| Plan | Free tier ($0/month) |
| Created | 2026-09-03 |

Provisioned under the same Supabase organization as other unrelated projects on this account — `atlas-os-development` is dedicated solely to this app; no other project's data lives here and this project's data/credentials are never reused elsewhere.

### Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase dashboard for `atlas-os-development` (Project Settings → API), or ask whoever provisioned the project for them directly. **Never commit `.env.local`** — it's gitignored, and only `.env.example` (which holds no real values) is tracked.
3. `SUPABASE_SERVICE_ROLE_KEY` stays blank locally unless a specific server-side task genuinely requires elevated access (none does as of Phase 2) — least privilege by default.
4. Verify connectivity: `npm run dev`, then open `/api/health`. `{"status":"connected"}` confirms the app can reach Supabase; `{"status":"not_configured"}` means the env vars above are missing or empty.

### What's allowed here

- Schema experiments, test data, throwaway users — this project is meant to be broken and reset during development.
- Running migrations from `supabase/migrations/` freely.

### What's never allowed here

- Real user data.
- Reuse by any project other than Atlas OS.
- Committing its URL/keys to git (the anon/publishable key is safe to expose in a browser bundle by Supabase's own design, but is still kept out of the repository — env vars are supplied per-environment via `.env.local`/hosting provider settings, never hardcoded).

## Preview

Not yet provisioned. Created at Phase 12 deployment setup (or earlier if PR preview deploys are needed sooner) — its own Supabase project, separate from Development and Production, per blueprint §Q.

## Production

**Not created.** Explicitly out of scope until the project owner decides to launch. Do not provision a Production Supabase project without explicit instruction.
