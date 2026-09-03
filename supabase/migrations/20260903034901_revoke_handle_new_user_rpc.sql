-- Supabase's default privileges grant EXECUTE on every new function in the
-- public schema to anon/authenticated explicitly (separate from the PUBLIC
-- pseudo-role), so the previous migration's `revoke ... from public` didn't
-- reach handle_new_user's explicit grants. Revoke those directly.

revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
