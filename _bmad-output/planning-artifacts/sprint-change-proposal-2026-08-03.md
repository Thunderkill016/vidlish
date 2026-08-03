---
status: awaiting-approval
project: Vidlish
date: 2026-08-03
changeScope: moderate
mode: batch
trigger: implementation-readiness-report-2026-08-03.md
---

# Sprint Change Proposal — Khóa planning trước implementation

## 1. Issue Summary

Implementation Readiness đã xác nhận PRD, Architecture, UX và backlog bao phủ đủ **46/46 Functional Requirements**, nhưng đánh giá tổng thể là `NEEDS WORK` vì 13 điểm làm development agent phải tự đoán hoặc chọn giữa các nguồn mâu thuẫn.

Đây không phải thay đổi product scope. Trigger là lỗi precision trong planning:

- canonical story và clarification không đồng nhất;
- UX chưa phản ánh language-eligibility amendment;
- các adapter đầu tiên chưa được chọn;
- ba story chứa nhiều delivery unit độc lập;
- CI và account-menu ownership chưa rõ;
- AC IDs không đồng nhất.

Không có product code hoặc sprint plan cần rollback.

## 2. Change Navigation Checklist

### 2.1 Trigger and context

- [N/A] 1.1 — Không có triggering implementation story; vấn đề được phát hiện bởi Implementation Readiness trước Sprint Planning.
- [x] 1.2 — Loại vấn đề: misunderstanding/ambiguity và artifact drift, không phải strategic pivot.
- [x] 1.3 — Evidence: readiness report liệt kê 3 UX issues, 7 major backlog issues và 3 minor concerns.

### 2.2 Epic impact

- [x] 2.1 — Cả năm epic vẫn hoàn thành được theo outcome ban đầu.
- [x] 2.2 — Không đổi epic scope; Epic 2 và Epic 3 được tách story nhỏ hơn.
- [x] 2.3 — Epic 1–5 đều cần reference/index refresh; behavior chính không đổi.
- [x] 2.4 — Không epic nào obsolete; không cần epic mới.
- [x] 2.5 — Epic order giữ nguyên: `1 → 2 → 3`, sau đó `3 → 4` và `3 → 5`.

### 2.3 Artifact impact

- [x] 3.1 — PRD không cần sửa; original-English amendment vẫn là product authority.
- [x] 3.2 — Architecture cần một implementation-decision companion và cập nhật companion references.
- [x] 3.3 — `DESIGN.md` và `EXPERIENCE.md` cần ba language-state corrections cùng account-menu ownership correction.
- [x] 3.4 — Epics, Story Coverage Matrix, implementation clarifications và final validation cần đồng bộ; minimum CI baseline được thêm vào Story 1.1.

### 2.4 Path evaluation

- [x] 4.1 — **Direct Adjustment: viable.** Effort: Medium. Risk: Low.
- [N/A] 4.2 — Rollback không có giá trị vì product code/sprint chưa bắt đầu.
- [N/A] 4.3 — PRD MVP review không cần thiết; core scope vẫn khả thi.
- [x] 4.4 — Chọn Direct Adjustment vì giữ business value, không tăng product scope và loại rework trước khi code.

### 2.5 Proposal and handoff

- [x] 5.1–5.4 — Issue, impact, approach và action plan được ghi trong tài liệu này.
- [x] 5.5 — Scope `Moderate`; backlog/artifact corrections do PM/Architect/PO workflow thực hiện, sau đó IR kiểm tra lại.

### 2.6 Final review

- [x] 6.1–6.2 — Proposal đã kiểm tra consistency và sequencing.
- [!] 6.3 — Đang chờ user approval.
- [N/A] 6.4 — Chưa có `sprint-status.yaml` vì Sprint Planning chưa chạy.
- [!] 6.5 — Handoff cuối được xác nhận sau approval và sửa artifact.

## 3. Impact Analysis

### Epic impact

