# Story 2.3.5: Kết thúc an toàn cho transcript acquisition

Status: backlog — blocked on ADR-004 và ADR-005

> **Story này chưa được chấp nhận vào backlog.** Nó phát sinh từ `repo-analysis-2026-08-05.md` mục 13
> chứ không từ `epics.md`, và phụ thuộc quyết định ADR-004/ADR-005 (PR #10). `epics.md` và
> `sprint-status.yaml` vẫn là backlog canonical; cả hai **chưa** được sửa. Không chạy `bmad-dev-story`
> trên story này trước khi ADR được chấp nhận và sprint-status được cập nhật.
>
> **Đánh số:** 2.3.5 vì story chèn giữa 2.3 (đã done) và 2.4 (đang mở ở PR #7). Đổi số 2.4–2.13 sẽ
> phá mọi tham chiếu chéo hiện có trong epics và readiness report, nên dùng số thập phân thay vì
> renumber.

## Story

As a người học vừa dán một video không lấy được transcript,
I want Vidlish nói rõ là nó không làm được và cho tôi một hành động,
so that tôi không ngồi nhìn thanh tiến trình chạy mãi và không bị khóa mất lượt tạo bài học.

## Business Value

Hôm nay mọi thất bại transcript đều treo vô thời hạn. Không có dòng TypeScript nào ghi
`status = 'failed'` — trên `main` lẫn trên nhánh PR #7. Job ở lại `acquiring_transcript`, trang tiến
trình poll 3 giây/lần mãi mãi, và vì `acquiring_transcript` nằm trong `activeGenerationJobStatuses`,
job giữ luôn một slot quota. Với `GENERATION_MAX_ACTIVE_JOBS = 2` và chưa có endpoint hủy, hai video
không caption là khóa vĩnh viễn một tài khoản private beta.

Story này biến thất bại thành một kết cục có tên, có hành động, và giải phóng quota. Nó cũng thay
thế cách nối strategy bằng biến boolean trong workflow bằng một orchestrator, để Stories 2.6, 2.7 và
2.8 chỉ cần đăng ký strategy thay vì sửa lại workflow mỗi lần.

Story kết thúc ở ranh giới transcript. Nó không thêm strategy mới và không chạm Lesson Engine.

## Requirements Traceability

- Functional: FR33 (lỗi map sang mã ổn định, copy tiếng Việt, action cụ thể) là yêu cầu chính;
  FR31 (reload/retry không mất trạng thái), FR32 (stage hiển thị đúng), FR12–FR13 giữ nguyên.
- Non-functional: NFR5 (quota/concurrency), NFR7 (state persisted), NFR12 (async có persisted
  status), NFR15 (telemetry không chứa content), NFR16 (CI chỉ fixtures).
- Architecture: ADR-004 D1–D7; ID-12 (canonical action union); Language Eligibility Amendment —
  "Caption absence, provider exhaustion and low-quality acquisition are not themselves proof that the
  source language is unsupported".
- UX: `EXPERIENCE.md` — Transcript fallback hierarchy (đúng một hành động chính, không lộ tên vendor),
  State patterns.

## Dependencies

- **Chặn bởi:** quyết định ADR-004 và ADR-005 (PR #10).
- **Chặn:** Story 2.4 (PR #7) nên rebase lên story này rồi mở rộng điều kiện exhausted; Stories 2.6,
  2.7, 2.8 đăng ký strategy qua orchestrator; Story 2.10 (circuit breaker) cần orchestrator.
- **Không phụ thuộc:** P0-2 (sửa mẫu số `englishShare`) chạy song song được.

## Acceptance Criteria

### AC1 — Exhaustion là terminal

Khi orchestrator báo không còn strategy nào chưa thử, job chuyển `failed` với
`safe_error_code = 'TRANSCRIPT_UNAVAILABLE'`. Transition đi qua RPC `security definer` và idempotent
khi gọi lại. Thất bại transcript không bao giờ dùng `VIDEO_LANGUAGE_UNSUPPORTED`.

### AC2 — Weak evidence không biến thành language error

Khi language gate trả `insufficient_evidence`, workflow hỏi orchestrator. Còn strategy chưa thử thì
job tiếp tục như hiện tại. Hết strategy thì job kết thúc theo AC1, không phải bằng language error.

### AC3 — `status` là nguồn sự thật duy nhất cho tính terminal

Không tồn tại trạng thái nào mà `currentStage` mô tả thất bại trong khi `status` vẫn non-terminal.
CI có assertion cho bất biến này. `currentStage` chỉ là nhãn hiển thị.

### AC4 — Orchestrator thay thế phân nhánh trong workflow

`TranscriptStrategyOrchestrator.next(job)` trả `{ kind: "next", strategy }` hoặc
`{ kind: "exhausted", attempted }`. Strategy đã thử được suy ra từ `transcript_acquisition_attempts`.
Orchestrator bỏ qua strategy bị tắt bởi config hoặc bị policy từ chối, và không bao giờ trả lại một
strategy đã cho kết quả terminal với job đó. Workflow không chứa `if`/`else` theo strategy ID cụ thể.

### AC5 — Bounded time cho mọi job

Job non-terminal và không đổi `updated_at` quá ngưỡng cấu hình chuyển `failed`. Ngưỡng là hằng có tên
kèm comment ghi nguồn gốc giá trị. Watchdog idempotent với workflow: hai bên cùng ghi terminal không
tạo trạng thái mâu thuẫn.

### AC6 — Quota được giải phóng

Job `failed` không còn tính vào active-job count. Sau khi một job kết thúc, người dùng tạo được job
mới trong giới hạn cấu hình.

### AC7 — UX kết thúc

Trang tiến trình hiển thị màn hình terminal với đúng một hành động chính, dừng poll, không lộ tên
provider hay lỗi thô. Copy tiếng Việt, `role="alert"`, focus nhìn thấy được, touch target ≥44px.
Action là `provide_transcript` nếu Story 2.7 đã tồn tại, `choose_another_video` nếu chưa.

### AC8 — Provenance đúng

Attempt record ghi `strategyId` và `provider` của strategy thật đã chạy, kể cả khi đó là fixture.
Không còn hard-code `provider: "supadata"` trong `recordFailure`.

### AC9 — Port không mang số hiệu story

`advanceStory21` đổi tên thành `beginTranscriptAcquisition`. Không phương thức nào trong domain port
mang số hiệu story.

### AC10 — Bảo mật và telemetry không đổi

RLS và owner-scoping giữ nguyên. RPC mới `revoke` khỏi `anon`/`authenticated`, chỉ `service_role`
execute được. Inngest step output và telemetry không chứa transcript text, tên provider thô hay lý do
lỗi của vendor.

### AC11 — Tests

Unit phủ orchestrator và terminal mapping; pgTAP phủ transition, idempotency, cross-owner và quota;
E2E phủ hết-strategy → màn hình terminal; watchdog có test riêng. CI không gọi provider thật.

## Tasks / Subtasks

- [ ] Migration và gate DB (AC: 1, 6, 10)
  - [ ] Thêm `TRANSCRIPT_UNAVAILABLE` vào tập safe error code hợp lệ
  - [ ] RPC `mark_transcript_exhausted(p_job_id, p_owner_user_id, p_reason)`, idempotent,
        `security definer`, `set search_path = public`
  - [ ] `revoke` khỏi `public, anon, authenticated`; `grant execute` cho `service_role`
  - [ ] pgTAP `supabase/tests/transcript_terminal.test.sql` viết **trước** phần TypeScript
- [ ] Contracts (AC: 1, 7)
  - [ ] `generationSafeErrorCodeSchema` thêm mã mới
  - [ ] `product-error.ts` thêm `transcriptUnavailable()` với `retryable: false`
- [ ] Ports (AC: 4, 9)
  - [ ] Đổi tên `advanceStory21` → `beginTranscriptAcquisition`
  - [ ] Thêm `markTranscriptExhausted` vào `GenerationJobRepository`
- [ ] Orchestrator (AC: 4)
  - [ ] Viết unit test trước — logic thuần, TDD phù hợp
  - [ ] `src/modules/transcript/application/transcript-strategy-orchestrator.ts`
  - [ ] Suy ra strategy đã thử từ `transcript_acquisition_attempts`
- [ ] Adapters (AC: 6, 8)
  - [ ] Sửa `AcquireNativeCaption.recordFailure` lấy provenance từ strategy instance
  - [ ] `SupabaseGenerationJobRepository` + `InMemoryGenerationJobRepository`:
        `markTranscriptExhausted`, giữ parity giữa hai bản
- [ ] Workflow (AC: 1, 2, 3)
  - [ ] Nhánh terminal sau acquisition và sau language gate
  - [ ] Bỏ biến `useGenerated` và mọi phân nhánh theo strategy ID
  - [ ] Inline dispatcher parity
- [ ] Watchdog (AC: 5)
  - [ ] Ngưỡng là hằng có tên + comment nguồn gốc
  - [ ] Idempotent với workflow
- [ ] UI (AC: 7)
  - [ ] Màn hình terminal, một hành động chính, dừng poll
- [ ] CI assertion cho AC3 (AC: 3)
- [ ] E2E và full CI (AC: 11)
- [ ] Staging run và thu bằng chứng

## Dev Notes

### Bối cảnh quan trọng trước khi sửa code

`persist_language_eligibility` **cố ý** đưa job về `acquiring_transcript` khi
`insufficient_evidence` (`supabase/migrations/20260804031500_create_language_eligibility.sql:308-316`),
để một transcript source khác được thử. Đó là thiết kế đúng. Vấn đề là chưa ai chạy lại. Đừng sửa
SQL đó; hãy để workflow hỏi orchestrator sau khi gate trả kết quả.

`activeGenerationJobStatuses` (`src/shared/contracts/generation.ts:36-50`) đã loại `failed`, nên AC6
là hệ quả của AC1 chứ không cần code riêng — nhưng vẫn cần test vì đó là lý do người dùng quan tâm.

Inngest event idempotency là **time-bounded**; Story 2.1 đã ghi nhận điều này và kết luận database
idempotency mới là authoritative (`2-1-tao-generation-job-ben-vung.md:80`). Đừng dựa vào event
idempotency để chống ghi terminal hai lần; dựa vào RPC idempotent.

### Quan hệ với PR #7

PR #7 (`story/2-4-hosted-generated-transcript`) đã làm: mở enum `transcriptStrategyIdSchema`, thêm
`costBand`, `PollableTranscriptStrategy`, bounded 202 polling, cost/duration policy, và handoff
`insufficient_evidence` → hosted generate. **Không làm lại những phần đó.**

PR #7 **chưa** làm: orchestrator thật (registry ở đó chỉ có `list()`/`find()`), terminal state, và
việc mở `provider` (vẫn là `z.literal("supadata")`, và #7 thêm một `check (provider = 'supadata')`
nữa trên `transcript_provider_jobs`).

Theo ADR-004, story này land trước trên `main` rồi #7 rebase lên. Trên `main` chỉ có một strategy nên
"exhausted" nghĩa là "native thất bại" — nhỏ và test được độc lập. Sau khi #7 rebase, điều kiện mở
rộng tự nhiên thành "orchestrator exhausted".

### Source tree cần chạm

```text
supabase/migrations/<new>_transcript_terminal.sql
supabase/tests/transcript_terminal.test.sql
src/shared/contracts/generation.ts
src/shared/errors/product-error.ts
src/modules/generation/ports/generation-job-repository.ts
src/modules/transcript/application/transcript-strategy-orchestrator.ts        (mới)
src/modules/transcript/application/transcript-strategy-orchestrator.test.ts   (mới)
src/modules/transcript/application/acquire-native-caption.ts
src/adapters/supabase/generation-job-repository.ts
src/adapters/fake/in-memory-generation-job-repository.ts
src/adapters/inngest/generate-lesson-workflow.ts
src/platform/generation/create-generation-runtime.ts
src/app/(protected)/jobs/[jobId]/_components/job-progress.tsx
tests/e2e/transcript-terminal.spec.ts                                          (mới)
```

### Testing standards

Fixtures/fakes cho mọi provider; không gọi live provider trong CI (NFR16). pgTAP chạy trên Postgres
thật trong CI job `database`. Viết test DB và test orchestrator **trước** phần implementation tương
ứng — cả hai là logic thuần, không phụ thuộc I/O.

### Project Structure Notes

Orchestrator thuộc `application/`, không thuộc `ports/`. `TranscriptStrategyRegistry` mà PR #7 đặt
trong `ports/transcript-strategy.ts` là một container type; phần quyết định thứ tự và exhaustion là
application logic và phải nằm ở `application/`, đúng quy tắc dependency hướng vào trong trong
`AGENTS.md`.

Không thêm bảng mới. Trạng thái đã thử suy ra từ `transcript_acquisition_attempts` đang có; đừng tạo
bảng theo dõi song song.

### References

- [Source: _bmad-output/planning-artifacts/architecture/decisions/ADR-004-transcript-orchestration-and-terminal-outcomes.md]
- [Source: _bmad-output/planning-artifacts/architecture/decisions/ADR-005-transcript-fallback-tiers-and-cost-routing.md]
- [Source: _bmad-output/planning-artifacts/repo-analysis-2026-08-05.md#13-recommended-next-story]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/LANGUAGE-ELIGIBILITY-AMENDMENT.md#terminal-unsupported-language-behavior]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md#id-12--canonical-lifecycle-and-producterror-actions]
- [Source: _bmad-output/planning-artifacts/epics/requirements-inventory.md] — FR31, FR32, FR33
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md#transcript-fallback-hierarchy]

## Test Matrix

| Lớp | Case |
|---|---|
| Unit orchestrator | trả `next` đúng thứ tự; `exhausted` khi hết; không lặp lại strategy đã terminal; bỏ qua strategy disabled; bỏ qua strategy bị policy từ chối mà không tính là thất bại |
| Unit terminal mapping | 4 loại `TranscriptStrategyResult` × (còn strategy / hết strategy) = 8 case |
| Unit language handoff | `insufficient_evidence` + còn strategy → tiếp tục; + hết strategy → `TRANSCRIPT_UNAVAILABLE` |
| Unit adapter | `provider`/`strategyId` trong attempt khớp strategy thật đã chạy, kể cả fixture |
| pgTAP | `acquiring_transcript` → `failed` + `TRANSCRIPT_UNAVAILABLE`; gọi lại idempotent; cross-owner ẩn; job `failed` không tính vào active quota |
| CI assertion | không code path nào ghi `currentStage` mô tả thất bại khi `status` non-terminal |
| E2E | `nocaption01` → màn hình terminal, poll dừng; `captionrate` → retry rồi terminal; video hợp lệ → không hồi quy |
| Watchdog | job đứng yên quá ngưỡng → `failed`; chạy hai lần không đổi kết quả |

## Definition of Done

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` xanh
- `supabase test db` xanh với pgTAP mới
- `pnpm test:e2e` xanh, có case hết-strategy → terminal
- Code review + adversarial review theo quy trình hiện tại
- **Staging evidence** (điều kiện mới so với các story trước):
  1. Video thật không caption → job `failed` trong <2 phút, kèm ảnh chụp UI
  2. Dòng `transcript_acquisition_attempts` với `result_kind` và latency thật
  3. Log Inngest cho thấy workflow kết thúc, không retry loop
  4. Xác nhận quota được giải phóng sau khi job vào `failed`
- `sprint-status.yaml` cập nhật (chỉ sau khi story được chấp nhận vào backlog)
- PR #7 rebase lên story này và mở rộng điều kiện exhausted

## Validation Record

Chưa chạy. Story cần `bmad-create-story` validation workflow sau khi ADR-004/ADR-005 được chấp nhận.

## Completion Record

Chưa bắt đầu.
