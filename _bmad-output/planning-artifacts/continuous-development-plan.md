# Kế hoạch phát triển sống — Vidlish

Cập nhật: 2026-08-06. Đọc `HANDOVER.md` trước file này.

Tài liệu này là **nguồn vận hành hiện tại** của dự án. `project-context.md` và `_bmad-output/implementation-artifacts/sprint-status.yaml` vẫn có giá trị lịch sử/BMAD nhưng đang chậm hơn trạng thái code; không dùng chúng một mình để quyết định việc tiếp theo.

## 1. Sản phẩm và phạm vi

Vidlish dành cho người Việt tự học tiếng Anh:

```text
dán link YouTube công khai có đủ lời nói tiếng Anh gốc
→ lấy transcript thật
→ xác minh phần tiếng Anh đủ điều kiện
→ Gemini soạn bài học từ đúng những segment được phép
→ server hydrate trích dẫn và timestamp từ transcript
→ lưu, mở lại và học
```

Lời hứa cốt lõi: **mọi trích dẫn trong bài học phải là lời thoại thật của video**. Model không được trả text trích dẫn; model chỉ trả segment labels/IDs, server hydrate lại từ database và grounding gate từ chối mọi ID ngoài allowlist.

Không mở rộng MVP sang tutor chat, thanh toán, gamification, dịch video không phải tiếng Anh, mobile native hoặc chia sẻ công khai khi luồng cốt lõi chưa ổn định.

## 2. Giai đoạn hiện tại

**Ổn định hóa production và khóa regression của luồng tạo bài học thật.**

Production đã có auth private beta, YouTube metadata, durable job, Supadata native transcript, original-English eligibility gate, Gemini lesson generation, atomic publish, lesson viewer và library.

Bản sửa sự cố `analyzing_video` đã qua một production acceptance thật ngày 2026-08-06. Đây là bằng chứng mạnh cho job và video từng lỗi, nhưng milestone M0 chưa đóng vì tiêu chí yêu cầu 3 lượt liên tiếp trên ít nhất 2 video khác nhau.

## 3. Phần đã hoạt động thật

| Thành phần | Trạng thái | Bằng chứng |
|---|---|---|
| Private beta auth bằng Google/email OTP | Hoạt động production | Trang đăng nhập production trả HTTP 200; auth adapter production là Supabase |
| YouTube metadata/playability | Hoạt động production | Adapter YouTube + server-only API key; đã tạo metadata/job thật |
| Durable generation job | Hoạt động production | Vercel Workflow build nhận workflow/steps; job persist trước dispatch |
| Native transcript | Hoạt động production | Supadata `mode=native`; canonical transcript + segments tồn tại trong Supabase |
| Original-English eligibility | Hoạt động production | Job thật có report `eligible`, 339 permitted segments, 1.630 reliable English words |
| Lesson Engine + grounding | **Đã kiểm chứng lại production sau fix** | 339 segment → Gemini Standard → lesson completed trong 17.638 ms; 16/16 citation khớp allowlist + text/timestamp |
| Structured observability | Hoạt động production | Event `vidlish_generation` ghi `started` và `succeeded/published`, không chứa dữ liệu nhạy cảm |
| Lesson viewer và library | Hoạt động theo test và production | PR #28, #30, #33; CI Chromium desktop/mobile xanh |
| Watchdog job treo | Hoạt động production | pg_cron `*/2 * * * *`, dọn job quá 5 phút |
| CI bắt buộc | Hoạt động | typecheck/lint, unit, production build, Supabase migrations/RLS, Chromium journeys, CI gate |

## 4. Sự cố production 2026-08-06

### Triệu chứng

Job `c1f4ac68-ff00-4c92-a9c5-010c9e5c0b9f` có transcript và vượt language gate nhưng đứng ở `analyzing_video`. Polling vẫn trả HTTP 200 nên giao diện chỉ chờ; watchdog cuối cùng chuyển job sang `failed / LESSON_GENERATION_FAILED`.

### Nguyên nhân gốc đã tái hiện

`SupabaseLessonRepository.listPermittedSegments()` từng:

1. query toàn bộ `language_eligible_segments` theo `owner_user_id`;
2. nhận tối đa 1.000 rows mặc định từ Supabase Data API;
3. lọc `transcript_id` trong Node.js.

339 rows của transcript hiện tại nằm ngoài trang đầu, nên ứng dụng trả `no_permitted_segments` dù SQL trực tiếp xác nhận chúng tồn tại. Gemini không được gọi.

PR #39 sửa bằng cách lấy `canonical_transcript_id` trước rồi lọc allowlist ngay trong Postgres bằng cả `owner_user_id` và `transcript_id`. Unit test mô phỏng đúng 1.000 rows cũ che mất transcript hiện tại. Full CI run #134 xanh toàn bộ.

### Acceptance production sau sửa