- **Epic 1:** sửa auth/beta decisions, metadata adapter, CI baseline và action của Story 1.3.
- **Epic 2:** giữ outcome; tách provider strategies và operational hardening thành story nhỏ; chọn concrete adapters.
- **Epic 3:** tách atomic publish khỏi Lesson Viewer.
- **Epic 4:** chỉ đổi dependency reference từ published persistence/viewer mới; behavior giữ nguyên.
- **Epic 5:** sửa stale deletion/tombstone references; behavior giữ nguyên.

### PRD impact

Không đổi FR, NFR, success metric, MVP boundary hoặc non-goals.

### Architecture impact

Tạo normative companion `IMPLEMENTATION-DECISIONS.md` và thêm vào source lists. Companion chốt implementation seed nhưng không thay domain ports:

1. **Authentication:** Supabase email OTP sáu chữ số; không dùng magic link trong MVP.
2. **Private beta:** Postgres `beta_access` owner-independent allowlist; chỉ admin/service-role hoặc reviewed migration được chỉnh. App route và protected routes kiểm tra allowlist; response đăng nhập trung tính.
3. **Metadata/playability:** YouTube Data API v3 `videos.list` với `snippet`, `contentDetails`, `status`; dùng `embeddable`, privacy/upload status và region restriction để map canonical availability.
4. **Caption fast path:** Supadata universal transcript API `mode=native`, `text=false`, không gọi translation endpoint và không ép `lang=en`. Strategy ID `supadata-native-caption`.
5. **Hosted generated transcript fallback:** Supadata `mode=generate`, strategy ID `supadata-generated-transcript`; output vẫn qua normalization và language gate.
6. **Language analysis:** local `franc-min@6.2.0` adapter. Short/ambiguous segments được gắn `und`/low reliability; evaluator dùng coherent windows và fail closed, không coi detector distance là calibrated probability.
7. **Gemini public-URL transcription:** exact stable model `gemini-3.6-flash`; strategy disabled when `GEMINI_API_KEY` absent; prompt/output contract yêu cầu verbatim original speech, không translation/rewrite.
8. **Tab-audio STT:** Google Cloud Speech-to-Text V2 model `chirp_3`, initial location `asia-southeast1`, bounded audio chunks and timestamps when supported.
9. **Unofficial extractor:** disabled by default; optional private-beta story remains blocked until explicit legal/policy approval and package selection. Nó không chặn private-beta acceptance vì hosted/Gemini/tab-audio paths tồn tại.
10. **Environment behavior:** local/CI use fixtures; staging story DoD requiring an external adapter is blocked until its credential exists. No production secret is required for Story 1.1 scaffold.

### UX impact

- Canonical tagline becomes **“Any English video. Your English lesson.”**
- Generation phase vocabulary adds **`Kiểm tra tiếng Anh`** after transcript normalization.
- State table adds `VIDEO_LANGUAGE_UNSUPPORTED`, preferred Vietnamese copy and the sole primary action `Chọn video khác`; no translation mode.
- Account menu in Story 1.1 contains sign-out only. Quota summary is introduced with quota story; privacy/retention explanation with retention story. Beta feedback link is deferred unless a later requirement assigns it.

### Technical/deployment impact

No code exists. The changes reduce implementation ambiguity. External account setup is made explicit rather than silently delegated to the dev agent.

## 4. Recommended Approach

### Selected path

**Direct Adjustment within the existing PRD and epic structure.**

### Effort and risk

- Planning correction effort: Medium.
- Product-scope change: None.
- Technical risk after correction: Low to Medium, concentrated in external provider behavior.
- Timeline impact: one correction + readiness cycle before Sprint Planning; implementation backlog grows from 24 to 29 smaller stories.

### Why alternatives are rejected

- **Rollback:** no implementation exists.
- **MVP reduction:** not necessary; all core capabilities remain feasible.
- **Proceed as-is:** creates avoidable rework and inconsistent UX/provider choices.

