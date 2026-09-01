-- Review evidence follows the same structural ownership rule as lesson v2:
-- RLS/RPC checks are not enough because future service-role scripts must not be
-- able to attach an attempt owned by one learner to another learner's session
-- or forge a response/evaluation shape for a different review step.

alter table public.learning_review_sessions
  add constraint learning_review_sessions_id_owner_user_id_key
    unique (id, owner_user_id),
  add constraint learning_review_sessions_owned_version_fk
    foreign key (source_lesson_version_id, owner_user_id)
    references public.lesson_versions (id, owner_user_id)
    on delete cascade;

alter table public.learning_review_attempts
  add constraint learning_review_attempts_owned_session_fk
    foreign key (review_session_id, owner_user_id)
    references public.learning_review_sessions (id, owner_user_id)
    on delete cascade,
  add constraint learning_review_attempts_response_matches_step check (
    (step = 'recall' and response ->> 'kind' = 'text')
    or (step = 'transfer' and response ->> 'kind' = 'self_check')
  ),
  add constraint learning_review_attempts_evaluation_matches_step check (
    coalesce(evaluation ->> 'step', '') = step
  );
