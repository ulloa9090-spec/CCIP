-- Security fix found by the Phase 4 RLS isolation test: goals_insert_own and
-- goals_update_own only checked user_id = auth.uid(), not that area_id /
-- quarter_cycle_id actually belong to that same user. A user could insert a
-- goal pointing at another user's life_area or quarter_cycle id (RLS on the
-- joined table still prevented reading that other user's row through the
-- relation, but it was a real cross-tenant integrity hole — e.g. it could
-- block another user's life_area deletion via the on-delete-restrict FK).

drop policy "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.life_areas la
      where la.id = area_id and la.user_id = (select auth.uid())
    )
    and (
      quarter_cycle_id is null
      or exists (
        select 1 from public.quarter_cycles qc
        where qc.id = quarter_cycle_id and qc.user_id = (select auth.uid())
      )
    )
  );

drop policy "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.life_areas la
      where la.id = area_id and la.user_id = (select auth.uid())
    )
    and (
      quarter_cycle_id is null
      or exists (
        select 1 from public.quarter_cycles qc
        where qc.id = quarter_cycle_id and qc.user_id = (select auth.uid())
      )
    )
  );
