begin;

create extension if not exists pgtap with schema extensions;

select plan(8);
select has_table('public', 'beta_access', 'beta_access exists');
select col_is_pk('public', 'beta_access', 'email_normalized', 'normalized email is the primary key');
select columns_are(
  'public',
  'beta_access',
  array['email_normalized', 'is_active', 'created_at', 'updated_at'],
  'beta_access has only the intended columns'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.beta_access'::regclass),
  true,
  'RLS is enabled'
);
select is(has_table_privilege('anon', 'public.beta_access', 'select'), false, 'anon cannot select');
select is(has_table_privilege('authenticated', 'public.beta_access', 'select'), false, 'authenticated cannot select');
select is(has_table_privilege('authenticated', 'public.beta_access', 'insert'), false, 'authenticated cannot insert');
select throws_like(
  $$insert into public.beta_access (email_normalized) values ('UPPER@EXAMPLE.COM')$$,
  '%beta_access_email_is_normalized%',
  'non-normalized email is rejected'
);

select * from finish();
rollback;