## 5. Detailed Change Proposals

### 5.1 Story 1.1 — auth, beta and CI

**OLD**

```text
Supabase gửi passwordless OTP hoặc magic link.
CI chỉ được mô tả gián tiếp qua việc test suite chạy.
```

**NEW**

```text
MVP dùng email OTP sáu chữ số duy nhất.
Allowlisted email được kiểm tra bằng beta_access trước app access.
Pull request CI bắt buộc: pnpm install --frozen-lockfile, typecheck, lint, unit/integration tests và production build.
Preview deployment chưa bắt buộc ở Story 1.1.
```

**Rationale:** loại auth fork, khóa beta administration và tạo greenfield quality floor.

### 5.2 Story 1.2 — metadata adapter

**OLD**

```text
VideoMetadataProvider không có initial implementation được chọn.
```

**NEW**

```text
Initial adapter: YouTube Data API v3 videos.list.
Canonical mapping dùng snippet/contentDetails/status và không render provider object.
Fixture adapter vẫn là CI default.
```

**Rationale:** Story 1.2 có real staging path nhưng domain vẫn provider-neutral.

### 5.3 Story 1.3 — primary action contradiction

**OLD**

```text
AC5 bật nút Tạo bài học.
AC8 cấm tạo generation job.
```

**NEW**

```text
Trước Story 2.1, primary action là Xác nhận lựa chọn.
Kết quả hiển thị Sẵn sàng tạo bài học và giữ validated draft trong Create flow.
Story 2.1 mới thay action này bằng Tạo bài học và persist job.
```

**Rationale:** story standalone, không dead CTA hoặc forward dependency.

### 5.4 Story 2.2 — real caption fast path

**OLD**

```text
Caption strategy contract tồn tại nhưng không có initial adapter.
```

**NEW**

```text
Initial caption strategy là supadata-native-caption dùng mode=native, timestamped chunks và không translation endpoint.
Adapter vẫn qua TranscriptStrategy port và Zod boundary.
```

**Rationale:** Story 2.2 có end-to-end user outcome độc lập.

### 5.5 Story 2.3 — references và detector

**OLD**

```text
Requirements chứa AD-22 không tồn tại.
Language detector chưa được chọn.
```

**NEW**

```text
Reference: architecture language amendment + AR7, AR13, AR14, AR22.
Initial detector: FrancLanguageAnalysisAdapter dùng franc-min@6.2.0, coherent windows, und/low-reliability fail-closed behavior.
```

**Rationale:** loại reference invalid và khóa implementation path không cần cloud credential.

### 5.6 Split Story 2.4

**OLD**

```text
2.4 = hosted provider + unofficial extractor + Gemini URL/audio + cost/retry/circuit + provenance/security/telemetry.
```

**NEW**

```text
2.4 — Lấy transcript qua hosted generated-transcript provider
      Initial adapter: Supadata mode=generate.
2.5 — Tích hợp unofficial extractor theo policy
      Optional, disabled and blocked until approval/package selection.
2.6 — Tạo transcript từ public YouTube URL bằng Gemini
      Initial exact model: gemini-3.6-flash.
```

Shared quota, cost, retry classification and circuit behavior move to revised Story 2.10; each adapter story retains only local timeout/schema/error mapping needed for its own boundary.

### 5.7 Renumber remaining Epic 2 stories

```text
Old 2.5 → New 2.7  User-provided transcript/subtitle
Old 2.6 → New 2.8  Tab audio + Cloud STT chirp_3
Old 2.7 → New 2.9  Long-video budget/chunking
Old 2.8 → New 2.10 Quota/retry/cancellation
```

### 5.8 Split old Story 2.9

**OLD**

```text
cleanup + retention + telemetry + environment isolation + backup/restore + full Epic 2 regression
```

**NEW**

```text
2.11 — Temporary artifact cleanup and transcript retention
2.12 — Safe telemetry and environment isolation
2.13 — Backup/restore rehearsal and Epic 2 release regression
```

