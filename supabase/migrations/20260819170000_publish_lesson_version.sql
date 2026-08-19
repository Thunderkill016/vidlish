-- Gate 0, nửa persistence: một đường ghi `lesson_versions` cho production.
--
-- Cho tới giờ không gì tạo ra hàng nào trong bảng này ngoài fixture CI, nên toàn
-- bộ tầng v2 — phiên học, lượt làm bài, ôn tập giãn cách, lịch FSRS — tới được
-- trong code nhưng không tới được với người học thật. Đây là hàm đầu tiên cho
-- phép nội dung v2 tồn tại ngoài `durable_learning`.
--
-- Hàm này cố ý *không* nhận `schema_version` từ người gọi. Nếu nhận thì một lỗi
-- ở tầng trên có thể ghi hàng mang nhãn khác rồi lọt qua ràng buộc bảng nhờ
-- chính nhãn sai đó. Bảng chỉ chấp nhận 'lesson:v2', nên hàm viết thẳng.

create or replace function public.publish_lesson_version(
  p_owner_user_id uuid,
  p_lesson_id uuid,
  p_blueprint jsonb
)
returns table (lesson_version_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.lesson_versions%rowtype;
  v_inserted public.lesson_versions%rowtype;
begin
  -- Người gọi sở hữu bài học đó hoặc không sở hữu gì. `security definer` bỏ qua
  -- RLS của bảng, nên nếu thiếu chốt này thì bất kỳ ai đăng nhập cũng gắn được
  -- blueprint vào bài học của người khác.
  if not exists (
    select 1
    from public.lessons
    where id = p_lesson_id
      and owner_user_id = p_owner_user_id
  ) then
    raise exception 'owned lesson not found';
  end if;

  -- Idempotent theo đúng ràng buộc `unique (lesson_id, schema_version)`: một
  -- bài học có đúng một bản v2. Lần gọi lại sau khi mạng đứt phải trả về bản đã
  -- có chứ không được ghi đè — blueprint đã publish là thứ phiên học đang chạy
  -- trên đó, và đổi nó dưới chân người học là đổi bài giữa chừng.
  select * into v_existing
  from public.lesson_versions
  where lesson_id = p_lesson_id
    and schema_version = 'lesson:v2';

  if v_existing.id is not null then
    return query select v_existing.id, false;
    return;
  end if;

  insert into public.lesson_versions (
    lesson_id, owner_user_id, schema_version, blueprint
  )
  values (p_lesson_id, p_owner_user_id, 'lesson:v2', p_blueprint)
  returning * into v_inserted;

  return query select v_inserted.id, true;
end;
$$;

revoke all privileges on function public.publish_lesson_version(uuid, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.publish_lesson_version(uuid, uuid, jsonb)
  to service_role;
