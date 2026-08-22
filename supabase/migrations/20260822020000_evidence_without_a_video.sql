-- A learner starting from zero cannot understand any video, and waiting until
-- they can is the gap this product exists to cross. But until now the evidence
-- table could not record that they had learned anything unless a video lesson
-- produced it: `learning_item_states.source_lesson_version_id` was `not null`
-- and pointed at a `lesson_versions` row.
--
-- That is the "video is the centre" assumption written into the schema, and it
-- is the hardest place to leave it, because a database constraint does not
-- argue — it simply refuses the insert. So a beginner's first word had nowhere
-- to live.
--
-- The origin becomes explicit rather than inferred from a null. A null source
-- could equally mean "no video" or "we lost the link", and those must never be
-- confusable: the paired check below makes a video-sourced row without its
-- source impossible to write, which is exactly the corruption a bare nullable
-- column would allow in silence.

alter table public.learning_item_states
  alter column source_lesson_version_id drop not null,
  add column origin text not null default 'video_lesson';

alter table public.learning_item_states
  add constraint learning_item_states_origin
    check (origin in ('video_lesson', 'beginner_input')),
  add constraint learning_item_states_origin_matches_source check (
    (origin = 'video_lesson' and source_lesson_version_id is not null)
    or (origin = 'beginner_input' and source_lesson_version_id is null)
  );

-- Delayed review has to reach beginner words too, or the first thousand words
-- would be the only thing the product never reviews — the exact opposite of
-- what the spacing research says to do with them. Origin is not repeated here:
-- a review session already points at its item, and duplicating the origin would
-- create a second place for it to be wrong.
alter table public.learning_review_sessions
  alter column source_lesson_version_id drop not null;

-- Words the learner has produced with no support open. This is the input to the
-- i+1 gate, and it is deliberately stricter than "has seen": a word recognised
-- on a page is not a word someone can build a sentence from.
create or replace function public.learner_known_words(p_owner_user_id uuid)
returns table (word text)
language sql
stable
security definer
set search_path = public
as $$
  select item_key
  from public.learning_item_states
  where owner_user_id = p_owner_user_id
    and last_independent_at is not null
  order by item_key
$$;

revoke all on function public.learner_known_words(uuid) from public;

-- Evidence from a generated sentence, which has no lesson version behind it.
-- `p_independent` is the whole point: it is only true when the learner produced
-- the word with every support closed, and it can only ever move forward, so a
-- later supported attempt cannot erase proof of an earlier unsupported one.
create or replace function public.record_beginner_word_evidence(
  p_owner_user_id uuid,
  p_word text,
  p_independent boolean
)
returns public.learning_item_states
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.learning_item_states;
begin
  if p_owner_user_id is null or p_owner_user_id <> auth.uid() then
    raise exception 'beginner evidence must be recorded by its owner';
  end if;

  insert into public.learning_item_states (
    owner_user_id,
    item_key,
    origin,
    source_lesson_version_id,
    exposure_count,
    attempt_count,
    successful_retrievals,
    last_seen_at,
    last_independent_at
  ) values (
    p_owner_user_id,
    p_word,
    'beginner_input',
    null,
    1,
    1,
    case when p_independent then 1 else 0 end,
    now(),
    case when p_independent then now() else null end
  )
  on conflict (owner_user_id, item_key) do update set
    exposure_count = public.learning_item_states.exposure_count + 1,
    attempt_count = public.learning_item_states.attempt_count + 1,
    successful_retrievals = public.learning_item_states.successful_retrievals
      + case when p_independent then 1 else 0 end,
    last_seen_at = now(),
    last_independent_at = case
      when p_independent then now()
      else public.learning_item_states.last_independent_at
    end
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.record_beginner_word_evidence(uuid, text, boolean) from public;
grant execute on function public.learner_known_words(uuid) to authenticated;
grant execute on function public.record_beginner_word_evidence(uuid, text, boolean) to authenticated;
