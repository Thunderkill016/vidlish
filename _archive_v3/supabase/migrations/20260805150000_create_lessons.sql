-- Lesson Engine MVP: the published lesson artifact.
--
-- `draft` is what the model returned; `citations` is what the server hydrated
-- from the canonical transcript. The model never returns quote text, so a
-- fabricated quote is not representable — it can only cite a segment ID, and
-- the application rejects any ID outside the eligibility allowlist before this
-- row is written.
--
-- Grounding is enforced in application code (hydrate-lesson-citations.ts), not
-- by a foreign key on each citation. A composite FK to
-- language_eligible_segments would make it structural; that is a deliberate
-- follow-up, not an oversight.

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.lesson_jobs(id) on delete cascade,
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete restrict,
  cefr_level text not null,
  schema_version text not null,
  pipeline_version text not null,
  prompt_version text not null,
  model_id text not null,
  transcript_hash text not null,
  input_tokens integer not null,
  output_tokens integer not null,
  draft jsonb not null,
  citations jsonb not null,
  created_at timestamptz not null default now(),
  constraint lessons_cefr_level check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  constraint lessons_schema_version check (schema_version = 'lesson:v1'),
  constraint lessons_hash_format check (transcript_hash ~ '^[a-f0-9]{64}$'),
  constraint lessons_tokens_nonnegative check (input_tokens >= 0 and output_tokens >= 0),
  constraint lessons_draft_object check (jsonb_typeof(draft) = 'object'),
  constraint lessons_citations_present check (
    jsonb_typeof(citations) = 'array' and jsonb_array_length(citations) > 0
  ),
  -- One lesson per job per pipeline version. A retry reuses the committed
  -- lesson instead of paying for a second generation.
  unique (job_id, pipeline_version)
);

create index lessons_owner_created_at
  on public.lessons (owner_user_id, created_at desc);

alter table public.lessons enable row level security;
create policy lessons_select_own
  on public.lessons for select to authenticated
  using (auth.uid() = owner_user_id);
revoke all privileges on table public.lessons from public, anon, authenticated;
grant select on table public.lessons to authenticated;
grant select, insert, update, delete on table public.lessons to service_role;

alter table public.lesson_jobs
  add column lesson_id uuid references public.lessons(id) on delete set null;

-- Atomic publish: the lesson row and the job's completion are one commit, so a
-- job can never report `completed` without a readable lesson behind it.
create or replace function public.publish_lesson(
  p_owner_user_id uuid,
  p_job_id uuid,
  p_cefr_level text,
  p_schema_version text,
  p_pipeline_version text,
  p_prompt_version text,
  p_model_id text,
  p_transcript_hash text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_draft jsonb,
  p_citations jsonb
)
returns table (lesson_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transcript_id uuid;
  v_video_id uuid;
  v_lesson_id uuid;
  v_created boolean := false;
begin
  select lesson_jobs.canonical_transcript_id, lesson_jobs.video_id
    into v_transcript_id, v_video_id
  from public.lesson_jobs
  join public.transcripts on transcripts.id = lesson_jobs.canonical_transcript_id
  where lesson_jobs.id = p_job_id
    and lesson_jobs.owner_user_id = p_owner_user_id
    and transcripts.normalized_hash = p_transcript_hash
  for update of lesson_jobs;

  if v_transcript_id is null then
    raise exception 'canonical transcript not found for lesson publish';
  end if;

  insert into public.lessons (
    owner_user_id, job_id, transcript_id, video_id, cefr_level,
    schema_version, pipeline_version, prompt_version, model_id,
    transcript_hash, input_tokens, output_tokens, draft, citations
  ) values (
    p_owner_user_id, p_job_id, v_transcript_id, v_video_id, p_cefr_level,
    p_schema_version, p_pipeline_version, p_prompt_version, p_model_id,
    p_transcript_hash, p_input_tokens, p_output_tokens, p_draft, p_citations
  )
  on conflict (job_id, pipeline_version) do nothing
  returning id into v_lesson_id;

  if v_lesson_id is not null then
    v_created := true;
  else
    select id into v_lesson_id
    from public.lessons
    where job_id = p_job_id and pipeline_version = p_pipeline_version;
  end if;

  update public.lesson_jobs
  set lesson_id = v_lesson_id,
      status = 'completed',
      current_stage = 'completed',
      safe_error_code = null,
      updated_at = now()
  where id = p_job_id
    and owner_user_id = p_owner_user_id
    and status not in ('completed', 'failed', 'cancelled');

  return query select v_lesson_id, v_created;
end;
$$;

revoke all on function public.publish_lesson(
  uuid, uuid, text, text, text, text, text, text, integer, integer, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.publish_lesson(
  uuid, uuid, text, text, text, text, text, text, integer, integer, jsonb, jsonb
) to service_role;
