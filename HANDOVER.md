# Bàn giao Vidlish — đọc file này trước khi làm bất cứ điều gì

Cập nhật: **2026-08-18**, sau lớp Study Mode (M3, phần activities/completion).

Tài liệu này giữ những kiến thức đắt tiền và trạng thái thực tế mà đọc code đơn thuần
không đủ để biết. Thứ tự nguồn sự thật khi tiếp quản:

1. `HANDOVER.md` — invariant, bẫy production và quy tắc không được phá.
2. `_bmad-output/planning-artifacts/continuous-development-plan.md` — việc đang làm và backlog sống.
3. `main`, PR, GitHub Actions, Vercel deployment và Supabase production — trạng thái thực tế cuối cùng.
4. `project-context.md` và `sprint-status.yaml` — tracker BMAD; chỉ dùng sau khi đối chiếu ba nguồn trên.

---

## 1. Sản phẩm là gì

Dán link YouTube công khai → lấy lời thoại thật → xác minh phần tiếng Anh đủ điều kiện
→ AI soạn bài học tiếng Anh từ đúng nội dung video → người dùng mở lại và học.

Người dùng là người Việt tự học tiếng Anh. Giao diện tiếng Việt, nội dung dạy là tiếng Anh.
Không mở rộng MVP sang tutor chat, thanh toán, gamification, mobile native hoặc chia sẻ
công khai khi luồng cốt lõi chưa ổn định.

## 2. Lời hứa cốt lõi và cách nó được bảo vệ

**Mọi câu trích dẫn trong bài học phải là lời thoại có thật trong video.**

Cơ chế bảo vệ:

- `lessonDraftSchema` không cho model trả văn bản trích dẫn; model chỉ trả segment labels/IDs.
- Prompt dùng nhãn ngắn `[S1]`, `[S2]` thay vì bắt model sao chép ID dài.
- Server ánh xạ nhãn về ID thật, hydrate text/timestamp từ `transcript_segments`.
- `hydrateLessonCitations` từ chối mọi ID ngoài allowlist bằng `LessonGroundingError`.
- Bài chỉ được publish sau khi grounding pass; không được “sửa nhẹ” để chấp nhận citation không hợp lệ.

Khi sửa gần Lesson Engine, tuyệt đối không thêm trường để model tự viết câu trích dẫn.

## 2b. Lời hứa học tập và ranh giới của Study Mode

Bài học không còn là một trang để đọc. Người học nghe từng câu ngay trong trang, trả lời
bài tập và được chấm, đánh dấu từ đã thuộc, và tiến độ được lưu lại.

Ranh giới bắt buộc:

- **Study progress là dữ liệu của người học, không phải output của model.** Nó nằm ở bảng
  riêng `lesson_progress`, không bao giờ ghi vào `lessons.draft` hay `lessons.citations`.
- Không có đường nào từ tiến độ học quay ngược lại grounding gate. Sửa gần Study Mode
  không được đụng vào `hydrate-lesson-citations` hay `lessonDraftSchema`.
- Panel "Luyện nghe" chỉ hiển thị `listPermittedSegments` — đúng allowlist đã đưa cho
  Lesson Engine, không phải transcript thô.
- Câu trả lời được đánh địa chỉ bằng vị trí trong mảng draft. Điều này chỉ an toàn vì một
  lesson là bất biến (`unique (job_id, pipeline_version)`). Nếu sau này lesson được phép
  soạn lại tại chỗ, phải đổi cách đánh địa chỉ trước.
- `save_lesson_progress` phân giải chủ sở hữu **từ lesson**, không tin `job_id` client gửi —
  cùng nguyên tắc với `publish_lesson`.
- Điểm số được tính từ draft ở phía đọc, không lưu số điểm; một payload trỏ quá cuối mảng
  bị bỏ qua chứ không được tính.
- Xem đáp án (`revealed`) và tự làm đúng (`solved`) là hai trường khác nhau. Không gộp
  chúng để làm đẹp phần trăm.

