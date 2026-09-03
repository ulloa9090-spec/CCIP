-- Phase 5 follow-up: cover the two FKs the advisors flagged as unindexed.
-- task_tags' PK (task_id, tag_id) covers task_id lookups but not tag_id
-- alone; weekly_priorities' unique index leads with user_id/week_start_date,
-- not task_id, so a lookup by task_id (e.g. an ON DELETE CASCADE) still
-- scans. Same "index every FK" discipline as the rest of this migration set.
create index task_tags_tag_id_idx on public.task_tags (tag_id);
create index weekly_priorities_task_id_idx on public.weekly_priorities (task_id);
