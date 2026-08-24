-- The curriculum labels every activity with one of listening, speaking, reading
-- or writing, and the runtime ignored the label: every activity, including the
-- thirteen that claim speaking, was answered by typing and written as a
-- dictation. That is the same modality-collapsing lie that
-- 20260823164000_separate_beginner_dictation_evidence.sql was created to remove,
-- reappearing one level up — there it was "typed once, counted as produced",
-- here it is "typed once, counted as spoken".
--
-- Rather than repeat that migration's shape (a column triple per modality, which
-- needs a new migration for every skill ever added), record skill evidence in
-- its own table keyed by skill. The existing columns are left exactly as they
-- are, so every assertion already written about them still holds.
--
-- Historical rows are deliberately not backfilled. Nothing in the old data says
-- which skill an attempt exercised, and inventing that would manufacture a
-- learner history that never happened.

create table public.beginner_skill_evidence (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  skill text not null,
  successful_count integer not null default 0,
  last_successful_at timestamptz,
  last_independent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (owner_user_id, item_key, skill),
  constraint beginner_skill_evidence_skill
    check (skill in ('listening', 'speaking', 'reading', 'writing')),
  constraint beginner_skill_evidence_count_nonnegative
    check (successful_count >= 0),
  -- Independence is a strictly stronger claim than success, so it can never be
  -- recorded without one. A row asserting the reverse would be unreadable.
  constraint beginner_skill_evidence_independent_implies_successful
    check (last_independent_at is null or last_successful_at is not null)
);

alter table public.beginner_skill_evidence enable row level security;

create policy beginner_skill_evidence_select_own
  on public.beginner_skill_evidence for select to authenticated
  using (auth.uid() = owner_user_id);

revoke all privileges on table public.beginner_skill_evidence
  from public, anon, authenticated;
grant select on table public.beginner_skill_evidence to authenticated;
grant select, insert, update, delete on table public.beginner_skill_evidence
  to service_role;

-- A challenge now carries which skill it exercises, because the browser must
-- not be the thing that decides. `introduce_word` keeps no skill: reporting
-- that a word came back is not one of the four skills, it is the self-report
-- the nonword calibration exists to keep honest.
alter table public.beginner_evidence_challenges
  drop constraint beginner_evidence_challenges_kind;

alter table public.beginner_evidence_challenges
  add constraint beginner_evidence_challenges_kind
  check (kind in ('introduce_word', 'dictation', 'spoken', 'written', 'reading'));

-- The shape constraint enumerated the two old kinds, so it would have rejected
-- every new kind outright rather than allowing a wrong one through. Restate it
-- as the rule it was always expressing: only the standalone word arrives
-- without a sentence; everything graded against held text must carry one.
alter table public.beginner_evidence_challenges
  drop constraint beginner_evidence_challenges_sentence_shape;

alter table public.beginner_evidence_challenges
  add constraint beginner_evidence_challenges_sentence_shape check (
    (kind = 'introduce_word' and sentence_text is null)
    or
    (kind <> 'introduce_word' and sentence_text is not null
      and char_length(sentence_text) between 1 and 200)
  );

-- Extend the evidence RPC to also write the skill dimension. The existing
-- writes are untouched: this adds a row that says which of the four skills the
-- attempt exercised, which is the thing no previous table could express.
create or replace function public.record_beginner_challenge_evidence(
  p_owner_user_id uuid,
  p_challenge_id uuid,
  p_successful boolean,
  p_independent boolean
)
returns public.learning_item_states
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_challenge public.beginner_evidence_challenges;
  v_row public.learning_item_states;
  v_skill text;
begin
  select * into v_challenge
  from public.beginner_evidence_challenges
  where id = p_challenge_id
    and owner_user_id = p_owner_user_id
    and consumed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'beginner evidence challenge not available';
  end if;

  update public.beginner_evidence_challenges
  set consumed_at = now()
  where id = v_challenge.id;

  insert into public.learning_item_states (
    owner_user_id,
    item_key,
    origin,
    source_lesson_version_id,
    exposure_count,
    attempt_count,
    successful_retrievals,
    successful_dictations,
    last_seen_at,
    last_independent_at,
    last_successful_dictation_at,
    last_independent_dictation_at
  ) values (
    p_owner_user_id,
    lower(v_challenge.target_word),
    'beginner_input',
    null,
    1,
    1,
    case
      when v_challenge.kind = 'introduce_word' and p_independent then 1
      else 0
    end,
    case
      when v_challenge.kind = 'dictation' and p_successful then 1
      else 0
    end,
    now(),
    case
      when v_challenge.kind = 'introduce_word' and p_independent then now()
      else null
    end,
    case
      when v_challenge.kind = 'dictation' and p_successful then now()
      else null
    end,
    case
      when v_challenge.kind = 'dictation' and p_independent then now()
      else null
    end
  )
  on conflict (owner_user_id, item_key) do update set
    exposure_count = public.learning_item_states.exposure_count + 1,
    attempt_count = public.learning_item_states.attempt_count + 1,
    successful_retrievals = public.learning_item_states.successful_retrievals
      + case
          when v_challenge.kind = 'introduce_word' and p_independent then 1
          else 0
        end,
    successful_dictations = public.learning_item_states.successful_dictations
      + case
          when v_challenge.kind = 'dictation' and p_successful then 1
          else 0
        end,
    last_seen_at = now(),
    last_independent_at = case
      when v_challenge.kind = 'introduce_word' and p_independent then now()
      else public.learning_item_states.last_independent_at
    end,
    last_successful_dictation_at = case
      when v_challenge.kind = 'dictation' and p_successful then now()
      else public.learning_item_states.last_successful_dictation_at
    end,
    last_independent_dictation_at = case
      when v_challenge.kind = 'dictation' and p_independent then now()
      else public.learning_item_states.last_independent_dictation_at
    end
  returning * into v_row;

  -- Which skill this attempt exercised, decided by the server-owned challenge
  -- kind and never by the browser. A failed attempt still writes a row, because
  -- "tried speaking and did not succeed" is evidence and silence is not.
  v_skill := case v_challenge.kind
    when 'dictation' then 'listening'
    when 'spoken' then 'speaking'
    when 'written' then 'writing'
    when 'reading' then 'reading'
    else null
  end;

  if v_skill is not null then
    insert into public.beginner_skill_evidence (
      owner_user_id,
      item_key,
      skill,
      successful_count,
      last_successful_at,
      last_independent_at
    ) values (
      p_owner_user_id,
      lower(v_challenge.target_word),
      v_skill,
      case when p_successful then 1 else 0 end,
      case when p_successful then now() else null end,
      case when p_successful and p_independent then now() else null end
    )
    on conflict (owner_user_id, item_key, skill) do update set
      successful_count = public.beginner_skill_evidence.successful_count
        + case when p_successful then 1 else 0 end,
      last_successful_at = case
        when p_successful then now()
        else public.beginner_skill_evidence.last_successful_at
      end,
      last_independent_at = case
        when p_successful and p_independent then now()
        else public.beginner_skill_evidence.last_independent_at
      end;
  end if;

  return v_row;
end;
$$;

revoke all on function public.record_beginner_challenge_evidence(uuid, uuid, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.record_beginner_challenge_evidence(uuid, uuid, boolean, boolean)
  to service_role;
