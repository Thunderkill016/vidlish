-- A self-report is only evidence once it has been checked against words that do
-- not exist. The browser reports answers; application code calculates the
-- verdict; only the server service-role persistence boundary may store it.

begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

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

-- Deliberately no request.jwt.claim.sub: the runtime repository uses the
-- admin/secret client after browser EXECUTE is revoked.
select is(
  (public.record_learner_calibration(
    'c1111111-1111-4111-8111-111111111111', 7, 3, 5, 0, true)).reliable,
  true,
  'a server-calculated self-report verdict is stored'
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

select is(
  has_function_privilege(
    'authenticated',
    'public.record_learner_calibration(uuid,integer,integer,integer,integer,boolean)',
    'EXECUTE'
  ),
  false,
  'the browser cannot call the verdict persistence function directly'
);

select is(
  has_function_privilege(
    'service_role',
    'public.record_learner_calibration(uuid,integer,integer,integer,integer,boolean)',
    'EXECUTE'
  ),
  true,
  'the server service role can persist the calculated verdict'
);

select is(
  has_table_privilege('authenticated', 'public.learner_calibrations', 'insert'),
  false,
  'the browser cannot insert its own verdict directly'
);

select * from finish();
rollback;
