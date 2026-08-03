insert into public.beta_access (email_normalized, is_active)
values ('invited@example.com', true)
on conflict (email_normalized)
do update set is_active = excluded.is_active, updated_at = now();
