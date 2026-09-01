-- The guards on record_beginner_challenge_evidence, checkable without Docker.
--
-- These rules already had pgTAP assertions, and pgTAP only runs in CI on this
-- machine. So when a later migration rebuilt the function by retyping the parts
-- that seemed to matter, three guards disappeared — the null-argument check, the
-- rule that independent evidence must be successful, and the exact error text
-- five assertions match on — and nothing local noticed. `create or replace` will
-- accept a function that has quietly lost half its rules.
--
-- Run with: pnpm db:local scripts/checks/beginner-evidence-guards.sql
-- Every check below raises on failure, so "ran clean" means the guards hold.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000',
   'e1111111-1111-4111-8111-111111111111','authenticated','authenticated',
   'guard-owner@example.com','',now(),
   '{"provider":"email","providers":["email"]}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000',
   'e2222222-2222-4222-8222-222222222222','authenticated','authenticated',
   'guard-other@example.com','',now(),
   '{"provider":"email","providers":["email"]}','{}',now(),now());

do $$
declare
  v_id uuid;
  v_msg text;
  v_unavailable constant text := 'beginner evidence challenge is not available';
begin
  insert into public.beginner_evidence_challenges
    (owner_user_id, kind, target_word, sentence_text)
  values ('e1111111-1111-4111-8111-111111111111', 'spoken', 'water', 'i drink water')
  returning id into v_id;

  -- Independence is a strictly stronger claim than success, so a verdict that
  -- says "did not succeed, unaided" describes nothing that can happen.
  begin
    perform public.record_beginner_challenge_evidence(
      'e1111111-1111-4111-8111-111111111111', v_id, false, true);
    raise exception 'FAIL: an independent failure was accepted';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg <> 'independent beginner evidence must be successful' then
      raise exception 'FAIL: wrong message for impossible verdict: %', v_msg;
    end if;
  end;

  -- Rejecting a verdict must not burn the challenge, or a client bug would
  -- cost the learner the attempt.
  if (select consumed_at from public.beginner_evidence_challenges where id = v_id)
     is not null then
    raise exception 'FAIL: a rejected verdict consumed the challenge';
  end if;

  -- A challenge belongs to one learner.
  begin
    perform public.record_beginner_challenge_evidence(
      'e2222222-2222-4222-8222-222222222222', v_id, true, true);
    raise exception 'FAIL: another owner consumed the challenge';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg <> v_unavailable then
      raise exception 'FAIL: wrong message for a foreign owner: %', v_msg;
    end if;
  end;

  -- Null arguments are rejected before anything is read.
  begin
    perform public.record_beginner_challenge_evidence(null, v_id, true, true);
    raise exception 'FAIL: a null owner was accepted';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg <> v_unavailable then
      raise exception 'FAIL: wrong message for a null owner: %', v_msg;
    end if;
  end;

  -- One use only.
  perform public.record_beginner_challenge_evidence(
    'e1111111-1111-4111-8111-111111111111', v_id, true, true);
  begin
    perform public.record_beginner_challenge_evidence(
      'e1111111-1111-4111-8111-111111111111', v_id, true, true);
    raise exception 'FAIL: a consumed challenge was replayed';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg <> v_unavailable then
      raise exception 'FAIL: wrong message for a replay: %', v_msg;
    end if;
  end;

  -- And the skill dimension the new migration added is still written, so
  -- restoring the guards did not undo the thing that needed the rebuild.
  if (select skill from public.beginner_skill_evidence where item_key = 'water')
     is distinct from 'speaking' then
    raise exception 'FAIL: the spoken attempt did not record speaking evidence';
  end if;
end $$;
