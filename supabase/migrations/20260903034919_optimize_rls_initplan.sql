-- Performance advisor (get_advisors) flagged auth.uid() being re-evaluated
-- per row in each policy. Wrapping it in a scalar subselect lets Postgres
-- evaluate it once per query instead of once per row.

drop policy "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = user_id);

drop policy "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "settings_select_own" on public.settings;
create policy "settings_select_own" on public.settings
  for select using ((select auth.uid()) = user_id);

drop policy "settings_update_own" on public.settings;
create policy "settings_update_own" on public.settings
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
