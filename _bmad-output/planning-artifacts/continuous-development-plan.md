# Kế hoạch phát triển sống — Vidlish

Cập nhật: **2026-08-18, sau lớp Study Mode**. Đọc `HANDOVER.md` trước file này.

Đây là **nguồn vận hành hiện tại** của dự án. `project-context.md` và
`_bmad-output/implementation-artifacts/sprint-status.yaml` là tracker BMAD, nhưng phải
đối chiếu với file này, `main`, PR, GitHub Actions, Vercel và Supabase production.

## 1. Sản phẩm và phạm vi

```text
dán link YouTube công khai có đủ lời nói tiếng Anh gốc
→ lấy transcript thật
→ xác minh phần tiếng Anh đủ điều kiện
→ Gemini soạn bài từ đúng các segment được phép
→ server hydrate citation/timestamp từ database
→ học ngay trong trang: nghe từng câu, làm bài tập, đánh dấu từ đã thuộc
→ tiến độ được lưu, mở lại đúng chỗ đang dở
```

Invariant: **mọi citation phải là lời thoại thật của video**. Model không được trả text
trích dẫn; model chỉ trả nhãn/ID, server hydrate lại và grounding gate từ chối ID ngoài
allowlist.

Không mở rộng MVP sang tutor chat, thanh toán, gamification, mobile native hoặc chia sẻ
công khai trước khi core path ổn định.

## 2. Giai đoạn hiện tại

**Production stabilization và khóa regression của luồng tạo bài học thật.**

Production đã có:

- private-beta auth;
- YouTube metadata/playability;
- Vercel Workflow durable job;
- Supadata native transcript;
- original-English eligibility gate;
- Gemini lesson generation;
- atomic publish, viewer và library;
- structured observability;
- Supabase watchdog.

## 3. Bằng chứng production hiện tại

| Thành phần | Trạng thái | Bằng chứng |
|---|---|---|
| Auth | Production | Google/email OTP qua Supabase |
| Metadata | Production | YouTube adapter và job thật |
| Durable generation | Production | Vercel Workflow + Supabase persistence |
| Native transcript | Production | Canonical transcript/segments thật |
| Language gate | Production | Report `eligible`, 339 permitted segments |
| Lesson Engine | Production | Lesson completed khoảng 17,6s |
| Grounding | Production | 16/16 citation khớp allowlist + text/timestamp |
| Observability | Production | `vidlish_generation` started/succeeded/published |
| Viewer/library | Production + CI | PR #28, #30, #33 |
| Watchdog | Production | pg_cron mỗi 2 phút, ngưỡng 5 phút |
| CI | Bắt buộc | typecheck/lint, unit, build, Supabase/RLS, Chromium, CI gate |

PR #42 đã sửa giới hạn Supabase Data API 1.000 rows bằng pagination deterministic cho
transcript và permitted-segment reads. Full CI xanh, squash-merge vào `main`, Vercel
production READY và trang chính trả HTTP 200.

## 4. Milestones

### M0 — Core production đáng tin cậy

Người dùng dán video hợp lệ và luôn nhận một kết quả hữu hạn: lesson hoàn chỉnh hoặc lỗi
an toàn có hành động tiếp theo.

Điều kiện đóng:

- 3 lượt production thật liên tiếp trên ít nhất 2 video;
- không job active quá 5 phút;
- citations chỉ tới permitted segments;
- retry/idempotency không tạo lesson trùng;
- lỗi provider có mã an toàn, không lộ dữ liệu;
- full CI xanh tại runtime commit production.

**Tiến độ: 1/3 lượt, 1/2 video.** Hai lượt còn lại bị chặn vì cần quyền ghi production
và tiêu provider quota cho từng đợt.

### M1 — Chẩn đoán được production

- structured log có job/stage/provider/model/elapsed/outcome/error class;
- không chứa key, OTP, email, transcript hoặc lesson draft;
- có runbook Vercel logs + Supabase read-only queries;
- success path đã quan sát thật;
- failure path đã có unit test nhưng chưa chủ động gây lỗi production.

