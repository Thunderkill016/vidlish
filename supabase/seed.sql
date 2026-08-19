-- Minimal local baseline seed. Scenario-specific fixtures must not be added here
-- because the pgTAP suites own their rows and assert exact artifact counts.

insert into public.beta_access (email_normalized, is_active)
values ('invited@example.com', true)
on conflict (email_normalized)
do update set is_active = excluded.is_active, updated_at = now();
