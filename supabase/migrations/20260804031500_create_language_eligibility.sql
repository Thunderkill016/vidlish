create table public.language_eligibility_reports (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.lesson_jobs(id) on delete cascade,
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  transcript_hash text not null,
  detector_id text not null,
  detector_version text not null,
  policy_version text not null,
  status text not null,
  reason_code text not null,
  english_share double precision not null,
  reliable_coverage double precision not null,
  coherent_english_duration_ms bigint not null,
  reliable_english_word_count integer not null,
  reliable_analyzed_word_count integer not null,
  confidence_band text not null,
  detected_languages text[] not null default '{}',
  english_segment_ids text[] not null default '{}',
  permitted_segment_ids text[] not null default '{}',
  excluded_segment_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint language_reports_detector check (detector_id = 'franc-min'),
  constraint language_reports_detector_version check (detector_version = 'franc-min:6.2.0'),
  constraint language_reports_policy_version check (policy_version = 'original-english:v1'),
  constraint language_reports_status check (status in ('eligible', 'ineligible', 'insufficient_evidence')),
  constraint language_reports_reason check (reason_code in (
    'SUFFICIENT_ORIGINAL_ENGLISH',
    'SUFFICIENT_MIXED_LANGUAGE_ENGLISH_PORTION',
    'INSUFFICIENT_ORIGINAL_ENGLISH',
    'TRANSCRIPT_EVIDENCE_TOO_WEAK'
  )),
  constraint language_reports_english_share check (english_share between 0 and 1),
  constraint language_reports_reliable_coverage check (reliable_coverage between 0 and 1),
  constraint language_reports_duration check (coherent_english_duration_ms >= 0),
  constraint language_reports_english_words check (reliable_english_word_count >= 0),
  constraint language_reports_analyzed_words check (reliable_analyzed_word_count >= 0),
  constraint language_reports_confidence check (confidence_band in ('low', 'medium', 'high')),
  unique (job_id, transcript_id, detector_version, policy_version)
);

create index language_reports_owner_created_at
  on public.language_eligibility_reports (owner_user_id, created_at desc);

alter table public.language_eligibility_reports enable row level security;
create policy language_reports_select_own
  on public.language_eligibility_reports for select to authenticated
  using (auth.uid() = owner_user_id);
revoke all privileges on table public.language_eligibility_reports from public, anon, authenticated;
grant select on table public.language_eligibility_reports to authenticated;
grant select, insert, update, delete on table public.language_eligibility_reports to service_role;

create table public.language_eligible_segments (
  report_id uuid not null references public.language_eligibility_reports(id) on delete cascade,
  transcript_id uuid not null,
  segment_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, segment_id),
  foreign key (transcript_id, segment_id)
    references public.transcript_segments(transcript_id, id)
    on delete cascade
);

create index language_eligible_segments_transcript
  on public.language_eligible_segments (transcript_id, segment_id);

alter table public.language_eligible_segments enable row level security;
create policy language_eligible_segments_select_own
  on public.language_eligible_segments for select to authenticated
  using (auth.uid() = owner_user_id);
revoke all privileges on table public.language_eligible_segments from public, anon, authenticated;
grant select on table public.language_eligible_segments to authenticated;
grant select, insert, update, delete on table public.language_eligible_segments to service_role;

alter table public.lesson_jobs
  add column language_eligibility_report_id uuid
    references public.language_eligibility_reports(id) on delete set null;

