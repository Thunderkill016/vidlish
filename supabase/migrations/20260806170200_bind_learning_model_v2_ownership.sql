-- RLS filters by owner_user_id, so each child row must structurally carry the
-- same owner as its parent. RPC checks are not enough: service-role writes and
-- future maintenance scripts must not be able to create ownership drift.

alter table public.lessons
  add constraint lessons_id_owner_user_id_key unique (id, owner_user_id);

alter table public.lesson_versions
  add constraint lesson_versions_id_owner_user_id_key unique (id, owner_user_id),
  add constraint lesson_versions_owned_lesson_fk
    foreign key (lesson_id, owner_user_id)
    references public.lessons (id, owner_user_id)
    on delete cascade;

alter table public.lesson_sessions
  add constraint lesson_sessions_id_owner_user_id_key unique (id, owner_user_id),
  add constraint lesson_sessions_owned_version_fk
    foreign key (lesson_version_id, owner_user_id)
    references public.lesson_versions (id, owner_user_id)
    on delete cascade;

alter table public.activity_attempts
  add constraint activity_attempts_owned_session_fk
    foreign key (session_id, owner_user_id)
    references public.lesson_sessions (id, owner_user_id)
    on delete cascade;

alter table public.learning_item_states
  add constraint learning_item_states_owned_version_fk
    foreign key (source_lesson_version_id, owner_user_id)
    references public.lesson_versions (id, owner_user_id)
    on delete cascade;
