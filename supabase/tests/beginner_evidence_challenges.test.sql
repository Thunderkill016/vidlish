-- Beginner evidence must be created only from a server-issued challenge, and
-- the challenge kind must decide which capability dimension receives it.
-- This file deliberately tests function privileges as well as row behaviour:
-- denying direct INSERT while leaving a SECURITY DEFINER mutation executable is
-- not an evidence boundary.

begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  'd1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'challenge-owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'd2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'challenge-other@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

select is(
  has_function_privilege(
    'authenticated',
    'public.record_beginner_word_evidence(uuid,text,boolean)',
    'EXECUTE'
  ),
  false,
  'authenticated cannot call the legacy arbitrary-word evidence mutation'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.record_learner_calibration(uuid,integer,integer,integer,integer,boolean)',
    'EXECUTE'
  ),
  false,
  'authenticated cannot write its own calibration verdict through SECURITY DEFINER'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.learner_known_words(uuid)',
    'EXECUTE'
  ),
  false,
  'authenticated cannot use the arbitrary-owner known-word SECURITY DEFINER read'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.record_beginner_challenge_evidence(uuid,uuid,boolean,boolean)',
    'EXECUTE'
  ),
  false,
  'authenticated cannot bypass the application by calling the challenge mutation directly'
);

select is(
  to_regprocedure('public.record_beginner_challenge_evidence(uuid,uuid,boolean)'),
  null::regprocedure,
  'the old modality-collapsing three-argument challenge function no longer exists'
);

select is(
  has_table_privilege(
    'authenticated',
    'public.beginner_evidence_challenges',
    'SELECT'
  ),
  false,
  'authenticated cannot read server challenge rows directly'
);

select is(
  has_function_privilege(
    'service_role',
    'public.record_beginner_challenge_evidence(uuid,uuid,boolean,boolean)',
    'EXECUTE'
  ),
  true,
  'the server service-role boundary can commit challenge evidence'
);

select is(
  (public.record_learner_calibration(
    'd1111111-1111-4111-8111-111111111111', 1, 3, 1, 0, true)).reliable,
  true,
  'server-side calibration persistence does not require auth.uid()'
);

-- A supported successful dictation is real dictation evidence but not
-- productive-known evidence.
insert into public.beginner_evidence_challenges (
  id, owner_user_id, kind, target_word, sentence_text
) values (
  'd3000000-0000-4000-8000-000000000001',
  'd1111111-1111-4111-8111-111111111111',
  'dictation',
  'water',
  'I want water.'
);

select is(
  (public.record_beginner_challenge_evidence(
    'd1111111-1111-4111-8111-111111111111',
    'd3000000-0000-4000-8000-000000000001',
    true,
    false
  )).item_key,
  'water',
  'the database derives the evidence target from the challenge, not a caller word'
);

select isnt(
  (select consumed_at
   from public.beginner_evidence_challenges
   where id = 'd3000000-0000-4000-8000-000000000001'),
  null::timestamptz,
  'recording evidence consumes the challenge in the same transaction'
);

select throws_ok(
  $$select public.record_beginner_challenge_evidence(
      'd1111111-1111-4111-8111-111111111111',
      'd3000000-0000-4000-8000-000000000001',
      true,
      true
    )$$,
  'P0001',
  'beginner evidence challenge is not available',
  'a consumed challenge cannot be replayed'
);

insert into public.beginner_evidence_challenges (
  id, owner_user_id, kind, target_word, sentence_text
) values (
  'd3000000-0000-4000-8000-000000000002',
  'd1111111-1111-4111-8111-111111111111',
  'dictation',
  'house',
  'This is my house.'
);

select throws_ok(
  $$select public.record_beginner_challenge_evidence(
      'd2222222-2222-4222-8222-222222222222',
      'd3000000-0000-4000-8000-000000000002',
      true,
      true
    )$$,
  'P0001',
  'beginner evidence challenge is not available',
  'a challenge cannot be consumed for a different owner'
);

insert into public.beginner_evidence_challenges (
  id, owner_user_id, kind, target_word, sentence_text, created_at, expires_at
) values (
  'd3000000-0000-4000-8000-000000000003',
  'd1111111-1111-4111-8111-111111111111',
  'dictation',
  'cat',
  'I see a cat.',
  now() - interval '3 hours',
  now() - interval '1 hour'
);

