create table public.beta_access (
  email_normalized text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_access_email_is_normalized
    check (email_normalized = lower(trim(email_normalized)))
);

comment on table public.beta_access is
  'Server-managed private-beta admission list. Never exposed to learner clients.';

alter table public.beta_access enable row level security;

revoke all privileges on table public.beta_access from public, anon, authenticated;
grant select, insert, update, delete on table public.beta_access to service_role;
