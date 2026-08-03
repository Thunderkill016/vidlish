begin;

create extension if not exists pgtap with schema extensions;

select plan(10);
select has_table('public', 'videos', 'videos exists');
select has_table('public', 'lesson_jobs', 'lesson_jobs exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.videos'::regclass),
  true,
  'videos RLS is enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.lesson_jobs'::regclass),
  true,
  'lesson_jobs RLS is enabled'
);
select is(
  has_table_privilege('authenticated', 'public.lesson_jobs', 'select'),
  true,
  'authenticated users may select through owner RLS'
);
select is(
  has_table_privilege('authenticated', 'public.lesson_jobs', 'insert'),
  false,
  'authenticated users cannot insert jobs directly'
);
select is(
  has_table_privilege('authenticated', 'public.lesson_jobs', 'update'),
  false,
  'authenticated users cannot advance workflow state'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'lesson_jobs'
      and indexname = 'lesson_jobs_one_active_generation'
  ),
  'active generation idempotency index exists'
);
select ok(
  (
    select array_position(array_agg(enumlabel order by enumsortorder), 'checking_language')
      > array_position(array_agg(enumlabel order by enumsortorder), 'normalizing_transcript')
    from pg_enum
    join pg_type on pg_type.oid = pg_enum.enumtypid
    where pg_type.typname = 'lesson_job_status'
  ),
  'checking_language follows normalization'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.create_or_reuse_lesson_job(uuid,text,text,text,text,bigint,text,text,text)',
    'execute'
  ),
  false,
  'browser roles cannot execute the service-only create function'
);

select * from finish();
rollback;
