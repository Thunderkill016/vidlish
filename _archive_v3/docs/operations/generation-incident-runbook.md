# Runbook: chẩn đoán generation job trên production

Cập nhật: 2026-08-06.

Mục tiêu: xác định job dừng ở đâu bằng Vercel Runtime Logs và Supabase state, không dựng route chẩn đoán công khai và không đọc secret.

## Nguyên tắc an toàn

- Không log hoặc sao chép API key, OTP, email, transcript text, lesson draft hay provider response body.
- Chỉ dùng job UUID, stage, provider/model ID, outcome, elapsed time, error class và retryable.
- Mọi production write, provider call có quota/chi phí hoặc reset job cần được cho phép trước.
- Truy vấn read-only được ưu tiên; probe chỉ là lựa chọn cuối và phải bị xóa + xác minh 404.

## 1. Xác định deployment đang phục vụ production

Trong Vercel, kiểm tra deployment có:

- target `production`;
- state `READY`;
- alias `vidlish.vercel.app`;
- commit SHA đúng với `main` cần kiểm tra.

Không dùng log của preview deployment để kết luận production.

## 2. Đọc generation event

Tìm theo job UUID hoặc marker:

```text
vidlish_generation
```

Event là một dòng JSON có shape giới hạn:

```json
{
  "event": "vidlish_generation",
  "level": "error",
  "jobId": "<uuid>",
  "stage": "lesson_generation",
  "action": "failed",
  "provider": "gemini",
  "modelId": "gemini-3.5-flash-lite",
  "reason": "provider_failure",
  "elapsedMs": 13402,
  "retryable": true,
  "errorName": "LessonGenerationFailure"
}
```

Diễn giải:

- `started` nhưng không có `succeeded`/`failed`: bước hoặc runtime bị dừng ngoài catch; đối chiếu Workflow run và watchdog.
- `succeeded + no_permitted_segments`: kiểm tra allowlist của canonical transcript; Gemini chưa được gọi.
- `failed + provider_failure`: provider đã được gọi; `retryable` cho biết adapter phân loại lỗi.
- `failed + unexpected_error`: lỗi ngoài contract provider; ưu tiên stack trace runtime và database constraints.
- `workflow_terminalization + terminated`: workflow đã fail closed và trả active-job slot.

## 3. Kiểm tra Supabase state (read-only)

Thay `<job_id>` bằng UUID cụ thể.

### Job hiện tại

```sql
select
  id,
  owner_user_id,
  status::text as status,
  current_stage,
  dispatch_status,
  safe_error_code,
  canonical_transcript_id,
  lesson_id,
  created_at,
  updated_at,
  now() - updated_at as idle_for
from public.lesson_jobs
where id = '<job_id>';
```

### Transcript và allowlist

```sql
select
  j.id as job_id,
  j.canonical_transcript_id,
  r.status,
  r.english_share,
  r.reliable_coverage,
  r.reliable_english_word_count,
  count(e.segment_id) as eligible_segments
from public.lesson_jobs j
left join public.language_eligibility_reports r on r.job_id = j.id
left join public.language_eligible_segments e
  on e.report_id = r.id
 and e.transcript_id = j.canonical_transcript_id
 and e.owner_user_id = j.owner_user_id
where j.id = '<job_id>'
group by
  j.id,
  j.canonical_transcript_id,
  r.status,
  r.english_share,
  r.reliable_coverage,
  r.reliable_english_word_count;
```

Không query toàn bộ allowlist của owner rồi lọc client-side. Supabase Data API mặc định giới hạn số rows và lỗi này từng làm production coi 339 segment tồn tại là rỗng.

### Lesson đã publish

```sql
select
  id,
  job_id,
  model_id,
  prompt_version,
  input_tokens,
  output_tokens,
  jsonb_array_length(citations) as citation_count,
  created_at
from public.lessons
where job_id = '<job_id>';
```

## 4. Kiểm tra watchdog

```sql
select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'expire-stalled-lesson-jobs';
```

Production mong đợi:

```text
schedule: */2 * * * *
command: select public.expire_stalled_lesson_jobs(interval '5 minutes')
active: true
```

Lịch chạy gần nhất:

```sql
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid in (
  select jobid from cron.job
  where jobname = 'expire-stalled-lesson-jobs'
)
order by start_time desc
limit 10;
```

## 5. Ma trận chẩn đoán

| Database | Log cuối | Kết luận ban đầu |
|---|---|---|
| `checking_language` | không có lesson event | language step hoặc workflow resume |
| `analyzing_video` | `no_permitted_segments` | allowlist/query mismatch; provider chưa gọi |
| `analyzing_video` | provider `failed` | provider retry đang diễn ra hoặc cạn retry chưa terminalize |
| `failed / LESSON_GENERATION_FAILED` | terminalization `terminated` | workflow đã kết thúc an toàn; tìm event failed trước đó |
| `completed` + `lesson_id` | lesson `succeeded/published` | xác minh citation/provenance |
| active > 5 phút | không có terminal event | watchdog/config/runtime failure |

## 6. Acceptance production

Chỉ chạy khi được cho phép ghi dữ liệu và tiêu provider quota.

Một acceptance đạt khi:

1. deployment đúng commit và READY;
2. job đi qua transcript + language gate;
3. event `lesson_generation started` xuất hiện;
4. event kết thúc là `published` hoặc một failure terminal có lý do;
5. nếu completed: lesson tồn tại, citations không rỗng và chỉ dùng permitted segments;
6. không có route/probe tạm còn tồn tại;
7. kế hoạch sống và incident document được cập nhật.
