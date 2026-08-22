-- A self-report is only evidence once it has been checked against words that do
-- not exist. These are the rules that make the check impossible to fake.

begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'c1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'calibration@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

set local "request.jwt.claim.sub" = 'c1111111-1111-4111-8111-111111111111';

select is(
  (public.record_learner_calibration(
    'c1111111-1111-4111-8111-111111111111', 7, 3, 5, 0, true)).reliable,
  true,
  'a checked self-report is stored with its verdict'
);

select is(
  (select count(*)::int from public.learner_calibrations),
  1,
  'the check is kept as history, not as a single overwritten flag'
);

select throws_ok(
  $$select public.record_learner_calibration(
      'c1111111-1111-4111-8111-111111111111', 7, 3, 5, 4, false)$$,
  '23514',
  null::text,
  'there cannot be more false alarms than there were nonwords'
);

select throws_ok(
  $$select public.record_learner_calibration(
      'c2222222-2222-4222-8222-222222222222', 7, 3, 5, 0, true)$$,
  'P0001',
  'calibration must be recorded by its owner',
  'a verdict cannot be recorded on behalf of another learner'
);

-- The browser reports answers; the server decides what they mean. A learner who
-- could insert directly could write themselves a reliable verdict.
select is(
  has_table_privilege('authenticated', 'public.learner_calibrations', 'insert'),
  false,
  'the browser cannot write its own verdict'
);

select * from finish();
rollback;