create or replace function public.persist_language_eligibility(
  p_owner_user_id uuid,
  p_job_id uuid,
  p_transcript_hash text,
  p_detector_id text,
  p_detector_version text,
  p_policy_version text,
  p_status text,
  p_reason_code text,
  p_english_share double precision,
  p_reliable_coverage double precision,
  p_coherent_english_duration_ms bigint,
  p_reliable_english_word_count integer,
  p_reliable_analyzed_word_count integer,
  p_confidence_band text,
  p_detected_languages text[],
  p_english_segment_ids text[],
  p_permitted_segment_ids text[],
  p_excluded_segment_ids text[]
)
returns table (report_id uuid, created boolean, report_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transcript_id uuid;
  v_report_id uuid;
  v_created boolean := false;
  v_effective_status text;
  v_effective_permitted_segment_ids text[];
begin
  select lesson_jobs.canonical_transcript_id into v_transcript_id
  from public.lesson_jobs
  join public.transcripts
    on transcripts.id = lesson_jobs.canonical_transcript_id
  where lesson_jobs.id = p_job_id
    and lesson_jobs.owner_user_id = p_owner_user_id
    and lesson_jobs.status in ('checking_language', 'analyzing_video', 'failed', 'acquiring_transcript')
    and transcripts.normalized_hash = p_transcript_hash
  for update of lesson_jobs;

  if v_transcript_id is null then
    raise exception 'canonical transcript not found at language gate';
  end if;

  if p_status = 'eligible' and coalesce(array_length(p_permitted_segment_ids, 1), 0) = 0 then
    raise exception 'eligible report requires permitted segments';
  end if;
  if p_status <> 'eligible' and coalesce(array_length(p_permitted_segment_ids, 1), 0) > 0 then
    raise exception 'non-eligible report cannot permit downstream evidence';
  end if;

  insert into public.language_eligibility_reports (
    owner_user_id,
    job_id,
    transcript_id,
    transcript_hash,
    detector_id,
    detector_version,
    policy_version,
    status,
    reason_code,
    english_share,
    reliable_coverage,
    coherent_english_duration_ms,
    reliable_english_word_count,
    reliable_analyzed_word_count,
    confidence_band,
    detected_languages,
    english_segment_ids,
    permitted_segment_ids,
    excluded_segment_ids
  ) values (
    p_owner_user_id,
    p_job_id,
    v_transcript_id,
    p_transcript_hash,
    p_detector_id,
    p_detector_version,
    p_policy_version,
    p_status,
    p_reason_code,
    p_english_share,
    p_reliable_coverage,
    p_coherent_english_duration_ms,
    p_reliable_english_word_count,
    p_reliable_analyzed_word_count,
    p_confidence_band,
    coalesce(p_detected_languages, '{}'),
    coalesce(p_english_segment_ids, '{}'),
    coalesce(p_permitted_segment_ids, '{}'),
    coalesce(p_excluded_segment_ids, '{}')
  )
  on conflict (job_id, transcript_id, detector_version, policy_version) do nothing
  returning id, status, permitted_segment_ids
    into v_report_id, v_effective_status, v_effective_permitted_segment_ids;

  if v_report_id is not null then
    v_created := true;
  else
    select id, status, permitted_segment_ids
      into v_report_id, v_effective_status, v_effective_permitted_segment_ids
    from public.language_eligibility_reports
    where job_id = p_job_id
      and transcript_id = v_transcript_id
      and detector_version = p_detector_version
      and policy_version = p_policy_version;
  end if;

  if v_effective_status = 'eligible' then
    insert into public.language_eligible_segments (
      report_id,
      transcript_id,
      segment_id,
      owner_user_id
    )
    select
      v_report_id,
      v_transcript_id,
      segment_id,
      p_owner_user_id
    from unnest(v_effective_permitted_segment_ids) as segment_id
    on conflict do nothing;

    update public.lesson_jobs
    set language_eligibility_report_id = v_report_id,
        status = 'analyzing_video',
        current_stage = 'analyzing_video',
        safe_error_code = null,
        updated_at = now()
    where id = p_job_id and owner_user_id = p_owner_user_id;
  elsif v_effective_status = 'ineligible' then
    update public.lesson_jobs
    set language_eligibility_report_id = v_report_id,
        status = 'failed',
        current_stage = 'checking_language',
        safe_error_code = 'VIDEO_LANGUAGE_UNSUPPORTED',
        updated_at = now()
    where id = p_job_id and owner_user_id = p_owner_user_id;
  else
    update public.lesson_jobs
    set language_eligibility_report_id = v_report_id,
        status = 'acquiring_transcript',
        current_stage = 'acquiring_transcript',
        safe_error_code = null,
        updated_at = now()
    where id = p_job_id and owner_user_id = p_owner_user_id;
  end if;

  return query select v_report_id, v_created, v_effective_status;
end;
$$;

revoke all on function public.persist_language_eligibility(
  uuid, uuid, text, text, text, text, text, text,
  double precision, double precision, bigint, integer, integer,
  text, text[], text[], text[], text[]
) from public, anon, authenticated;
grant execute on function public.persist_language_eligibility(
  uuid, uuid, text, text, text, text, text, text,
  double precision, double precision, bigint, integer, integer,
  text, text[], text[], text[], text[]
) to service_role;
