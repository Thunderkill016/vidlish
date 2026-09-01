-- Guards on the imitation measurement table, checkable without Docker.
-- Every check raises on failure, so running clean is the assertion.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000',
  'f1111111-1111-4111-8111-111111111111','authenticated','authenticated',
  'measure@example.com','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());

do $$
declare v_ok boolean;
begin
  -- A normal sitting stores.
  insert into public.learner_imitation_measurements
    (owner_user_id, attempted, passed, held_to, broke_at, above_bank, bank_version)
  values ('f1111111-1111-4111-8111-111111111111', 20, 12, 12, 11, false, 'ei:v1');

  -- Passing more items than were attempted is not a result, it is a bug.
  begin
    insert into public.learner_imitation_measurements
      (owner_user_id, attempted, passed, held_to, broke_at, above_bank, bank_version)
    values ('f1111111-1111-4111-8111-111111111111', 5, 9, 12, 11, false, 'ei:v1');
    raise exception 'FAIL: passed above attempted was accepted';
  exception when check_violation then null;
  end;

  -- "Nothing defeated them" must agree with the counts, or the report would
  -- credit the bank's ceiling to the learner on a sitting they failed.
  begin
    insert into public.learner_imitation_measurements
      (owner_user_id, attempted, passed, held_to, broke_at, above_bank, bank_version)
    values ('f1111111-1111-4111-8111-111111111111', 20, 12, 18, 19, true, 'ei:v1');
    raise exception 'FAIL: above_bank accepted while items were failed';
  exception when check_violation then null;
  end;

  -- A sitting with no items attempted says nothing.
  begin
    insert into public.learner_imitation_measurements
      (owner_user_id, attempted, passed, held_to, broke_at, above_bank, bank_version)
    values ('f1111111-1111-4111-8111-111111111111', 0, 0, 6, 7, false, 'ei:v1');
    raise exception 'FAIL: an empty sitting was accepted';
  exception when check_violation then null;
  end;

  -- Results are compared across sittings, so the bank they were taken against
  -- has to be recorded in a shape that can be matched.
  begin
    insert into public.learner_imitation_measurements
      (owner_user_id, attempted, passed, held_to, broke_at, above_bank, bank_version)
    values ('f1111111-1111-4111-8111-111111111111', 20, 12, 12, 11, false, 'NOT A VERSION');
    raise exception 'FAIL: a malformed bank version was accepted';
  exception when check_violation then null;
  end;

  -- The learner may read their own results and must not be able to write them.
  select has_table_privilege('authenticated','public.learner_imitation_measurements','INSERT')
    into v_ok;
  if v_ok then raise exception 'FAIL: a learner can insert their own measurement'; end if;

  select relrowsecurity into v_ok from pg_class
    where oid = 'public.learner_imitation_measurements'::regclass;
  if not v_ok then raise exception 'FAIL: row level security is off'; end if;
end $$;