Ngày 2026-08-06, sau PR #39 và PR #41:

- permitted segments: 339;
- provider/model: Gemini Standard / `gemini-3.5-flash-lite`;
- lesson step: 15.578 ms;
- tổng endpoint acceptance: 17.638 ms;
- outcome: `published`;
- trạng thái cuối: `completed`;
- input/output tokens: 5.552 / 1.280;
- lesson rows cho job: 1;
- citation count: 16;
- 16/16 citation thuộc canonical transcript;
- 16/16 citation thuộc allowlist;
- 16/16 citation khớp tuyệt đối text, start và end với transcript segment;
- endpoint acceptance một lần đã bị xóa;
- cleanup deployment `a50cbeda4421bab6c383fb32aad196fa1e7c6a64` READY;
- production route acceptance trả 404; trang chính trả 200.

### Các lớp bảo vệ đã thêm

- PR #38: workflow fail closed nếu kết thúc mà job vẫn là `analyzing_video`.
- Gemini production dùng Standard tier; không dùng Flex cho UX tương tác.
- Watchdog Supabase quét mỗi 2 phút với ngưỡng 5 phút.
- PR #41: structured event + privacy-safe schema + workflow boundary tests + production runbook.
- Incident memory: `docs/production-incidents/2026-08-06-analyzing-video-stall.md`.

## 5. Milestone

### M0 — Luồng core production đáng tin cậy

Mục tiêu: người dùng beta dán video hợp lệ và luôn nhận một trong hai kết quả hữu hạn: lesson hoàn chỉnh hoặc lỗi an toàn có hành động tiếp theo.

Tiêu chí hoàn thành:

- 3 lượt production thật liên tiếp trên ít nhất 2 video khác nhau;
- job không ở trạng thái active quá 5 phút;
- lesson hoàn chỉnh có citations chỉ tới permitted segments;
- retry/idempotency không tạo lesson trùng;
- lỗi provider được log bằng mã an toàn, không log transcript hoặc secret;
- full CI xanh tại commit production.

**Tiến độ: 1/3 lượt, 1/2 video.** Lượt đầu đã pass toàn bộ grounding và persistence checks. Hai lượt còn lại cần quyền ghi production và tiêu provider quota riêng.

### M1 — Chẩn đoán được production mà không dựng route tạm

Mục tiêu: mỗi bước provider/workflow có structured telemetry đủ để biết job dừng ở đâu, trong bao lâu và vì loại lỗi nào.

Tiêu chí hoàn thành:

- log có `jobId`, stage, adapter/model, elapsedMs, outcome/error class, retryable;
- không chứa API key, OTP, email, transcript text hoặc lesson draft;
- có runbook truy vấn Vercel logs + Supabase state;
- test xác nhận redaction và event shape;
- một failure test có thể xác định nguyên nhân chỉ từ log và database.

**Tiến độ:** success path đã được quan sát thật trên Vercel Runtime Logs; failure path đã được khóa bằng unit test nhưng chưa chủ động gây lỗi production.

### M2 — Transcript fallback có kiểm soát

Chỉ bắt đầu sau M0/M1. Ưu tiên Gemini public YouTube URL với `fps: 0.2` cho video không có native caption; giữ `sourceType=generated` và UX nói đúng độ tin cậy. Không dùng Supadata `mode=generate` ở gói Free.

### M3 — Hoàn thiện trải nghiệm học MVP

Sau khi generation ổn định: lesson activities/feedback, trạng thái hoàn thành, retrieval/transfer và delete lifecycle theo backlog đã duyệt. Không thêm tính năng ngoài MVP trước các phần này.

## 6. Backlog ưu tiên

| Ưu tiên | Việc | Tác động | Chi phí/rủi ro | Trạng thái |
|---|---|---|---|---|
| P0 | Hoàn tất M0 bằng 2 acceptance production còn lại trên ít nhất 1 video khác | Chứng minh độ ổn định, không chỉ sửa một case | Ghi dữ liệu + Gemini/Supadata quota | **Blocked: cần cho phép từng đợt** |
| P0 | Structured observability cho generation | Giảm thời gian chẩn đoán, bỏ route tạm | Thấp; privacy-sensitive | **Done + success path verified** |
| P1 | Rà soát các Supabase query owner-wide rồi lọc client-side | Ngăn lặp lại lỗi giới hạn 1.000 rows | Thấp | Ready |
| P1 | Đồng bộ README và BMAD sprint tracker với trạng thái code | Tránh agent làm theo trạng thái cũ | Thấp | Partial |
| P1 | Kiểm tra lại flaky unavailable-video journey | Giữ CI đáng tin | Trung bình; cần bằng chứng trước sửa | Ready |
| P2 | Gemini URL transcript fallback | Tăng coverage video | Provider quota + chất lượng ASR | Chờ M0/M1 |
| P2 | Quota/circuit breaker/cancellation hoàn chỉnh | Bảo vệ provider và UX | Trung bình | Backlog |
| P2 | Telemetry retention và environment isolation | Vận hành an toàn | Trung bình | Backlog |
| P3 | Activities, transfer, delete lifecycle | Hoàn thiện MVP | Phụ thuộc core ổn định | Backlog |

