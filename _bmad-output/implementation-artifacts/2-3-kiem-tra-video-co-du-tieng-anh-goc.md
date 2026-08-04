# Story 2.3: Kiểm tra video có đủ tiếng Anh gốc

Status: done

## Story

As a người học đang chờ tạo bài,
I want Vidlish xác nhận video có đủ original English speech,
so that bài học chỉ dựa trên tiếng Anh thực sự được nói trong nguồn.

## Scope

- Gate bắt buộc chạy sau canonical transcript commit và trước mọi Lesson Engine stage.
- Detector dùng `franc-min@6.2.0` sau `LanguageAnalysisPort`; declared caption language không phải quyết định.
- Phân tích coherent windows và giữ raw detector score/rank như evidence, không gọi nó là xác suất.
- Versioned policy xét English share, longest coherent English duration, reliable English word count, detector coverage và evidence usability.
- Có hai đường eligible: English chiếm phần đủ lớn, hoặc một English portion dài/coherent tự nó đủ cho video mixed-language.
- Chỉ segment IDs thuộc reliable English windows được phép đi downstream.
- Insufficient evidence quay về transcript acquisition boundary; không trả unsupported-language chỉ vì transcript/detector yếu.
- Confirmed insufficient original English fail closed bằng `VIDEO_LANGUAGE_UNSUPPORTED`, action duy nhất `choose_another_video`.

## Initial Policy v1

- Main path: English share >= 0.55, coherent English >= 60 giây, reliable English >= 120 từ.
- Mixed-language path: English share >= 0.25, coherent English >= 180 giây, reliable English >= 300 từ.
- Evidence floor: reliable coverage >= 0.40, reliable analyzed words >= 100 và ít nhất 2 coherent windows.
- Các ngưỡng nằm trong typed config và được lưu cùng report version.

## Acceptance Criteria

1. CI chứng minh Lesson Engine không thể chạy trước eligible report.
2. Franc adapter map `eng → en`; short/ambiguous output thành `und` và không trình bày rank như calibrated probability.
3. Report liên kết transcript hash, detector/policy version, aggregate metrics, content-safe per-window evidence và segment sets.
4. Isolated English words, names, brands và code-switch ngắn không đủ.
5. Eligible mixed-language chỉ cho phép reliable English segments downstream.
6. Eligible commit chuyển job sang `analyzing_video` idempotently.
7. Confirmed insufficient English chuyển job `failed`, code `VIDEO_LANGUAGE_UNSUPPORTED`, action `choose_another_video`.
8. Low-confidence/insufficient evidence chuyển về `acquiring_transcript`, không tạo language error.
9. RLS, no transcript text telemetry và fixture matrix đầy đủ.

## Tasks

- [x] Add language-analysis and eligibility report contracts.
- [x] Add `LanguageAnalysisPort` and Franc adapter with coherent window builder.
- [x] Add versioned policy evaluator and fixtures.
- [x] Add report/eligible-segment persistence, RLS and atomic lifecycle RPC.
- [x] Extend generation workflow and failed-language UX.
- [x] Add detector, policy, workflow, SQL/RLS and E2E regression tests.
- [x] Run targeted checks and one final full CI before merge.

## Validation Record

- Result: PASS.
- No translation mode or generated-English substitute is introduced.
- Story does not begin Lesson Engine analysis; it only unlocks `analyzing_video` after an eligible report is committed.
- Raw Franc evidence is stored without transcript text; every referenced segment is validated against the canonical transcript.

## Completion Record

- PR: #6 — `Story 2.3: Original-English eligibility gate`.
- Squash merge: `eb94ed20e433decdd1fd6bda15f96806e5e9c6ff`.
- Final CI: run `30879262705`; quality, Chromium journeys and Supabase migration/RLS jobs passed.
- Adversarial review fixes: restored complete public job/transcript boundaries, database-authoritative retries, content-safe Inngest step output, auditable per-window Franc evidence, transcript-bound segment validation and full permitted/excluded coverage.
- Open findings: none.
