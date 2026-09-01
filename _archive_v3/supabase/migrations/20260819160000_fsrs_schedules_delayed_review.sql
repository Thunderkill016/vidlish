-- Lịch ôn tập chuyển từ hai hằng số trong SQL sang FSRS ở tầng ứng dụng.
--
-- `record_learning_review_attempt` đang đặt next_review_at = now() + 3 ngày khi
-- nhớ đúng ngay và + 1 ngày khi phải thử lại. Hai con số đó giống nhau cho mọi
-- mục, mọi người học, và không thay đổi dù mục đã được nhớ đúng mười lần liên
-- tiếp hay vừa mới quên. `design.md` §6 ghi rõ lịch thủ công này phải thay được.
--
-- Postgres không chạy được FSRS, nên hàm nhận ngày tới hạn đã tính sẵn.
--
-- Drop rồi tạo lại chứ không create-or-replace: thêm tham số có default sẽ tạo
-- một overload mới bên cạnh bản cũ, và PostgREST có thể gọi nhầm bản nào.

drop function public.record_learning_review_attempt(
  uuid, uuid, text, uuid, jsonb, jsonb, boolean, boolean, text
);

create or replace function public.record_learning_review_attempt(
  p_owner_user_id uuid,
  p_review_session_id uuid,
  p_step text,
  p_idempotency_key uuid,
  p_response jsonb,
  p_evaluation jsonb,
  p_advance boolean default false,
  p_complete boolean default false,
  p_outcome text default null,
  p_next_review_at timestamptz default null,
  p_review_state jsonb default null
)
returns table (
  review_attempt_id uuid,
  attempt_number integer,
  session_status text,
  current_step text,
  completed_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.learning_review_sessions%rowtype;
  v_existing public.learning_review_attempts%rowtype;
  v_attempt public.learning_review_attempts%rowtype;
  v_attempt_number integer;
  v_confirmed boolean;
  v_has_successful_recall boolean;
begin
  if p_step not in ('recall', 'transfer') then
    raise exception 'invalid learning review step';
  end if;
  if jsonb_typeof(p_response) <> 'object' or jsonb_typeof(p_evaluation) <> 'object' then
    raise exception 'review response and evaluation must be objects';
  end if;
  if coalesce(p_evaluation ->> 'step', '') <> p_step then
    raise exception 'review evaluation does not match the current step';
  end if;

  select * into v_session
  from public.learning_review_sessions
  where id = p_review_session_id
    and owner_user_id = p_owner_user_id
  for update;

  if v_session.id is null then
    raise exception 'owned learning review session not found';
  end if;

  -- Resolve the owned idempotency key before mutable progression checks. A
  -- network retry may arrive after the original attempt advanced/completed.
  select * into v_existing
  from public.learning_review_attempts
  where owner_user_id = p_owner_user_id
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.review_session_id <> p_review_session_id
      or v_existing.step <> p_step then
      raise exception 'idempotency key belongs to another review attempt';
    end if;
    return query select
      v_existing.id,
      v_existing.attempt_number,
      v_session.status,
      v_session.current_step,
      v_session.completed_at,
      false;
    return;
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'learning review session is not active';
  end if;
  if v_session.current_step <> p_step then
    raise exception 'review step is not current for this session';
  end if;

  if p_step = 'recall' then
    if coalesce(p_evaluation ->> 'verdict', '') not in ('correct', 'incorrect') then
      raise exception 'invalid delayed recall verdict';
    end if;
    if p_complete or p_outcome is not null then
      raise exception 'delayed recall cannot complete the review session';
    end if;
    if p_advance <> ((p_evaluation ->> 'verdict') = 'correct') then
      raise exception 'delayed recall advance must match correctness';
    end if;
  else
    if coalesce(p_evaluation ->> 'verdict', '') <> 'self_check' then
      raise exception 'invalid delayed transfer verdict';
    end if;
    if coalesce(p_evaluation ->> 'confirmed', '') not in ('true', 'false') then
      raise exception 'delayed transfer confirmation must be boolean';
    end if;
    v_confirmed := (p_evaluation ->> 'confirmed')::boolean;
    if p_advance then
      raise exception 'delayed transfer does not use recall advance';
    end if;
    if p_complete <> v_confirmed then
      raise exception 'delayed transfer completion must match confirmation';
    end if;
    if p_complete and coalesce(p_outcome, '') not in ('hard', 'good') then
      raise exception 'completed delayed transfer requires hard or good outcome';
    end if;
    if not p_complete and p_outcome is not null then
      raise exception 'incomplete delayed transfer cannot set an outcome';
    end if;
    if p_complete then
      select exists (
        select 1
        from public.learning_review_attempts attempt
        where attempt.review_session_id = p_review_session_id
          and attempt.owner_user_id = p_owner_user_id
          and attempt.step = 'recall'
          and attempt.evaluation ->> 'verdict' = 'correct'
      ) into v_has_successful_recall;
      if not v_has_successful_recall then
        raise exception 'delayed transfer cannot complete before successful recall';
      end if;
    end if;
  end if;

  select coalesce(max(learning_review_attempts.attempt_number), 0) + 1
    into v_attempt_number
  from public.learning_review_attempts
  where review_session_id = p_review_session_id
    and step = p_step;

  insert into public.learning_review_attempts (
    review_session_id,
    owner_user_id,
    step,
    attempt_number,
    idempotency_key,
    response,
    evaluation
  ) values (
    p_review_session_id,
    p_owner_user_id,
    p_step,
    v_attempt_number,
    p_idempotency_key,
    p_response,
    p_evaluation
  )
  returning * into v_attempt;

  update public.learning_item_states
  set attempt_count = attempt_count + 1,
      successful_retrievals = successful_retrievals + case
        when p_step = 'recall' and p_evaluation ->> 'verdict' = 'correct' then 1
        else 0
      end,
      last_seen_at = now(),
      last_outcome = case when p_complete then p_outcome else last_outcome end,
      last_delayed_transfer_at = case
        when p_complete then now() else last_delayed_transfer_at
      end,
      -- Khoảng cách do FSRS tính ở tầng ứng dụng truyền xuống. Trước đây chỗ
      -- này là hai hằng số 3 ngày / 1 ngày, giống nhau cho mọi mục và mọi người
      -- học, và không đổi dù mục đó đã được nhớ đúng mười lần hay vừa quên.
      next_review_at = case
        when p_complete then p_next_review_at else next_review_at
      end,
      review_state = case
        when p_complete then p_review_state else review_state
      end
  where owner_user_id = p_owner_user_id
    and item_key = v_session.item_key;

  if not found then
    raise exception 'scheduled review item disappeared';
  end if;

  update public.learning_review_sessions
  set status = case when p_complete then 'completed' else 'in_progress' end,
      current_step = case
        when p_complete then 'completed'
        when p_step = 'recall' and p_advance then 'transfer'
        else p_step
      end,
      completed_at = case when p_complete then now() else null end,
      updated_at = now()
  where id = p_review_session_id
  returning * into v_session;

  return query select
    v_attempt.id,
    v_attempt.attempt_number,
    v_session.status,
    v_session.current_step,
    v_session.completed_at,
    true;
end;
$$;

revoke all privileges on function public.record_learning_review_attempt(
  uuid, uuid, text, uuid, jsonb, jsonb, boolean, boolean, text, timestamptz, jsonb
) from public, anon, authenticated;

grant execute on function public.record_learning_review_attempt(
  uuid, uuid, text, uuid, jsonb, jsonb, boolean, boolean, text, timestamptz, jsonb
) to service_role;
