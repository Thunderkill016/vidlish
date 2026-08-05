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

Không còn ở Epic 1/Story 1.1. Production đã có auth private beta, YouTube metadata, durable job, Supadata native transcript, original-English eligibility gate, Gemini lesson generation, atomic publish, lesson viewer và library. Tuy nhiên acceptance production sau bản sửa mới nhất vẫn chưa được chạy vì việc đó ghi dữ liệu thật và tiêu quota Gemini.

## 3. Phần đã hoạt động thật

| Thành phần | Trạng thái | Bằng chứng |
|---|---|---|
| Private beta auth bằng Google/email OTP | Hoạt động production | Trang đăng nhập production trả HTTP 200; auth adapter production là Supabase |
| YouTube metadata/playability | Hoạt động production | Adapter YouTube + server-only API key; đã tạo metadata/job thật |
| Durable generation job | Hoạt động production | Vercel Workflow build nhận 11 steps / 1 workflow; job persist trước dispatch |
| Native transcript | Hoạt động production | Supadata `mode=native`; canonical transcript + segments tồn tại trong Supabase |
| Original-English eligibility | Hoạt động production | Job thật có report `eligible`, 339 permitted segments, 1.630 reliable English words |
| Lesson Engine + grounding | Đã từng chạy end-to-end thật | Database từng có lesson thật với citation/timestamp; `tests/integration/full-real-path.test.ts` đã pass |
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

Tài khoản production đã có hơn 1.000 allowlist rows từ các lần thử. 339 rows của transcript hiện tại nằm ngoài trang đầu, nên ứng dụng trả `no_permitted_segments` dù SQL trực tiếp xác nhận chúng tồn tại. Gemini không được gọi.

PR #39 sửa bằng cách lấy `canonical_transcript_id` trước rồi lọc allowlist ngay trong Postgres bằng cả `owner_user_id` và `transcript_id`. Unit test mới mô phỏng đúng 1.000 rows cũ che mất transcript hiện tại. Full CI run #134 xanh toàn bộ.

### Các lớp bảo vệ đã thêm

- PR #38: workflow fail closed nếu kết thúc mà job vẫn là `analyzing_video`.
- Gemini production trở lại Standard tier; không dùng Flex cho UX tương tác.
- Migration watchdog đã được áp thật lên Supabase production: quét 2 phút, ngưỡng 5 phút.
- Incident memory: `docs/production-incidents/2026-08-06-analyzing-video-stall.md`.
- Mọi route chẩn đoán một lần đã được xóa; production trả 404.

### Phần chưa được kiểm chứng

Chưa chạy lại một bài học production sau PR #39. Acceptance này sẽ:

- ghi lesson thật vào Supabase;
- gọi Gemini Standard và tiêu quota/chi phí;
- có thể cần đưa một failed job về trạng thái có thể chạy lại hoặc tạo job mới.

Do đó trạng thái là **blocked — cần cho phép production data write + provider quota**. Không được tuyên bố sự cố đã hết hoàn toàn trước acceptance này.

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

### M1 — Chẩn đoán được production mà không dựng route tạm

Mục tiêu: mỗi bước provider/workflow có structured telemetry đủ để biết job dừng ở đâu, trong bao lâu và vì loại lỗi nào.

Tiêu chí hoàn thành:

- log có `jobId`, stage, adapter/model, elapsedMs, outcome/error class, retryable;
- không chứa API key, OTP, email, transcript text hoặc lesson draft;
- có runbook truy vấn Vercel logs + Supabase state;
- test xác nhận redaction và event shape;
- một failure test có thể xác định nguyên nhân chỉ từ log và database.

### M2 — Transcript fallback có kiểm soát

Chỉ bắt đầu sau M0/M1. Ưu tiên Gemini public YouTube URL với `fps: 0.2` cho video không có native caption; giữ `sourceType=generated` và UX nói đúng độ tin cậy. Không dùng Supadata `mode=generate` ở gói Free.

### M3 — Hoàn thiện trải nghiệm học MVP

Sau khi generation ổn định: lesson activities/feedback, trạng thái hoàn thành, retrieval/transfer và delete lifecycle theo backlog đã duyệt. Không thêm tính năng ngoài MVP trước các phần này.

## 6. Backlog ưu tiên

