begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  exists(
    select 1
    from auth.users
    where id = '133f314f-4bfd-46aa-8fc6-b6a33252232b'
      and email = 'learning-preview@example.com'
  ),
  'preview fixture user exists with the deterministic fake-auth UUID'
);

select ok(
  exists(
    select 1
    from public.lesson_versions lv
    join public.lessons l
      on l.id = lv.lesson_id
     and l.owner_user_id = lv.owner_user_id
    where lv.id = '77777777-7777-4777-8777-777777777777'
      and lv.owner_user_id = '133f314f-4bfd-46aa-8fc6-b6a33252232b'
  ),
  'preview lesson version is bound to an owned parent lesson'
);

select is(
  (
    select schema_version
    from public.lesson_versions
    where id = '77777777-7777-4777-8777-777777777777'
  ),
  'lesson:v2',
  'preview fixture uses the v2 lesson schema'
);

select ok(
  not exists(
    select 1
    from public.activity_attempts
    where response ? 'text'
  ),
  'preview seed does not introduce unrestricted learner response text'
);

select * from finish();
rollback;
