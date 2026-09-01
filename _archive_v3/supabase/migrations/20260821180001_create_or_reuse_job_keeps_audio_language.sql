-- Carries YouTube's `defaultAudioLanguage` through to the video row.
--
-- Read at validation time and thrown away until now. The caption strategy needs
-- it to tell an original English track from an English translation: forcing
-- `lang=en` on a Spanish video would fetch a translation, and teaching from a
-- translation breaks the invariant that source quotes are exact spoken English.

create or replace function public.create_or_reuse_lesson_job(
  p_owner_user_id uuid,
  p_youtube_video_id text,
  p_title text,
  p_channel_name text,
  p_thumbnail_url text,
  p_duration_ms bigint,
  p_cefr_level text,
  p_metadata_version text,
  p_pipeline_version text,
  p_declared_audio_language text default null
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
    metadata_version,
    declared_audio_language
  ) values (
    p_youtube_video_id,
    p_title,
    p_channel_name,
    p_thumbnail_url,
    p_duration_ms,
    p_metadata_version,
    p_declared_audio_language
  )
  on conflict (youtube_video_id) do update set
    title = excluded.title,
    channel_name = excluded.channel_name,
    thumbnail_url = excluded.thumbnail_url,
    duration_ms = excluded.duration_ms,
    metadata_version = excluded.metadata_version,
    -- Never overwritten with null: a later request that carries no declared
    -- language must not erase what an earlier one learned.
    declared_audio_language = coalesce(
      excluded.declared_audio_language,
      public.videos.declared_audio_language
    ),
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