**Trạng thái: gần hoàn tất; không cần thêm route chẩn đoán tạm.**

### M2 — Transcript fallback có kiểm soát

Chỉ bắt đầu sau M0/M1. Ưu tiên Gemini đọc public YouTube URL với `fps: 0.2`, giữ
`sourceType=generated` và UX nói đúng độ tin cậy. Không dùng Supadata `mode=generate`
trên gói Free.

### M3 — Hoàn thiện trải nghiệm học MVP

Activities/feedback, completion, retrieval/transfer và delete lifecycle. Không thêm tính
năng ngoài MVP trước các phần này.

**Đã làm:** activities có chấm điểm (trắc nghiệm, điền từ), flashcard từ vựng, panel luyện
nghe theo từng câu trên allowlist, player nhúng phát đúng đoạn với tốc độ chậm, tiến độ
được lưu qua `lesson_progress` và hiển thị lại ở thư viện, đánh dấu hoàn thành.

**Còn lại:** retrieval/transfer (ôn lại giữa các bài, spaced repetition), delete lifecycle,
và kiểm chứng `supabase test db` + acceptance production cho migration mới.

## 5. Backlog ưu tiên

| Ưu tiên | Việc | Trạng thái |
|---|---|---|
| P0 | Hai production acceptance còn lại để đóng M0 | **Blocked: cần quyền từng đợt** |
| P0 | Structured observability | **Done; success path verified** |
| P1 | Audit Supabase query bị row cap/client filtering | **Done trong PR #39 + #42** |
| P1 | Đồng bộ HANDOVER, README, kế hoạch sống và BMAD tracker | **In progress** |
| P1 | Đóng PR #7–#11 đã bị kiến trúc hiện tại thay thế | Ready |
| P1 | Điều tra flaky unavailable-video journey bằng workflow history/log | Ready |
| P1 | Rà soát và xử lý Dependabot PR theo từng nhóm, không merge major mù | Ready |
| P2 | Gemini URL transcript fallback | Chờ M0/M1 |
| P2 | Quota/circuit breaker/cancellation hoàn chỉnh | Backlog |
| P2 | Telemetry retention + environment isolation | Backlog |
| P1 | Chạy `supabase test db` cho `lesson_progress` | **Done trong PR #54; bắt được 3 lỗi thật** |
| P1 | Xác minh 6 migration chỉ tạo function có thật trong production hay không | Ready |
| P3 | Retrieval/transfer giữa các bài và delete lifecycle | Backlog |

## 6. Công việc hiện tại

### Đang làm

- Loại bỏ PR cũ khiến agent hiểu sai kiến trúc hiện tại.

### Đã hoàn thành trong vòng production stabilization

- PR #21: chuyển Inngest sang Vercel Workflow.
- PR #28/#30/#33: viewer, library và active jobs.
- PR #31/#34/#36/#38: terminal outcomes và watchdog.
- PR #39: lọc allowlist theo transcript trong Postgres.
- PR #41: structured observability và runbook.
- PR #42: pagination đầy đủ qua Supabase Data API.
- Một production acceptance pass grounding/persistence hoàn chỉnh.
- PR #54: Study Mode — `lesson_progress` + RPC, `PUT /api/lessons/[jobId]/progress`,
  lesson workspace tương tác, tiến độ trên thư viện. Đã merge vào `main` (`82fe3fe`),
  migration `20260818120000` đã áp lên Supabase production và deploy production READY.
- Lịch sử migration production đã được đồng bộ với repo. Trước đó hai bên hoàn toàn lệch
  nhau (11 phiên bản local không có ở remote, 10 phiên bản remote không có file), nên
  `supabase db push` từ chối chạy. Nay 12/12 khớp, lần sau chỉ cần `db push`.

### Bị chặn

- Hai acceptance production còn lại của M0. Cần một phiên đăng nhập beta thật trên
  production: `AUTH_ADAPTER=supabase` nên OTP về email chủ tài khoản, agent không tự
  đăng nhập được. Quyền tiêu quota đã có, thứ còn thiếu là phiên đăng nhập.