## 7. Công việc hiện tại

### Đang làm

- Rà soát các query Supabase có nguy cơ lặp lại lỗi client-side filtering sau row cap.
- Đồng bộ tracker/tài liệu còn chậm hơn code.

### Đã hoàn thành trong vòng lặp hiện tại

- Chẩn đoán job production bằng Vercel logs + Supabase state.
- Áp và kiểm tra migration watchdog production.
- PR #38: terminal invariant + Standard Gemini; full CI xanh; production READY.
- PR #39: filter allowlist tại database + regression test; merged.
- PR #41: structured observability + runbook + privacy tests; full CI run #141 xanh; merged và deployed.
- Chạy đúng một production acceptance được cho phép.
- Xác minh lesson provenance và grounding bằng SQL.
- Xóa endpoint acceptance và xác minh production 404 + homepage 200.

### Bị chặn

- Hai acceptance production còn lại của M0 cần quyền ghi dữ liệu thật và tiêu provider quota mới.

## 8. Definition of Done cho mỗi thay đổi

Một task chỉ được gọi là xong khi:

1. Vấn đề và bằng chứng được ghi rõ.
2. Thay đổi nhỏ nhất giải quyết nguyên nhân, không chỉ che triệu chứng.
3. Có test hồi quy ở tầng phù hợp; không dùng fixture để chứng minh provider thật.
4. Typecheck, lint, unit, production build, database/RLS và Chromium journeys đều xanh khi phạm vi liên quan.
5. Với provider/production: có kiểm chứng thật hoặc ghi rõ chưa được kiểm chứng và lý do bị chặn.
6. Không log secret, OTP, email, transcript text hoặc dữ liệu bài học nhạy cảm.
7. Tài liệu kế hoạch/incident/handover được cập nhật.
8. Không còn endpoint, feature flag hoặc dữ liệu chẩn đoán tạm sau kiểm tra.

## 9. Quy trình kiểm chứng

### Mặc định cho code

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
supabase test db
pnpm test:e2e
```

CI gate phải xanh; không merge bằng cách bỏ job, giảm assertion hoặc thay test thật bằng fixture yếu hơn.

### Provider/production

- kiểm tra deployment đúng commit và trạng thái READY;
- đọc database trước/sau bằng owner/job cụ thể;
- xác minh outcome terminal;
- xác minh lesson/citation/provenance khi completed;
- kiểm tra runtime errors/logs;
- xóa probe ngay và xác minh 404 nếu buộc phải dùng probe;
- không ghi production hoặc tiêu quota khi chưa được cho phép.

## 10. Rủi ro

- **M0 mới đạt 1/3 lượt:** chưa đủ bằng chứng để tuyên bố toàn bộ production path ổn định trên nhiều video.
- **Failure telemetry chưa quan sát thật:** success path đã xác minh; failure path mới có test.
- **Tracker drift:** README/BMAD sprint status có thể khiến agent quay lại làm việc đã xong.
- **Fixture confidence:** CI fixtures không chứng minh YouTube/Supadata/Gemini thật.
- **Quota/cost:** Supadata Free chỉ 100 credits/tháng; Gemini acceptance tiêu quota và có thể phát sinh phí khi billing bật.
- **Data API limits:** mọi query owner-wide có client-side filtering cần được rà soát để tránh giới hạn 1.000 rows tương tự.
- **Auto deploy:** commit runtime vào `main` kích hoạt Vercel production; code changes phải dừng ở PR khi chưa có quyền deploy.

## 11. Việc tiếp theo

1. Rà soát toàn bộ Supabase repositories để tìm query owner-wide rồi lọc client-side; chỉ sửa khi có bằng chứng.
2. Đồng bộ README và sprint tracker với production stabilization.
3. Điều tra flaky unavailable-video journey từ workflow history/log thật, không thêm retry mù.
4. Khi được cho phép mới chạy hai acceptance production còn lại của M0.

## 12. Việc không nên làm lại

- Chẻ một lần gọi Gemini thành hai lời gọi song song: nhanh hơn 29% nhưng tốn thêm 22% output token và mất mạch nội dung.
- Supadata `mode=generate` ở gói Free: 2 credit mỗi phút video.
- Giữ `minItems`/`maxItems` trong Gemini wire schema: thực tế vẫn bị từ chối.
- Bắt model chép segment IDs dài.
- Lọc dữ liệu nghiệp vụ trong Node sau một Data API query owner-wide có giới hạn ngầm.
- Dùng Flex inference cho màn hình người dùng đang chờ phản hồi theo giây.