## 3. Kiến trúc và production hiện tại

Kiến trúc hexagonal:

- `src/modules/*/ports`: interface;
- `src/modules/*/application`: use case;
- `src/adapters/*`: Supabase, YouTube, Supadata, Gemini;
- `src/platform/*`: composition root;
- `src/workflows/*`: Vercel Workflow durable orchestration và retryable steps.

Luồng dữ liệu:

```text
video
→ lesson_jobs
→ transcripts + transcript_segments
→ language_eligibility_reports + language_eligible_segments
→ lessons
→ lesson_progress
```

Production hiện dùng:

```text
AUTH_ADAPTER=supabase
VIDEO_METADATA_ADAPTER=youtube
GENERATION_REPOSITORY=supabase
GENERATION_DISPATCHER=workflow
TRANSCRIPT_NATIVE_ADAPTER=supadata
TRANSCRIPT_REPOSITORY=supabase
LESSON_PROVIDER=gemini
```

**Inngest đã bị loại khỏi kiến trúc từ PR #21.** Không tạo Inngest app, không thêm
`INNGEST_EVENT_KEY`, không chạy Inngest Dev Server và không phục hồi endpoint Inngest cũ.

Vidlish đã deploy production trên Vercel. Runtime qua PR #42 đã READY và alias
`vidlish.vercel.app` trả HTTP 200. Không còn trạng thái “chưa deploy”.

## 4. Trạng thái sản phẩm đã kiểm chứng

Đã chạy thật trên production:

- public auth bằng email và mật khẩu, với email confirmation/recovery;
- YouTube metadata và playability;
- durable generation job bằng Vercel Workflow;
- Supadata native transcript và canonical persistence;
- original-English eligibility gate;
- Gemini lesson generation;
- atomic lesson publish, viewer và library;
- structured generation telemetry;
- watchdog Supabase quét mỗi 2 phút, dọn job active quá 5 phút.

Production acceptance sau sự cố `analyzing_video`:

- 339 permitted segments;
- Gemini Standard, `gemini-3.5-flash-lite`;
- lesson completed trong khoảng 17,6 giây;
- 16/16 citation thuộc canonical transcript và allowlist;
- 16/16 citation khớp text, start và end trong database;
- một lesson row duy nhất, không publish trùng.

Milestone M0 vẫn mới đạt **1/3 lượt trên 1/2 video**. Hai lượt production còn lại cần
quyền ghi dữ liệu và tiêu provider quota cho từng đợt; không tự chạy chỉ để “cho đủ số”.

## 5. Những cái bẫy đã làm hỏng sản phẩm

### 5.1 Gemini từ chối schema JSON đầy đủ

Gemini từng trả:

```text
400 The specified schema produces a constraint that has too many states for serving
```

Trước khi gửi wire schema phải lược đúng sáu keyword:

```text
$schema, pattern, minLength, maxLength, minItems, maxItems
```

Validation đầy đủ vẫn chạy phía server bằng `lessonDraftSchema`. Chỉ lược keyword ở tầng
schema, không xóa field có tên `pattern` trong `properties`.

### 5.2 Không bắt model sao chép ID dài

`gemini-3.5-flash-lite` từng trả đúng 32 ký tự hex nhưng làm rơi tiền tố `seg_`, khiến
mọi bài fail validation. Luôn dùng nhãn ngắn và ánh xạ về ID thật trước validation.

### 5.3 Thinking level và sampling

- Bước soạn bài dùng `ThinkingLevel.HIGH` từ enum của SDK.
- Không dùng chuỗi `"high"`.
- Không chỉnh `temperature`, `top_p` hoặc `top_k` trên Gemini 3.x.
- Không chẻ một bài thành hai lời gọi song song: đo được nhanh hơn 29% nhưng tốn thêm
  22% output token và làm hai nửa mất mạch nội dung.

### 5.4 Supabase Data API có giới hạn mỗi response

`supabase/config.toml` đặt `api.max_rows = 1000`. Query có thể thành công nhưng âm thầm
trả thiếu dữ liệu.