| Ưu tiên | Việc | Tác động | Chi phí/rủi ro | Trạng thái |
|---|---|---|---|---|
| P0 | Acceptance production sau PR #39 | Chứng minh sửa đúng luồng thật | Ghi dữ liệu + tốn Gemini quota | **Blocked: cần cho phép** |
| P0 | Structured observability cho generation providers/workflow | Giảm thời gian chẩn đoán, bỏ route tạm | Thấp; cần giữ privacy | Ready |
| P1 | Reconcile `project-context.md`, README và sprint tracker | AI/maintainer không làm theo trạng thái cũ | Thấp | In progress |
| P1 | Production runbook + incident checklist | Chẩn đoán nhất quán | Thấp | Ready |
| P1 | Kiểm tra lại flaky unavailable-video journey | Giữ CI đáng tin | Trung bình; cần bằng chứng trước sửa | Ready |
| P2 | Gemini URL transcript fallback | Tăng coverage video | Provider quota + chất lượng ASR | Chờ M0/M1 |
| P2 | Quota/circuit breaker/cancellation hoàn chỉnh | Bảo vệ provider và UX | Trung bình | Backlog |
| P2 | Telemetry retention và environment isolation | Vận hành an toàn | Trung bình | Backlog |
| P3 | Activities, transfer, delete lifecycle | Hoàn thiện MVP | Phụ thuộc core ổn định | Backlog |

## 7. Công việc hiện tại

### Đang làm

- Cập nhật kế hoạch sống và đánh dấu các tracker cũ bị lệch.
- Chuẩn bị thiết kế structured observability không chứa dữ liệu nhạy cảm.

### Đã hoàn thành trong vòng lặp hiện tại

- Chẩn đoán job production bằng Vercel logs + Supabase state.
- Xác minh migration watchdog chưa được áp rồi áp và kiểm tra runtime.
- PR #38: terminal invariant + Standard Gemini; full CI xanh; production READY.
- Tái hiện nguyên nhân allowlist bị cắt ở 1.000 rows.
- PR #39: filter allowlist tại database + regression test; full CI xanh; merged.
- Xóa toàn bộ route chẩn đoán tạm và xác minh production 404.

### Bị chặn

- Production acceptance thật sau PR #39: cần quyền ghi dữ liệu production và tiêu Gemini quota.

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

- **Thiếu observability:** lỗi provider hiện chưa để lại đủ nguyên nhân an toàn.
- **Tracker drift:** BMAD sprint status và project context có thể khiến agent quay lại làm việc đã xong hoặc bỏ qua lỗi production.
- **Fixture confidence:** CI fixtures không chứng minh YouTube/Supadata/Gemini thật; provider changes luôn cần integration/full-real path hoặc acceptance production được cho phép.
- **Quota/cost:** Supadata Free chỉ 100 credits/tháng; Gemini acceptance tiêu quota và có thể phát sinh phí khi billing bật.
- **Data API limits:** mọi query owner-wide có client-side filtering cần được rà soát để tránh giới hạn 1.000 rows tương tự.
- **Auto deploy:** commit vào `main` có thể kích hoạt Vercel production; code changes phải dừng ở PR khi chưa có quyền deploy.

## 11. Việc tiếp theo

1. Hoàn thành PR tài liệu để kế hoạch sống phản ánh đúng production.
2. Tạo PR structured observability cho generation path, chạy full CI nhưng không merge/deploy production khi chưa được cho phép.
3. Khi được cho phép: chạy acceptance production sau PR #39, ghi lại elapsed time, permitted segment count, lesson provenance và citations; không giữ route tạm.
4. Dựa trên acceptance: đóng M0 hoặc tiếp tục chẩn đoán lỗi thật tiếp theo.

## 12. Việc không nên làm lại

- Chẻ một lần gọi Gemini thành hai lời gọi song song: nhanh hơn 29% nhưng tốn thêm 22% output token và mất mạch nội dung.
- Supadata `mode=generate` ở gói Free: 2 credit mỗi phút video.
- Giữ `minItems`/`maxItems` trong Gemini wire schema: thực tế vẫn bị từ chối.
- Bắt model chép segment IDs dài.
- Lọc dữ liệu nghiệp vụ trong Node sau một Data API query owner-wide có giới hạn ngầm.
- Dùng Flex inference cho màn hình người dùng đang chờ phản hồi theo giây.
