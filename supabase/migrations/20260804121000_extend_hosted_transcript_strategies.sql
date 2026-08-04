alter table public.transcripts
  drop constraint transcripts_strategy,
  drop constraint transcripts_source_type;

alter table public.transcripts
  add column provider_request_id text,
  add constraint transcripts_strategy check (
    strategy_id in ('supadata-native-caption', 'supadata-generated-transcript')
  ),
  add constraint transcripts_source_type check (
    source_type in ('native_caption', 'hosted_generated_transcript')
  ),
  add constraint transcripts_strategy_source_match check (
    (strategy_id = 'supadata-native-caption' and source_type = 'native_caption') or
    (strategy_id = 'supadata-generated-transcript' and source_type = 'hosted_generated_transcript')
  ),
  add constraint transcripts_generated_track_kind check (
    source_type <> 'hosted_generated_transcript' or track_kind = 'unknown'
  );

alter table public.transcript_acquisition_attempts
  drop constraint transcript_attempt_strategy,
  add column cost_band text not null default 'none',
  add column provider_request_id text,
  add constraint transcript_attempt_strategy check (
    strategy_id in ('supadata-native-caption', 'supadata-generated-transcript')
  ),
  add constraint transcript_attempt_cost_band check (
    cost_band in ('none', 'metered_low', 'metered_medium', 'metered_high')
  );

create table public.transcript_provider_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.lesson_jobs(id) on delete cascade,
  strategy_id text not null,
  provider text not null,
  provider_job_id text not null,
  provider_request_id text,
  cost_band text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transcript_provider_jobs_strategy check (
    strategy_id = 'supadata-generated-transcript'
  ),
  constraint transcript_provider_jobs_provider check (provider = 'supadata'),
  constraint transcript_provider_jobs_id_nonempty check (
    length(btrim(provider_job_id)) between 1 and 256
  ),
  constraint transcript_provider_jobs_cost_band check (
    cost_band in ('metered_low', 'metered_medium', 'metered_high')
  ),
  constraint transcript_provider_jobs_status check (
    status in ('pending', 'completed', 'failed', 'timed_out')
  ),
  unique (job_id, strategy_id, provider_job_id)
);

create index transcript_provider_jobs_job_created_at
  on public.transcript_provider_jobs (job_id, created_at desc);

alter table public.transcript_provider_jobs enable row level security;
revoke all privileges on table public.transcript_provider_jobs
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.transcript_provider_jobs to service_role;

create or replace function public.record_transcript_strategy_attempt(
  p_attempt_key text,
  p_owner_user_id uuid,
  p_job_id uuid,
  p_strategy_id text,
  p_provider text,
  p_result_kind text,
  p_reason_code text,
  p_latency_ms integer,
  p_cost_band text,
  p_provider_request_id text
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

  if p_result_kind = 'pending' then
    raise exception 'pending provider work belongs in transcript_provider_jobs';
  end if;

  insert into public.transcript_acquisition_attempts (
    attempt_key,
    owner_user_id,
    job_id,
    strategy_id,
    provider,
    result_kind,
    reason_code,
    latency_ms,
    cost_band,
    provider_request_id
  ) values (
    p_attempt_key,
    p_owner_user_id,
    p_job_id,
    p_strategy_id,
    p_provider,
    p_result_kind,
    p_reason_code,
    p_latency_ms,
    p_cost_band,
    p_provider_request_id
  )
  on conflict (attempt_key) do nothing;
end;
$$;

create or replace function public.record_transcript_provider_job(
  p_owner_user_id uuid,
  p_job_id uuid,
  p_strategy_id text,
  p_provider text,
  p_provider_job_id text,
  p_provider_request_id text,
  p_cost_band text
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

  insert into public.transcript_provider_jobs (
    owner_user_id,
    job_id,
    strategy_id,
    provider,
    provider_job_id,
    provider_request_id,
    cost_band
  ) values (
    p_owner_user_id,
    p_job_id,
    p_strategy_id,
    p_provider,
    p_provider_job_id,
    p_provider_request_id,
    p_cost_band
  )
  on conflict (job_id, strategy_id, provider_job_id) do update set
    provider_request_id = coalesce(
      excluded.provider_request_id,
      transcript_provider_jobs.provider_request_id
    ),
    updated_at = now();
end;
$$;

create or replace function public.persist_canonical_transcript_v2(
  p_attempt_key text,
  p_owner_user_id uuid,
  p_job_id uuid,
  p_youtube_video_id text,
  p_strategy_id text,
  p_provider text,
  p_source_type text,
  p_provider_request_id text,
  p_provider_job_id text,
  p_cost_band text,
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
  v_transcript_id uuid;
  v_created boolean;
begin
  select result.transcript_id, result.created
    into v_transcript_id, v_created
  from public.persist_canonical_transcript(
    p_attempt_key,
    p_owner_user_id,
    p_job_id,
    p_youtube_video_id,
    p_strategy_id,
    p_provider,
    p_source_type,
    p_declared_language,
    p_available_languages,
    p_track_kind,
    p_translation_status,
    p_normalized_hash,
    p_normalization_version,
    p_duration_ms,
    p_latency_ms,
    p_segments
  ) as result;

  update public.transcripts
  set provider_request_id = coalesce(provider_request_id, p_provider_request_id)
  where id = v_transcript_id and owner_user_id = p_owner_user_id;

  update public.transcript_acquisition_attempts
  set cost_band = p_cost_band,
      provider_request_id = coalesce(provider_request_id, p_provider_request_id)
  where attempt_key = p_attempt_key
    and owner_user_id = p_owner_user_id;

  if p_provider_job_id is not null then
    update public.transcript_provider_jobs
    set status = 'completed',
        provider_request_id = coalesce(
          p_provider_request_id,
          provider_request_id
        ),
        updated_at = now()
    where job_id = p_job_id
      and owner_user_id = p_owner_user_id
      and strategy_id = p_strategy_id
      and provider_job_id = p_provider_job_id;
  end if;

  return query select v_transcript_id, v_created;
end;
$$;

create or replace function public.finish_transcript_provider_job(
  p_owner_user_id uuid,
  p_job_id uuid,
  p_strategy_id text,
  p_provider_job_id text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('failed', 'timed_out') then
    raise exception 'invalid provider job terminal status';
  end if;

  update public.transcript_provider_jobs
  set status = p_status,
      updated_at = now()
  where owner_user_id = p_owner_user_id
    and job_id = p_job_id
    and strategy_id = p_strategy_id
    and provider_job_id = p_provider_job_id;
end;
$$;

revoke all on function public.record_transcript_strategy_attempt(
  text, uuid, uuid, text, text, text, text, integer, text, text
) from public, anon, authenticated;
grant execute on function public.record_transcript_strategy_attempt(
  text, uuid, uuid, text, text, text, text, integer, text, text
) to service_role;

revoke all on function public.record_transcript_provider_job(
  uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_transcript_provider_job(
  uuid, uuid, text, text, text, text, text
) to service_role;

revoke all on function public.persist_canonical_transcript_v2(
  text, uuid, uuid, text, text, text, text, text, text, text,
  text, text[], text, text, text, text, bigint, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.persist_canonical_transcript_v2(
  text, uuid, uuid, text, text, text, text, text, text, text,
  text, text[], text, text, text, text, bigint, integer, jsonb
) to service_role;

revoke all on function public.finish_transcript_provider_job(
  uuid, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.finish_transcript_provider_job(
  uuid, uuid, text, text, text
) to service_role;
