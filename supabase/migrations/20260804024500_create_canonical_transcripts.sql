create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.lesson_jobs(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete restrict,
  strategy_id text not null,
  provider text not null,
  source_type text not null,
  declared_language text,
  available_languages text[] not null default '{}',
  track_kind text not null,
  translation_status text not null,
  normalized_hash text not null,
  normalization_version text not null,
  duration_ms bigint not null,
  segment_count integer not null,
  created_at timestamptz not null default now(),
  constraint transcripts_strategy check (strategy_id = 'supadata-native-caption'),
  constraint transcripts_provider check (provider = 'supadata'),
  constraint transcripts_source_type check (source_type = 'native_caption'),
  constraint transcripts_track_kind check (track_kind in ('unknown', 'manual', 'auto')),
  constraint transcripts_translation_status check (translation_status in ('unknown', 'original')),
  constraint transcripts_hash_format check (normalized_hash ~ '^[a-f0-9]{64}$'),
  constraint transcripts_duration_positive check (duration_ms > 0),
  constraint transcripts_segment_count_positive check (segment_count > 0),
  unique (job_id, normalized_hash, normalization_version)
);

create index transcripts_owner_created_at
  on public.transcripts (owner_user_id, created_at desc);

alter table public.transcripts enable row level security;
create policy transcripts_select_own
  on public.transcripts for select to authenticated
  using (auth.uid() = owner_user_id);
revoke all privileges on table public.transcripts from public, anon, authenticated;
grant select on table public.transcripts to authenticated;
grant select, insert, update, delete on table public.transcripts to service_role;

create table public.transcript_segments (
  id text not null,
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null,
  start_ms bigint not null,
  end_ms bigint not null,
  text text not null,
  confidence double precision,
  detected_language text,
  created_at timestamptz not null default now(),
  constraint transcript_segments_pkey primary key (transcript_id, id),
  constraint transcript_segments_id_format check (id ~ '^seg_[a-f0-9]{32}$'),
  constraint transcript_segments_position_nonnegative check (position >= 0),
  constraint transcript_segments_time_valid check (start_ms >= 0 and end_ms > start_ms),
  constraint transcript_segments_text_nonempty check (length(btrim(text)) > 0),
  constraint transcript_segments_confidence check (confidence is null or confidence between 0 and 1),
  unique (transcript_id, position)
);

create index transcript_segments_transcript_position
  on public.transcript_segments (transcript_id, position);

alter table public.transcript_segments enable row level security;
create policy transcript_segments_select_own
  on public.transcript_segments for select to authenticated
  using (auth.uid() = owner_user_id);
revoke all privileges on table public.transcript_segments from public, anon, authenticated;
grant select on table public.transcript_segments to authenticated;
grant select, insert, update, delete on table public.transcript_segments to service_role;

create table public.transcript_acquisition_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_key text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.lesson_jobs(id) on delete cascade,
  transcript_id uuid references public.transcripts(id) on delete set null,
  strategy_id text not null,
  provider text not null,
  result_kind text not null,
  reason_code text,
  segment_count integer,
  duration_ms bigint,
  latency_ms integer not null,
  created_at timestamptz not null default now(),
  constraint transcript_attempt_strategy check (strategy_id = 'supadata-native-caption'),
  constraint transcript_attempt_provider check (provider = 'supadata'),
  constraint transcript_attempt_result check (
    result_kind in ('success', 'not_applicable', 'retryable_failure', 'terminal_failure')
  ),
  constraint transcript_attempt_latency_nonnegative check (latency_ms >= 0),
  constraint transcript_attempt_segment_count check (segment_count is null or segment_count >= 0),
  constraint transcript_attempt_duration check (duration_ms is null or duration_ms >= 0)
);

create index transcript_attempts_job_created_at
  on public.transcript_acquisition_attempts (job_id, created_at desc);

alter table public.transcript_acquisition_attempts enable row level security;
create policy transcript_attempts_select_own
  on public.transcript_acquisition_attempts for select to authenticated
  using (auth.uid() = owner_user_id);
revoke all privileges on table public.transcript_acquisition_attempts from public, anon, authenticated;
grant select on table public.transcript_acquisition_attempts to authenticated;
grant select, insert, update, delete on table public.transcript_acquisition_attempts to service_role;

alter table public.lesson_jobs
  add column canonical_transcript_id uuid references public.transcripts(id) on delete set null;

create or replace function public.record_transcript_acquisition_attempt(
  p_attempt_key text,
  p_owner_user_id uuid,
  p_job_id uuid,
  p_strategy_id text,
  p_provider text,
  p_result_kind text,
  p_reason_code text,
  p_latency_ms integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.lesson_jobs
    where id = p_job_id and owner_user_id = p_owner_user_id
  ) then
    raise exception 'generation job not found';
  end if;

  insert into public.transcript_acquisition_attempts (
    attempt_key,
    owner_user_id,
    job_id,
    strategy_id,
    provider,
    result_kind,
    reason_code,
    latency_ms
  ) values (
    p_attempt_key,
    p_owner_user_id,
    p_job_id,
    p_strategy_id,
    p_provider,
    p_result_kind,
    p_reason_code,
    p_latency_ms
  )
  on conflict (attempt_key) do nothing;
