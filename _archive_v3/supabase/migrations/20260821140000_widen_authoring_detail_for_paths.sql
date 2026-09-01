-- `schema_rejected` named nothing actionable.
--
-- Production returned it for a real failure and left the question "which of the
-- draft's forty fields" unanswered — the same shape of problem `provider_failure`
-- had before it was classified. The failing path is field names the schema
-- already defines, so it carries no model output and no learner content.
--
-- Digits are allowed because a path segment can be an array index
-- (`ACTIVITIES_2_CRITERIAVI`).

alter table public.lesson_jobs
  drop constraint if exists lesson_jobs_learning_authoring_detail;

alter table public.lesson_jobs
  add constraint lesson_jobs_learning_authoring_detail check (
    learning_authoring_detail is null
    or learning_authoring_detail ~ '^[a-z_]+(:[A-Z0-9_]{1,60})?$'
  );
