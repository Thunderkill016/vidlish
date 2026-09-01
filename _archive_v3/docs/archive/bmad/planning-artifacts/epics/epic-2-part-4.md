# Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án (phần 4)

Companion tiếp nối `epic-2-part-3.md`, gồm Stories 2.11–2.13.

## Story 2.11 — Dọn artifact tạm và áp dụng transcript retention

**As a** người học,  
**I want** audio/upload tạm và transcript phụ thuộc được giữ đúng thời hạn,  
**So that** Vidlish bảo vệ dữ liệu của tôi mà vẫn mở lại lesson đã lưu được.

**Requirements:** FR13, FR31–FR33 · NFR2–4, NFR7–8, NFR15, NFR21 · AD-2, AD-8, AD-13, AD-16, AD-20 · UX-DR5, UX-DR14, UX-DR26–28, UX-DR31–32.

### Acceptance Criteria

#### AC1 — Immediate cleanup triggers

**Given** temporary audio/upload artifact tồn tại  
**When** canonical transcript commit, job failure, cancellation hoặc explicit deletion xảy ra  
**Then** cleanup được enqueue/execute idempotently  
**And** source video không được lưu  
**And** raw audio không phụ thuộc published lesson retention.

#### AC2 — TTL sweeper

**Given** orphaned/expired temporary artifact  
**When** scheduled sweeper chạy  
**Then** xóa object và stale manifest/chunk metadata  
**And** cleanup retry có bounded backoff  
**And** persistent failure phát internal alert  
**And** cross-owner object không thể được browser đọc.

#### AC3 — Transcript dependency policy

**Given** canonical transcript được lesson/job tham chiếu  
**When** retention evaluator chạy  
**Then** giữ transcript cần thiết để reopen immutable lesson  
**And** xóa khi không còn dependency và policy cho phép  
**And** temporary audio luôn được xử lý riêng  
**And** deletion/retention operation có audit metadata không chứa content body.

#### AC4 — Privacy and account copy

**Given** retention behavior đã tồn tại  
**When** account menu/privacy surface hiển thị  
**Then** giải thích Vidlish không lưu video, audio chỉ tạm thời và transcript được giữ để mở lại lesson theo policy  
**And** copy không hứa legal guarantee chưa được review  
**And** Story 1.1 không phụ thuộc surface này.

#### AC5 — Owner authorization and RLS

**Given** cleanup/retention command  
**When** xử lý  
**Then** owner/dependency checks chạy server-side  
**And** browser không trực tiếp purge canonical records  
**And** service-role chỉ dùng trong authorized workflow  
**And** RLS/storage policy chặn cross-owner access.

#### AC6 — Failure-safe deletion state

**Given** dependency cleanup thất bại  
**When** user đã yêu cầu xóa  
**Then** resource không được tuyên bố deleted hoàn tất  
**And** chuyển pending-deletion/tombstone khi cần  
**And** retry background tiếp tục  
**And** item không mở như usable lesson.

#### AC7 — Telemetry redaction

**Given** cleanup/retention lifecycle  
**When** logs ghi  
**Then** chỉ ghi safe IDs, trigger, object class, result, retry và latency  
**And** không ghi transcript text, filenames chưa sanitize hoặc audio bytes.

#### AC8 — Tests

**Given** Story 2.11 vào CI  
**When** suite chạy  
**Then** có immediate cleanup, TTL/orphan sweeper, retry/alert, dependency retention, pending deletion, RLS/storage, privacy-copy and idempotency tests.

## Story 2.12 — Ghi telemetry an toàn và cô lập environment

**As a** product team vận hành private beta,  
**I want** quan sát pipeline mà không lộ nội dung và không trộn environment,  
**So that** lỗi/chi phí được chẩn đoán an toàn.

**Requirements:** FR31–FR33 · NFR1, NFR3, NFR7, NFR9, NFR15–18 · AD-14, AD-16, AD-18, AD-19 · ID-10 · UX-DR27, UX-DR32.

### Acceptance Criteria

#### AC1 — Canonical telemetry schema

**Given** job/stage/strategy/chunk/eligibility/cleanup event  
**When** telemetry emit  
**Then** schema versioned và gồm safe job ID, pseudonymous owner, phase, strategy/provider/model version, result, latency, retries, coverage, cost/token bands và quality outcome khi relevant  
**And** event validation fail closed.

#### AC2 — Content redaction

