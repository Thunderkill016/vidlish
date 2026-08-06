-- Learning Model v2 persists evaluation evidence, not unrestricted learner text.
-- Choice IDs are bounded contract values. Productive and reflective responses
-- store only submission metadata and optional criterion indexes.

alter table public.activity_attempts
  add constraint activity_attempts_response_privacy_safe check (
    not (response ? 'text')
    and response ->> 'kind' in ('choice', 'text', 'self_check', 'reflection')
    and case response ->> 'kind'
      when 'choice' then
        jsonb_typeof(response -> 'optionId') = 'string'
        and jsonb_object_length(response) = 2
      when 'text' then
        response -> 'submitted' = 'true'::jsonb
        and jsonb_typeof(response -> 'characterCount') = 'number'
        and jsonb_object_length(response) = 3
      when 'self_check' then
        response -> 'submitted' = 'true'::jsonb
        and jsonb_typeof(response -> 'characterCount') = 'number'
        and jsonb_typeof(response -> 'checkedCriteria') = 'array'
        and jsonb_object_length(response) = 4
      when 'reflection' then
        response -> 'submitted' = 'true'::jsonb
        and jsonb_typeof(response -> 'characterCount') = 'number'
        and jsonb_object_length(response) = 3
      else false
    end
  );

comment on column public.activity_attempts.response is
  'Privacy-safe response evidence only. Raw learner text/audio/transcription is prohibited.';
