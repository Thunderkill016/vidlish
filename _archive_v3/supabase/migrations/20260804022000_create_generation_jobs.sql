create type public.lesson_job_status as enum (
  'queued',
  'validating_video',
  'acquiring_transcript',
  'awaiting_user_input',
  'normalizing_transcript',
  'checking_language',
  'analyzing_video',
  'mining_language',
  'planning_lesson',
  'composing_activities',
  'validating_lesson',
  'repairing_lesson',
  'publishing',
  'completed',
  'failed',
  'cancelled'
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null unique,
  title text not null,
  channel_name text not null,
  thumbnail_url text,
  duration_ms bigint,
  metadata_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint videos_youtube_id_format
    check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint videos_duration_nonnegative
    check (duration_ms is null or duration_ms >= 0)
);

comment on table public.videos is
  'Server-managed canonical YouTube metadata reused by owner-scoped generation jobs.';

alter table public.videos enable row level security;
revoke all privileges on table public.videos from public, anon, authenticated;
grant select, insert, update, delete on table public.videos to service_role;

create table public.lesson_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete restrict,
  cefr_level text not null,
  metadata_version text not null,
  pipeline_version text not null,
  status public.lesson_job_status not null default 'queued',
  current_stage text not null default 'queued',
  dispatch_status text not null default 'pending',
  dispatched_at timestamptz,
  safe_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_jobs_cefr_level
    check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  constraint lesson_jobs_dispatch_status
    check (dispatch_status in ('pending', 'sent', 'failed'))
);

create unique index lesson_jobs_one_active_generation
  on public.lesson_jobs (owner_user_id, video_id, cefr_level, pipeline_version)
  where status not in ('completed', 'failed', 'cancelled');

create index lesson_jobs_owner_created_at
  on public.lesson_jobs (owner_user_id, created_at desc);

comment on table public.lesson_jobs is
  'Owner-scoped durable generation state. Workflow code exclusively advances internal stages.';

alter table public.lesson_jobs enable row level security;

create policy lesson_jobs_select_own
  on public.lesson_jobs
  for select
  to authenticated
  using (auth.uid() = owner_user_id);

revoke all privileges on table public.lesson_jobs from public, anon, authenticated;
grant select on table public.lesson_jobs to authenticated;
grant select, insert, update, delete on table public.lesson_jobs to service_role;

create or replace function public.create_or_reuse_lesson_job(
  p_owner_user_id uuid,
  p_youtube_video_id text,
  p_title text,
  p_channel_name text,
  p_thumbnail_url text,
  p_duration_ms bigint,
  p_cefr_level text,
  p_metadata_version text,
  p_pipeline_version text
)
returns table (job_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_video_id uuid;
  v_job_id uuid;
begin
  insert into public.videos (
    youtube_video_id,
    title,
    channel_name,
    thumbnail_url,
    duration_ms,
    metadata_version
  ) values (
    p_youtube_video_id,
    p_title,
    p_channel_name,
    p_thumbnail_url,
    p_duration_ms,
    p_metadata_version
  )
  on conflict (youtube_video_id) do update set
    title = excluded.title,
    channel_name = excluded.channel_name,
    thumbnail_url = excluded.thumbnail_url,
    duration_ms = excluded.duration_ms,
    metadata_version = excluded.metadata_version,
    updated_at = now()
  returning id into v_video_id;

  insert into public.lesson_jobs (
    owner_user_id,
    video_id,
    cefr_level,
    metadata_version,
    pipeline_version
  ) values (
    p_owner_user_id,
    v_video_id,
    p_cefr_level,
    p_metadata_version,
    p_pipeline_version
  )
  on conflict (owner_user_id, video_id, cefr_level, pipeline_version)
    where status not in ('completed', 'failed', 'cancelled')
  do nothing
  returning id into v_job_id;

  if v_job_id is not null then
    return query select v_job_id, true;
    return;
  end if;

  select id into v_job_id
    from public.lesson_jobs
    where owner_user_id = p_owner_user_id
      and video_id = v_video_id
      and cefr_level = p_cefr_level
      and pipeline_version = p_pipeline_version
      and status not in ('completed', 'failed', 'cancelled')
    order by created_at asc
    limit 1;

  if v_job_id is null then
    raise exception 'active generation job missing after conflict';
  end if;

  return query select v_job_id, false;
end;
$$;

revoke all on function public.create_or_reuse_lesson_job(
  uuid, text, text, text, text, bigint, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_or_reuse_lesson_job(
  uuid, text, text, text, text, bigint, text, text, text
) to service_role;