end;
$$;

create or replace function public.persist_canonical_transcript(
  p_attempt_key text,
  p_owner_user_id uuid,
  p_job_id uuid,
  p_youtube_video_id text,
  p_strategy_id text,
  p_provider text,
  p_source_type text,
  p_declared_language text,
  p_available_languages text[],
  p_track_kind text,
  p_translation_status text,
  p_normalized_hash text,
  p_normalization_version text,
  p_duration_ms bigint,
  p_latency_ms integer,
  p_segments jsonb
)
returns table (transcript_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_video_id uuid;
  v_transcript_id uuid;
  v_created boolean := false;
  v_segment_count integer;
begin
  select lesson_jobs.video_id into v_video_id
  from public.lesson_jobs
  join public.videos on videos.id = lesson_jobs.video_id
  where lesson_jobs.id = p_job_id
    and lesson_jobs.owner_user_id = p_owner_user_id
    and videos.youtube_video_id = p_youtube_video_id
  for update of lesson_jobs;

  if v_video_id is null then
    raise exception 'generation job not found';
  end if;

  if p_translation_status = 'translated' then
    raise exception 'translated caption cannot be canonical source speech';
  end if;

  if jsonb_typeof(p_segments) <> 'array' or jsonb_array_length(p_segments) = 0 then
    raise exception 'canonical transcript requires segments';
  end if;
  v_segment_count := jsonb_array_length(p_segments);

  insert into public.transcripts (
    owner_user_id,
    job_id,
    video_id,
    strategy_id,
    provider,
    source_type,
    declared_language,
    available_languages,
    track_kind,
    translation_status,
    normalized_hash,
    normalization_version,
    duration_ms,
    segment_count
  ) values (
    p_owner_user_id,
    p_job_id,
    v_video_id,
    p_strategy_id,
    p_provider,
    p_source_type,
    p_declared_language,
    coalesce(p_available_languages, '{}'),
    p_track_kind,
    p_translation_status,
    p_normalized_hash,
    p_normalization_version,
    p_duration_ms,
    v_segment_count
  )
  on conflict (job_id, normalized_hash, normalization_version) do nothing
  returning id into v_transcript_id;

  if v_transcript_id is not null then
    v_created := true;

    insert into public.transcript_segments (
      id,
      transcript_id,
      owner_user_id,
      position,
      start_ms,
      end_ms,
      text,
      confidence,
      detected_language
    )
    select
      segment->>'id',
      v_transcript_id,
      p_owner_user_id,
      (segment->>'position')::integer,
      (segment->>'startMs')::bigint,
      (segment->>'endMs')::bigint,
      segment->>'text',
      case when segment ? 'confidence' then (segment->>'confidence')::double precision else null end,
      nullif(segment->>'detectedLanguage', '')
    from jsonb_array_elements(p_segments) as segment;
  else
    select id into v_transcript_id
    from public.transcripts
    where job_id = p_job_id
      and normalized_hash = p_normalized_hash
      and normalization_version = p_normalization_version;
  end if;

  insert into public.transcript_acquisition_attempts (
    attempt_key,
    owner_user_id,
    job_id,
    transcript_id,
    strategy_id,
    provider,
    result_kind,
    segment_count,
    duration_ms,
    latency_ms
  ) values (
    p_attempt_key,
    p_owner_user_id,
    p_job_id,
    v_transcript_id,
    p_strategy_id,
    p_provider,
    'success',
    v_segment_count,
    p_duration_ms,
    p_latency_ms
  )
  on conflict (attempt_key) do nothing;

  update public.lesson_jobs
  set canonical_transcript_id = v_transcript_id,
      status = 'checking_language',
      current_stage = 'checking_language',
      updated_at = now()
  where id = p_job_id
    and owner_user_id = p_owner_user_id
    and status in ('acquiring_transcript', 'normalizing_transcript', 'checking_language');

  return query select v_transcript_id, v_created;
end;
$$;

revoke all on function public.record_transcript_acquisition_attempt(
  text, uuid, uuid, text, text, text, text, integer
) from public, anon, authenticated;
grant execute on function public.record_transcript_acquisition_attempt(
  text, uuid, uuid, text, text, text, text, integer
) to service_role;

revoke all on function public.persist_canonical_transcript(
  text, uuid, uuid, text, text, text, text, text, text[], text, text, text, text, bigint, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.persist_canonical_transcript(
  text, uuid, uuid, text, text, text, text, text, text[], text, text, text, text, bigint, integer, jsonb
) to service_role;