Quy tắc bắt buộc:

- lọc nghiệp vụ trong Postgres, không tải owner-wide rồi `.filter()` trong Node;
- với tập có thể vượt 1.000 rows, dùng deterministic order + `count: "exact"` + `range()`;
- tiến offset theo số row server thực trả, không theo range yêu cầu;
- fail closed nếu exact count báo còn row nhưng trang kế tiếp rỗng.

PR #39 sửa allowlist bị che bởi 1.000 row cũ. PR #42 thêm pagination đầy đủ cho
`transcript_segments` và permitted-segment hydration, gồm regression 1.149/1.001 rows.

### 5.5 Workflow phải kết thúc hữu hạn

Một workflow kết thúc không được để job ở trạng thái active như `acquiring_transcript`,
`checking_language` hoặc `analyzing_video`.

- Step cạn retry phải terminalize job và trả active slot.
- Workflow boundary phải fail closed nếu trạng thái cuối vẫn active.
- Watchdog pg_cron là lưới cuối, không phải cơ chế chính.
- Không dùng Gemini Flex cho UX đang chờ theo giây; production dùng Standard tier.

### 5.6 Timestamp Supabase có offset

Supabase serialize `timestamptz` dạng `+00:00`, không chỉ dạng `Z`. Contract datetime
đọc dữ liệu Supabase phải chấp nhận offset (`z.string().datetime({ offset: true })`).

### 5.7 Nhúng player YouTube phải tự dừng đúng chỗ

`LessonPlayer` điều khiển iframe bằng `postMessage` với `enablejsapi=1`, không tải script
ngoài. Điểm dừng cuối segment là một timer đặt ngay lúc phát, không phải vòng lặp đọc
`currentTime`: một message chậm không được để video chạy quá câu người học muốn nghe.
Timer luôn được clear trước lần phát kế tiếp và khi component unmount.

### 5.8 Test và build có thể xanh sai lý do

- Fixtures từng cho 156 unit và 28 e2e xanh trong khi provider thật không tạo được bài.
- Thay đổi provider phải chạy `tests/integration/full-real-path.test.ts` với key thật khi được phép.
- Playwright dùng chung beta user; quota test phải rộng trong `webServer.env`.
- `plan(N)` của pgTAP phải khớp chính xác số assertion; đếm bằng máy.
- Local `pnpm build` cần `CI=true` và đủ env trong `.github/workflows/ci.yml`.

## 6. Số liệu và giới hạn đã đo — không đo lại nếu không có giả thuyết mới

Một bài video 3m34s, 61 segments:

| Bước | Thời gian | Tỉ trọng |
|---|---:|---:|
| Gemini soạn bài | ~13,6s | 68% |
| Supadata + chuẩn hóa | ~5,9s | 30% |
| YouTube Data API | ~0,4s | 2% |
| franc | ~0,03s | 0,1% |

Supadata Free:

- 100 credit/tháng;
- `mode=native`: 1 credit;
- `mode=generate`: 2 credit mỗi phút video;
- không dùng `mode=generate` ở gói Free.

Transcript fallback ưu tiên sau M0/M1:

1. YouTube metadata chặn sớm;
2. Supadata native caption;
3. Gemini đọc public YouTube URL với `videoMetadata: { fps: 0.2 }` và
   `sourceType=generated`.

Gemini URL với `fps: 0.2` đã đo khoảng 38 token/giây video; `mediaResolution: LOW`
không giảm token trong phép đo này.

## 6b. Study Mode: đã làm gì trong vòng lặp này

- `lesson_progress` + `save_lesson_progress` (RLS, service_role only, một row mỗi lesson);
- `PUT /api/lessons/[jobId]/progress` (same-origin, giới hạn 8 KiB, validate contract);
- lesson viewer đổi thành workspace: player nhúng, phát đúng segment, tốc độ 0.5/0.75/1x,
  ẩn video, quiz chấm ngay, cloze gõ đáp án, flashcard, panel luyện nghe, thanh tiến độ;