**Given** telemetry/logging  
**When** payload dựng  
**Then** không chứa transcript text, audio bytes, full prompt, auth token, API key, raw provider payload hoặc private reflection  
**And** redaction tests chạy trong CI.

#### AC3 — Environment isolation

**Given** local, staging và production  
**When** config load  
**Then** dùng riêng Supabase project/database, Inngest environment, buckets, quotas và provider credentials  
**And** typed config validate startup  
**And** preview/local không có production secret.

#### AC4 — Fixture-first local/CI

**Given** local/CI mặc định  
**When** test/build chạy  
**Then** dùng fixture adapters  
**And** không gọi live Supadata, YouTube, Gemini, Google STT hoặc unofficial extractor  
**And** provider-dependent staging path chỉ bật khi credential/config tương ứng tồn tại.

#### AC5 — Diagnostics access

**Given** internal diagnostics  
**When** authorized operator xem  
**Then** chỉ safe metadata/provenance được hiển thị  
**And** learner UI không lộ provider IDs, request IDs, repair logs hoặc raw scores  
**And** access được audit.

#### AC6 — Cost and reliability views

**Given** private-beta telemetry  
**When** aggregate  
**Then** team so sánh coverage, latency, failure, retry, cost band và cleanup status theo strategy/version  
**And** không cần content body để điều tra  
**And** metrics không trở thành learner dashboard.

#### AC7 — Tests

**Given** Story 2.12 vào CI  
**When** suite chạy  
**Then** có telemetry schema/redaction, environment config, no-live-provider, production-secret absence, diagnostics authorization and aggregation tests.

## Story 2.13 — Diễn tập backup/restore và khóa Epic 2 regression

**As a** product team chuẩn bị vận hành,  
**I want** dữ liệu bền vững có thể khôi phục và mọi transcript path tuân cùng invariants,  
**So that** private beta không dựa trên pipeline chưa được kiểm chứng.

**Requirements:** FR6–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5 · NFR7–9, NFR15–20 · AD-2–11, AD-13–21 · UX-DR9–14, UX-DR27–32.

### Acceptance Criteria

#### AC1 — Backup scope

**Given** managed backup/restore plan  
**When** scope được định nghĩa  
**Then** bao phủ jobs, canonical transcripts, segments, acquisition provenance và eligibility reports  
**And** temporary audio không phải durable backup dependency  
**And** secrets không nằm trong database backup artifact.

#### AC2 — Restore rehearsal

**Given** isolated non-production environment  
**When** rehearsal chạy  
**Then** restore được owner-scoped jobs/transcripts/eligibility và referential integrity  
**And** documented RPO/RTO observation được ghi  
**And** restore không gửi provider events hoặc re-run jobs ngoài ý muốn.

#### AC3 — Public-launch boundary

**Given** private beta nội bộ  
**When** Story 2.13 hoàn tất  
**Then** regression/recovery floor được đáp ứng  
**And** final public-launch Privacy Policy, Terms và legal review vẫn là release gate riêng  
**And** không tuyên bố public-ready chỉ từ technical rehearsal.

#### AC4 — Cross-source regression

**Given** caption, hosted generate, Gemini URL, pasted/uploaded và tab-audio fixtures  
**When** Epic 2 regression chạy  
**Then** mọi success path đi candidate validation → normalization → canonical persistence → `checking_language`  
**And** provider không bỏ qua language gate  
**And** no translation/generated-English substitute pass.

#### AC5 — Terminal/recoverable state regression

**Given** representative failures  
**When** suite chạy  
**Then** phân biệt methods exhausted, awaiting input, low-confidence recovery, quota/rate limit, cancelled và `VIDEO_LANGUAGE_UNSUPPORTED`  
**And** reload/retry giữ đúng persisted state/action  
**And** unsupported language chỉ xuất hiện sau transcript + reliable eligibility conclusion.

#### AC6 — Long-video and cleanup regression

**Given** long-source/capture fixtures  
**When** suite chạy  
**Then** no silent truncation, deterministic chunk plan, coverage validation, per-chunk retry, temporary artifact deletion và retention dependency đều pass.

#### AC7 — Release artifact

**Given** regression/rehearsal hoàn tất  
**When** report tạo  
**Then** ghi versions, cases, pass/fail, safe diagnostics và unresolved external-account blockers  
**And** không chứa full transcript/prompt/secrets  
**And** failure chặn Epic 2 completion.

Epic 2 hoàn tất khi job có một trong các durable outcomes: eligible canonical English source tại `analyzing_video`, recoverable wait/action state, hoặc chính xác terminal/cancelled state.