### Bài học từ PR #54 — gate nào mới là bằng chứng

Study Mode qua typecheck, lint, 222 unit test, production build và cả hai bộ Chromium
journey mà migration vẫn hỏng. Lần đầu `supabase test db` chạy được trên CI, nó bắt ba lỗi:
fixture dựng trạng thái sản phẩm không cho phép; `on conflict (lesson_id)` nhập nhằng với
tham số output của `returns table` khiến **mọi** lần gọi `save_lesson_progress` đều hỏng;
và `check (state ->> 'version' = ...)` fail open khi thiếu khoá.

Lý do các gate khác vô hiệu: unit test dùng repository in-memory nên không chạm SQL, còn
`sql-contract.test.ts` chỉ so regex trên **văn bản** file migration. Với thay đổi database,
chỉ `supabase test db` mới đáng tin.

## 7. Definition of Done

Một task chỉ được gọi là xong khi:

1. Có vấn đề và bằng chứng cụ thể.
2. Sửa nguyên nhân nhỏ nhất, không che triệu chứng.
3. Có regression test đúng tầng.
4. Các gate liên quan đều xanh.
5. Provider/production có kiểm chứng thật hoặc ghi rõ lý do bị chặn.
6. Không log secret, OTP, email, transcript text, provider response hoặc lesson draft.
7. HANDOVER và kế hoạch sống được cập nhật.
8. Không còn probe, endpoint hoặc dữ liệu chẩn đoán tạm.

## 8. Quy trình kiểm chứng

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
supabase test db
pnpm test:e2e
```

Không merge bằng cách bỏ job, giảm assertion hoặc thay test thật bằng fixture yếu hơn.

Với production/provider:

- xác minh deployment đúng commit và READY;
- đọc database trước/sau theo owner/job;
- xác minh outcome terminal;
- xác minh citation provenance nếu completed;
- đọc runtime errors/logs;
- xóa probe và xác minh 404;
- không ghi production hoặc tiêu quota khi chưa được cho phép.

## 9. Rủi ro còn lại

- M0 mới đạt 1/3 lượt.
- Failure telemetry chưa được quan sát bằng lỗi production chủ động.
- Fixture xanh không chứng minh provider thật.
- Supadata Free chỉ 100 credits/tháng.
- Open PR cũ và tracker cũ có thể kéo agent quay lại kiến trúc Inngest/Supadata generate.
- Runtime commit vào `main` kích hoạt production; docs-only phải được Vercel ignore.

## 10. Việc tiếp theo

1. Merge nhánh đồng bộ ngữ cảnh hiện tại.
2. Đóng PR #7–#11 với lý do đã bị Vercel Workflow, terminal outcomes và chiến lược
   Gemini URL hiện tại thay thế.
3. Điều tra flaky unavailable-video journey từ CI/workflow evidence; không thêm retry mù.
4. Rà soát Dependabot PR #23–#27 theo compatibility và CI.
5. Chỉ khi có quyền riêng mới chạy hai acceptance production còn lại.

## 10b. Ranh giới của Study Mode

- Tiến độ học không bao giờ được ghi vào `lessons`; nó là dữ liệu người học, không phải
  output của model.
- Panel luyện nghe chỉ đọc `listPermittedSegments`, không đọc transcript thô.
- Không gộp "xem đáp án" với "tự làm đúng" để phần trăm đẹp hơn.
- Không thêm gamification (streak, huy hiệu, bảng xếp hạng) — vẫn nằm ngoài MVP.

## 11. Việc không nên làm lại

- Khôi phục Inngest.
- Supadata `mode=generate` ở gói Free.
- Giữ `minItems`/`maxItems` trong Gemini wire schema.
- Bắt model chép segment ID dài.
- Lọc nghiệp vụ trong Node sau owner-wide Data API query.
- Dùng Flex inference cho màn hình người dùng đang chờ theo giây.
- Chẻ một lesson thành hai Gemini calls song song.
