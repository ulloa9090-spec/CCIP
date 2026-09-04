-- Phase 12 production-hardening audit: the performance advisor flagged two
-- FK columns without a covering index, missed when their tables were
-- created (Phase 9's weekly_reviews, Phase 10's ai_insights) — same class
-- of gap Phase 5's tasks_kanban_missing_fk_indexes migration fixed.
create index if not exists ai_insights_thread_id_idx on public.ai_insights (thread_id);
create index if not exists weekly_reviews_next_week_mio_task_id_idx on public.weekly_reviews (next_week_mio_task_id);