select throws_ok(
  $$select public.record_beginner_challenge_evidence(
      'd1111111-1111-4111-8111-111111111111',
      'd3000000-0000-4000-8000-000000000003',
      true,
      true
    )$$,
  'P0001',
  'beginner evidence challenge is not available',
  'an expired challenge cannot create evidence'
);

-- A second, independent successful dictation must stay on the dictation
-- dimension and leave the productive-known dimension untouched.
insert into public.beginner_evidence_challenges (
  id, owner_user_id, kind, target_word, sentence_text
) values (
  'd3000000-0000-4000-8000-000000000004',
  'd1111111-1111-4111-8111-111111111111',
  'dictation',
  'water',
  'Water is here.'
);

select isnt(
  (public.record_beginner_challenge_evidence(
    'd1111111-1111-4111-8111-111111111111',
    'd3000000-0000-4000-8000-000000000004',
    true,
    true
  )).last_independent_dictation_at,
  null::timestamptz,
  'independent successful dictation gets its own independent timestamp'
);

select is(
  (select last_independent_at
   from public.learning_item_states
   where owner_user_id = 'd1111111-1111-4111-8111-111111111111'
     and item_key = 'water'),
  null::timestamptz,
  'dictation does not set the productive independent timestamp'
);

select is(
  (select successful_retrievals
   from public.learning_item_states
   where owner_user_id = 'd1111111-1111-4111-8111-111111111111'
     and item_key = 'water'),
  0,
  'dictation does not increment productive retrievals'
);

select is(
  (select successful_dictations
   from public.learning_item_states
   where owner_user_id = 'd1111111-1111-4111-8111-111111111111'
     and item_key = 'water'),
  2,
  'supported and independent successful dictations both remain durable dictation evidence'
);

select is(
  (select count(*)::integer
   from public.learner_known_words('d1111111-1111-4111-8111-111111111111')),
  0,
  'dictation evidence alone cannot promote a word into the productive known set'
);

-- The same word can later acquire true productive evidence without losing its
-- dictation history.
insert into public.beginner_evidence_challenges (
  id, owner_user_id, kind, target_word, sentence_text
) values (
  'd3000000-0000-4000-8000-000000000005',
  'd1111111-1111-4111-8111-111111111111',
  'introduce_word',
  'water',
  null
);

select isnt(
  (public.record_beginner_challenge_evidence(
    'd1111111-1111-4111-8111-111111111111',
    'd3000000-0000-4000-8000-000000000005',
    true,
    true
  )).last_independent_at,
  null::timestamptz,
  'independent introduction can still establish productive evidence'
);

select is(
  (select successful_retrievals
   from public.learning_item_states
   where owner_user_id = 'd1111111-1111-4111-8111-111111111111'
     and item_key = 'water'),
  1,
  'independent introduction increments productive retrievals once'
);

select is(
  (select successful_dictations
   from public.learning_item_states
   where owner_user_id = 'd1111111-1111-4111-8111-111111111111'
     and item_key = 'water'),
  2,
  'productive evidence does not erase prior dictation evidence'
);

select is(
  (select word
   from public.learner_known_words('d1111111-1111-4111-8111-111111111111')),
  'water',
  'only the later productive evidence promotes the word into knownWords'
);

-- Independence is a stronger result than success. Reject impossible state before
-- consuming the challenge so a caller may still submit a valid verdict.
insert into public.beginner_evidence_challenges (
  id, owner_user_id, kind, target_word, sentence_text
) values (
  'd3000000-0000-4000-8000-000000000006',
  'd1111111-1111-4111-8111-111111111111',
  'dictation',
  'house',
  'This is my house.'
);

select throws_ok(
  $$select public.record_beginner_challenge_evidence(
      'd1111111-1111-4111-8111-111111111111',
      'd3000000-0000-4000-8000-000000000006',
      false,
      true
    )$$,
  'P0001',
  'independent beginner evidence must be successful',
  'independent failure is rejected as an impossible evidence state'
);

select is(
  (select consumed_at
   from public.beginner_evidence_challenges
   where id = 'd3000000-0000-4000-8000-000000000006'),
  null::timestamptz,
  'rejecting an impossible verdict does not consume the server challenge'
);

select * from finish();
rollback;
