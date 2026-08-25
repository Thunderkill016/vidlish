-- Elicited imitation results, kept so they can be compared with each other.
--
-- Comparability is the entire point of this table. Every other number this
-- product holds is produced by the thing that did the teaching, and a test set
-- by the teacher is always easier than the world. This one is a sitting the
-- learner takes against a fixed bank they were never taught, so two sittings a
-- month apart answer "did I actually get better" rather than "did I attend".
--
-- What is stored is the verdict, never the speech. The transcript is scored in
-- the request and discarded, exactly as the speaking self-check discards audio:
-- a row here says which lengths held and which broke, and nothing that could
-- reconstruct what the learner said.

create table public.learner_imitation_measurements (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  taken_at timestamptz not null default now(),
  attempted integer not null,
  passed integer not null,
  -- The band. `held_to` is the longest length reproduced and `broke_at` the
  -- shortest that failed; they may cross, because near a ceiling passes and
  -- failures interleave and pretending otherwise would invent precision.
  held_to integer not null,
  broke_at integer not null,
  -- True when nothing in the bank defeated the learner, so the number reported
  -- is the instrument's ceiling rather than theirs.
  above_bank boolean not null,
  /* The bank changes over time; a score is only comparable to another taken
     against the same items. */
  bank_version text not null,
  constraint learner_imitation_measurements_counts
    check (attempted > 0 and passed >= 0 and passed <= attempted),
  constraint learner_imitation_measurements_band
    check (held_to between 0 and 60 and broke_at between 0 and 60),
  constraint learner_imitation_measurements_bank_version
    check (bank_version ~ '^[a-z0-9][a-z0-9.:-]{2,63}$'),
  -- Passing nothing cannot be recorded as having held anything, and passing
  -- everything cannot be recorded as having broken inside the bank.
  constraint learner_imitation_measurements_above_bank_agrees
    check (not above_bank or passed = attempted)
);

create index learner_imitation_measurements_owner_taken_at
  on public.learner_imitation_measurements (owner_user_id, taken_at desc);

alter table public.learner_imitation_measurements enable row level security;

create policy learner_imitation_measurements_select_own
  on public.learner_imitation_measurements for select to authenticated
  using (auth.uid() = owner_user_id);

revoke all privileges on table public.learner_imitation_measurements
  from public, anon, authenticated;
grant select on table public.learner_imitation_measurements to authenticated;
grant select, insert on table public.learner_imitation_measurements to service_role;
