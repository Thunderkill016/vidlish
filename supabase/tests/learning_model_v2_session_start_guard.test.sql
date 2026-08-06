begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

select throws_ok(
  $$select * from public.start_lesson_v2_session(
    '133f314f-4bfd-46aa-8fc6-b6a33252232b',
    '77777777-7777-4777-8777-777777777777',
    'transfer',
    'activity_transfer'
  )$$,
  'initial session state must match the first immutable activity',
  'database rejects starting a session after the first immutable activity'
);

select * from finish();
rollback;
