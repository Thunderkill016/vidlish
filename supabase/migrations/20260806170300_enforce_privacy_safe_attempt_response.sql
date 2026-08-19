-- Learning Model v2 persists evaluation evidence, not unrestricted learner text.
-- Choice IDs are bounded contract values. Productive and reflective responses
-- store only submission metadata and optional criterion indexes.
--
-- The application schema is strict about the complete JSON shape. This
-- database constraint is an independent safety boundary: raw learner text is
-- always forbidden, and every response kind must contain its bounded evidence.

alter table public.activity_attempts
  add constraint activity_attempts_response_privacy_safe check (
    not (response ? 'text')
    -- coalesce, not a bare `in`. Without the key, `NULL in (...)` is NULL and
    -- the whole conjunction degrades to NULL, which CHECK accepts: a response
    -- carrying no `kind` at all would slip past this safety boundary.
    and coalesce(response ->> 'kind', '')
      in ('choice', 'text', 'self_check', 'reflection')
    and case response ->> 'kind'
      when 'choice' then
        response ?& array['kind', 'optionId']
        and jsonb_typeof(response -> 'optionId') = 'string'
      when 'text' then
        response ?& array['kind', 'submitted', 'characterCount']
        and response -> 'submitted' = 'true'::jsonb
        and jsonb_typeof(response -> 'characterCount') = 'number'
      when 'self_check' then
        response ?& array[
          'kind', 'submitted', 'characterCount', 'checkedCriteria'
        ]
        and response -> 'submitted' = 'true'::jsonb
        and jsonb_typeof(response -> 'characterCount') = 'number'
        and jsonb_typeof(response -> 'checkedCriteria') = 'array'
      when 'reflection' then
        response ?& array['kind', 'submitted', 'characterCount']
        and response -> 'submitted' = 'true'::jsonb
        and jsonb_typeof(response -> 'characterCount') = 'number'
      else false
    end
  );

comment on column public.activity_attempts.response is
  'Privacy-safe response evidence only. Raw learner text/audio/transcription is prohibited.';
