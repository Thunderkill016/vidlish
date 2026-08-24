-- The curriculum labels each activity listening / speaking / reading / writing.
-- Before this table existed the database could not express that difference, so
-- a typed answer to a speaking activity was written as a dictation and the
-- product could claim speaking practice that never involved speech.
--
-- These assertions are about the boundary, not the UI: the skill must come from
-- the server-owned challenge kind, a learner must not be able to write the
-- table directly, and independence must never outrank success.

begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  'e1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'skill-owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

select has_table('public', 'beginner_skill_evidence', 'skill evidence has its own table');

select is(
  has_table_privilege('authenticated', 'public.beginner_skill_evidence', 'INSERT'),
  false,
  'a learner cannot insert their own skill evidence'
);

select is(
  has_table_privilege('authenticated', 'public.beginner_skill_evidence', 'UPDATE'),
  false,
  'a learner cannot rewrite their own skill evidence'
);

select ok(
  (select relrowsecurity from pg_class
   where oid = 'public.beginner_skill_evidence'::regclass),
  'row level security is enabled'
);

-- Only the four skills exist. A fifth value would let a caller invent a
-- capability dimension nothing measures.
select throws_ok(
  $$insert into public.beginner_skill_evidence (owner_user_id, item_key, skill)
    values ('e1111111-1111-4111-8111-111111111111', 'water', 'vibes')$$,
  '23514',
  null,
  'an unrecognised skill is rejected'
);

-- Independence is a strictly stronger claim than success.
select throws_ok(
  $$insert into public.beginner_skill_evidence
      (owner_user_id, item_key, skill, last_independent_at)
    values ('e1111111-1111-4111-8111-111111111111', 'water', 'speaking', now())$$,
  '23514',
  null,
  'independence cannot be recorded without success'
);

-- The three new challenge kinds must be storable, and the sentence rule must
-- still hold for them: only the standalone word arrives without held text.
select lives_ok(
  $$insert into public.beginner_evidence_challenges
      (owner_user_id, kind, target_word, sentence_text)
    values ('e1111111-1111-4111-8111-111111111111', 'spoken', 'water', 'i drink water')$$,
  'a spoken challenge can be issued'
);

select throws_ok(
  $$insert into public.beginner_evidence_challenges
      (owner_user_id, kind, target_word, sentence_text)
    values ('e1111111-1111-4111-8111-111111111111', 'spoken', 'water', null)$$,
  '23514',
  null,
  'a spoken challenge without held text is rejected'
);

select throws_ok(
  $$insert into public.beginner_evidence_challenges
      (owner_user_id, kind, target_word, sentence_text)
    values ('e1111111-1111-4111-8111-111111111111', 'karaoke', 'water', 'i drink water')$$,
  '23514',
  null,
  'an unrecognised challenge kind is rejected'
);

-- The mapping from challenge kind to skill is the whole point: the browser
-- sends no skill, so a spoken challenge must produce speaking evidence and
-- nothing else.
with issued as (
  insert into public.beginner_evidence_challenges
    (owner_user_id, kind, target_word, sentence_text)
  values ('e1111111-1111-4111-8111-111111111111', 'spoken', 'please', 'say it please')
  returning id
)
select public.record_beginner_challenge_evidence(
  'e1111111-1111-4111-8111-111111111111',
  (select id from issued),
  true,
  true
);

select is(
  (select skill from public.beginner_skill_evidence
   where owner_user_id = 'e1111111-1111-4111-8111-111111111111'
     and item_key = 'please'),
  'speaking',
  'a spoken challenge records speaking evidence'
);

select isnt(
  (select last_independent_at from public.beginner_skill_evidence
   where owner_user_id = 'e1111111-1111-4111-8111-111111111111'
     and item_key = 'please' and skill = 'speaking'),
  null,
  'an unaided successful spoken attempt is independent speaking evidence'
);

-- Speaking evidence must not leak into the productive-known dimension that
-- widens the comprehensibility gate; that is the failure the dictation
-- migration was written to stop, and it must not return through a new kind.
select is(
  (select last_independent_at from public.learning_item_states
   where owner_user_id = 'e1111111-1111-4111-8111-111111111111'
     and item_key = 'please'),
  null,
  'a spoken attempt does not set productive-known evidence'
);

select is(
  (select successful_dictations from public.learning_item_states
   where owner_user_id = 'e1111111-1111-4111-8111-111111111111'
     and item_key = 'please'),
  0,
  'a spoken attempt is not counted as a dictation'
);

-- A failed attempt still leaves a trace. "Tried speaking and missed" is
-- evidence; recording nothing would let a learner look untested rather than
-- unsuccessful.
with issued as (
  insert into public.beginner_evidence_challenges
    (owner_user_id, kind, target_word, sentence_text)
  values ('e1111111-1111-4111-8111-111111111111', 'reading', 'again', 'again please')
  returning id
)
select public.record_beginner_challenge_evidence(
  'e1111111-1111-4111-8111-111111111111',
  (select id from issued),
  false,
  false
);

select is(
  (select successful_count from public.beginner_skill_evidence
   where owner_user_id = 'e1111111-1111-4111-8111-111111111111'
     and item_key = 'again' and skill = 'reading'),
  0,
  'a failed reading attempt is recorded without counting as a success'
);

select * from finish();
rollback;
