-- Harden the two trigger-only functions from the previous migration, per
-- Supabase's security advisor (get_advisors) run immediately after applying it:
--   1. Pin search_path on set_updated_at (was mutable).
--   2. Revoke PostgREST RPC exposure — neither function is meant to be
--      called directly (both are trigger functions; handle_new_user is
--      security definer and must not be callable by anon/authenticated).
-- Triggers invoke these internally regardless of EXECUTE grants, so
-- revoking public/anon/authenticated execute does not break the triggers.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.handle_new_user() from public;