Public-launch-only backup/legal gates remain late backlog items and do not block Story 1.1.

### 5.9 Split Story 3.6

**OLD**

```text
3.6 = relational immutable lesson persistence + atomic publish + full Lesson Viewer.
```

**NEW**

```text
3.6 — Publish nguyên tử và lưu immutable lesson version
3.7 — Hiển thị readable responsive Lesson Viewer
```

Story 3.7 consumes seeded/published fixtures from 3.6. Timestamp references remain non-interactive until Story 4.1.

### 5.10 Clarification and entity timing

**OLD**

```text
Clarification says Story 3.5 publishes/renders and Story 5.2 owns deletion/tombstone.
```

**NEW**

```text
Story 3.6 owns lesson identity/version/published pointer.
Story 3.7 owns viewer presentation.
Story 5.3 owns deletion/tombstone state.
```

### 5.11 Acceptance criteria IDs

All canonical stories use stable `AC1`, `AC2`, ... headings. Renumbered/new stories receive fresh IDs; unchanged behavior is not rewritten semantically.

### 5.12 Story 1.1 CI baseline

Add a GitHub Actions pull-request workflow requirement for install, typecheck, lint, unit/integration tests and build. Branch protection/preview deployment can be configured later and are not claimed before repository settings exist.

### 5.13 Account-menu ownership

- Story 1.1: sign out only.
- Story 2.10: quota summary when quota data exists.
- Story 2.11: privacy/retention explanation when policy and cleanup behavior exist.
- Beta feedback link: deferred; no unowned MVP UI.

## 6. Revised Backlog Shape

```text
Epic 1: 3 stories
Epic 2: 13 stories
Epic 3: 7 stories
Epic 4: 3 stories
Epic 5: 3 stories
Total: 29 stories
```

Hard dependency graph is unchanged.

## 7. Artifacts to Modify After Approval

1. `architecture/.../IMPLEMENTATION-DECISIONS.md` — create.
2. `architecture/.../ARCHITECTURE-SPINE.md` — add companion/decision authority reference only where needed.
3. `ux-designs/.../DESIGN.md` — tagline correction.
4. `ux-designs/.../EXPERIENCE.md` — language phase/state and account-menu ownership.
5. `epics/epic-1.md` — Stories 1.1–1.3 corrections.
6. `epics/epic-2.md`, `epic-2-part-2.md`, `epic-2-part-3.md` plus new shard if needed — split/renumber/AC IDs.
7. `epics/epic-3.md` — split 3.6/3.7 and AC IDs.
8. `epics/epic-4.md`, `epic-5.md` — AC IDs and updated references.
9. `epics/implementation-clarifications.md` — corrected story numbers and entity timing.
10. `epics.md` — source list, counts, coverage matrix, story index and anchors.
11. `epics/final-validation.md` — replace stale 24-story validation with corrected 29-story validation.
12. `project-context.md` — next workflow becomes re-run IR after correction.

PRD remains untouched.

## 8. Implementation Handoff

### Scope classification

**Moderate** — backlog reorganization and architecture/UX decision cleanup; no strategic replan.

### Handoff

- **PM/Architect/PO workflow:** apply artifact edits and validate requirement traceability.
- **Implementation Readiness:** run again using the corrected canonical set.
- **Sprint Planning:** only after IR returns `READY`/PASS.
- **Developer agent:** starts Story 1.1 only after Sprint Planning creates implementation artifacts.

### Success criteria

- No contradictory CTA or stale story number remains.
- All architecture references resolve.
- Initial adapter/auth decisions are explicit and versioned.
- Every story fits one delivery/review unit.
- 46/46 FR and 21/21 NFR remain covered.
- UX uses the original-English promise and language-check state.
- Re-run Implementation Readiness returns PASS.

## 9. Approval Gate

No planning artifact listed in Section 7 will be modified until this proposal receives explicit approval.
