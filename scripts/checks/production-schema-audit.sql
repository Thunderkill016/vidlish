-- Đối chiếu production với những gì mã nguồn cần. CHỈ ĐỌC, không sửa gì.
-- Dán toàn bộ vào SQL Editor của Supabase rồi gửi lại kết quả.
select
  needed.kind,
  needed.name,
  case when found.name is null then '*** THIẾU ***' else 'có' end as status
from (
  values
    ('bảng', 'learning_item_states'),
    ('bảng', 'learning_speaking_attempts'),
    ('bảng', 'beginner_evidence_challenges'),
    ('bảng', 'beginner_skill_evidence'),
    ('bảng', 'learner_imitation_measurements'),
    ('bảng', 'beta_access'),
    ('bảng', 'lesson_progress'),
    ('hàm', 'learner_known_words'),
    ('hàm', 'record_beginner_challenge_evidence'),
    ('hàm', 'record_learning_speaking_attempt'),
    ('hàm', 'save_lesson_progress')
) as needed(kind, name)
left join lateral (
  select needed.name as name
  where
    (needed.kind = 'bảng' and exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = needed.name))
    or
    (needed.kind = 'hàm' and exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = needed.name))
) as found on true
order by status desc, needed.kind, needed.name;

-- Và lịch sử migration production tự khai là đã áp những gì.
-- Bảng này chỉ tồn tại trên Supabase thật, nên nó được bọc lại để câu trên
-- vẫn chạy được trên Postgres tại chỗ khi kiểm thử script này.
do $$
declare v_rec record;
begin
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise notice 'khong co lich su migration (dang chay tren Postgres tai cho)';
    return;
  end if;
  for v_rec in
    execute 'select version from supabase_migrations.schema_migrations order by version desc limit 15'
  loop
    raise notice 'da khai ap dung: %', v_rec.version;
  end loop;
end $$;
