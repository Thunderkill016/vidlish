-- A learner's self-report only means something once it has been checked against
-- words that do not exist. This stores the result of that check.
--
-- It is a separate table rather than a column on the learner because the point
-- is the history: one unreliable check is a bad day, and a run of them is a
-- product that has been recording fiction. A single overwritten column could
-- never tell those apart.

create table public.learner_calibrations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  checked_at timestamptz not null default now(),
  word_trials integer not null,
  nonword_trials integer not null,
  false_alarms integer not null,
  hits integer not null,
  reliable boolean not null,
  constraint learner_calibrations_counts_nonnegative check (
    word_trials >= 0 and nonword_trials >= 0
    and false_alarms >= 0 and hits >= 0
  ),
  -- A false alarm is a yes to a nonword, so there cannot be more of them than
  -- there were nonwords. Same for hits and real words. Without this a bug that
  -- swapped the two would be invisible and would make every learner look
  -- reliable.
  constraint learner_calibrations_within_trials check (
    false_alarms <= nonword_trials and hits <= word_trials
  )
);

create index learner_calibrations_latest
  on public.learner_calibrations (owner_user_id, checked_at desc);

alter table public.learner_calibrations enable row level security;

create policy learner_calibrations_select_own
  on public.learner_calibrations for select to authenticated
  using (owner_user_id = auth.uid());

-- No insert policy: the browser reports answers, the server decides what they
-- mean. A learner who could write their own verdict could write themselves a
-- reliable one.

create or replace function public.record_learner_calibration(
  p_owner_user_id uuid,
  p_word_trials integer,
  p_nonword_trials integer,
  p_hits integer,
  p_false_alarms integer,
  p_reliable boolean
)
returns public.learner_calibrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.learner_calibrations;
begin
  if p_owner_user_id is null or p_owner_user_id <> auth.uid() then
    raise exception 'calibration must be recorded by its owner';
  end if;

  insert into public.learner_calibrations (
    owner_user_id, word_trials, nonword_trials, hits, false_alarms, reliable
  ) values (
    p_owner_user_id, p_word_trials, p_nonword_trials, p_hits, p_false_alarms,
    p_reliable
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.record_learner_calibration(uuid, integer, integer, integer, integer, boolean) from public;
grant execute on function public.record_learner_calibration(uuid, integer, integer, integer, integer, boolean) to authenticated;
