-- Evidence for a learner starting from zero, where there is no video behind it.
--
-- The rules under test are the ones a beginner track cannot be built without:
-- a word only counts as known when it was produced with no support open, that
-- proof can never be erased by a later supported attempt, and a video-sourced
-- row can never lose its source.

begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'b1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'beginner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

set local "request.jwt.claim.sub" = 'b1111111-1111-4111-8111-111111111111';

-- A first meeting with support open is exposure, not knowledge.
select is(
  (public.record_beginner_word_evidence(
    'b1111111-1111-4111-8111-111111111111', 'water', false)).origin,
  'beginner_input',
  'a word learned without a video is stored with an explicit origin'
);

select is(
  (select last_independent_at from public.learning_item_states
   where item_key = 'water'),
  null::timestamptz,
  'a supported attempt is not independence'
);

select is(
  (select count(*)::int from public.learner_known_words(
    'b1111111-1111-4111-8111-111111111111')),
  0,
  'a word met with support open is not yet known'
);

select isnt(
  (public.record_beginner_word_evidence(
    'b1111111-1111-4111-8111-111111111111', 'water', true)).last_independent_at,
  null::timestamptz,
  'production with every support closed is recorded as independence'
);

select is(
  (select array_agg(word) from public.learner_known_words(
    'b1111111-1111-4111-8111-111111111111')),
  array['water'],
  'the known set is what the i+1 gate reads'
);

select is(
  (select count(*)::int from public.learner_known_words(
    'b2222222-2222-4222-8222-222222222222')),
  0,
  'a learner cannot read another learner''s known-word evidence'
);

-- The part that matters most: proof of independence only ever moves forward.
-- Without this, one bad day would delete a learner's evidence and the gate
-- would start serving input they have already outgrown.
select isnt(
  (public.record_beginner_word_evidence(
    'b1111111-1111-4111-8111-111111111111', 'water', false)).last_independent_at,
  null::timestamptz,
  'a later supported attempt does not erase earlier independence'
);

select is(
  (select attempt_count from public.learning_item_states where item_key = 'water'),
  3,
  'every attempt is counted, supported or not'
);

select throws_ok(
  $$insert into public.learning_item_states
      (owner_user_id, item_key, origin, source_lesson_version_id)
    values ('b1111111-1111-4111-8111-111111111111', 'orphan', 'video_lesson', null)$$,
  '23514',
  null::text,
  'a video-sourced row cannot exist without its source'
);

select throws_ok(
  $$select public.record_beginner_word_evidence(
      'b2222222-2222-4222-8222-222222222222', 'water', true)$$,
  'P0001',
  'beginner evidence must be recorded by its owner',
  'evidence cannot be recorded on behalf of another learner'
);

select * from finish();
rollback;