- thư viện hiển thị phần trăm đã học và trạng thái hoàn thành.

### Ba lỗi thật mà chỉ `supabase test db` bắt được (PR #54)

Migration `lesson_progress` từng qua typecheck, lint, 222 unit test, production build và
cả hai bộ Chromium journey mà vẫn hỏng. Lần đầu chạy được pgTAP trên CI, nó lộ ra ba lỗi:

1. **Fixture dựng trạng thái sản phẩm không cho phép.** Hai job cùng
   `(owner, video, cefr_level, pipeline_version)` cùng ở trạng thái hoạt động, vi phạm
   `lesson_jobs_one_active_generation`. Test thoát sớm sau 8/20 assertion.
2. **`save_lesson_progress` không chạy được một lần nào.**
   `ERROR: column reference "lesson_id" is ambiguous`. Hàm khai báo
   `returns table (lesson_id uuid, ...)`, nên `lesson_id` vừa là cột vừa là biến output, và
   PL/pgSQL phân giải cả inference target của `on conflict (lesson_id)` theo biến. Cách
   chữa: đặt tên constraint rồi `on conflict on constraint`. **Đừng đặt tên tham số output
   của `returns table` trùng tên cột mà upsert phải suy luận.**
3. **Guard phiên bản fail open.** `check (state ->> 'version' = 'study-progress:v1')` không
   chặn payload thiếu khoá `version`: `NULL = '...'` là NULL và CHECK coi NULL là thoả mãn.
   Phải dùng `is not distinct from`. Đã rà toàn bộ migration, không còn chỗ nào cùng dạng.

Vì sao mọi gate khác xanh: unit test dùng repository in-memory nên không chạm SQL, còn
`tests/integration/sql-contract.test.ts` chỉ so regex trên **văn bản** file migration — nó
xanh mà không cần một dòng SQL nào được thực thi. Với thay đổi database, chỉ
`supabase test db` mới là bằng chứng.

Môi trường phát triển hiện tại không có Docker daemon lẫn Postgres cục bộ, nên không chạy
được `supabase test db` tại chỗ; CI là nơi kiểm chứng. Không áp migration lên production
trước khi job `database` xanh.

## 7. Việc hiện tại và thứ tự tiếp theo

Nguồn chi tiết là `continuous-development-plan.md`. Tóm tắt sau PR #42:

1. **Đồng bộ nguồn ngữ cảnh**: HANDOVER, README, kế hoạch sống và BMAD tracker.
2. **Điều tra flaky unavailable-video journey** từ workflow history/log; không thêm retry mù.
3. Khi được cho phép riêng, chạy hai production acceptance còn lại để đóng M0.
4. Sau M0/M1 mới làm Gemini public-URL transcript fallback.
5. Sau core stability mới tiếp tục activities, completion/retrieval và delete lifecycle.

Audit Supabase row-cap hiện đã hoàn thành cho các repository đang dùng trong core path;
không tiếp tục sửa chỉ vì thấy query owner-scoped nếu nó là equality, count/head hoặc có
explicit product limit.

## 8. Quy tắc làm việc

- Đọc `HANDOVER.md` và kế hoạch sống trước khi chọn task.
- Luôn kiểm tra trạng thái thật của `main`, PR và CI; không tin số PR từ trí nhớ.
- Không làm lại task đã merge.
- Không ghi production hoặc tiêu provider quota nếu chưa có quyền rõ cho đợt đó.
- Thay đổi nhỏ nhất giải quyết nguyên nhân, có regression test đúng tầng.
- Không log API key, OTP, email, transcript text, provider response hoặc lesson draft.
- Chạy đủ gate liên quan: typecheck, lint, unit, production build, Supabase/RLS và Chromium journeys.
- Repo dùng squash merge, lịch sử `main` tuyến tính.
- Sau mỗi thay đổi runtime/production, cập nhật `HANDOVER.md` và kế hoạch sống trong cùng vòng lặp.
