# Vidlish MVP PRD Review

**Ngày:** 2026-08-03  
**Artifact:** `prd.md`  
**Verdict:** **PASS — PRD đủ rõ để chuyển sang UX và Architecture. Chưa được viết code trước Implementation Readiness.**

## 1. Decision readiness

Các blocker của draft đầu đã được giải quyết:

1. **Authentication:** bắt buộc đăng nhập trước generation.
2. **Release mode:** private beta.
3. **Video length:** không dùng trần thời lượng cố định ở cấp sản phẩm; dùng budget, chunking, async processing và lesson series.
4. **Transcript retention:** lưu normalized segments; không lưu video; audio chỉ tạm thời và bị xóa theo retention.
5. **Caption policy:** chấp nhận manual, auto-caption và STT, giữ source/confidence.
6. **No-caption behavior:** chuyển sang acquisition fallback; không kết thúc flow.
7. **Lesson quality:** dùng Lesson Engine multi-stage với deterministic hard gates và quality rubric.

## 2. Scope integrity

**PASS.** MVP vẫn phục vụ đúng vòng cốt lõi:

`input video → acquire/create transcript → generate grounded lesson → learn → save/open/delete`.

STT/tab-audio được thêm như transcript fallback bắt buộc để bảo vệ lời hứa sản phẩm, không phải một sản phẩm phát âm hoặc media downloader mới. Extension và desktop companion không phải deliverable MVP.

## 3. Requirement quality

**PASS.** PRD có 41 functional requirements, phân tách rõ:

- auth/ownership;
- video/metadata;
- transcript acquisition waterfall;
- transcript normalization/retention;
- Lesson Engine;
- deterministic validation/quality gate;
- generation jobs;
- Lesson Viewer;
- Library.

Provider/framework specifics được giữ ở Addendum và chuyển cho Architecture.

## 4. Lesson Engine alignment

**PASS.** PRD bắt buộc downstream đọc `SPEC-vidlish-lesson-engine` và companions. Các invariant chính đã được phản ánh:

- Core Lesson 10–20 phút;
- activation → gist → noticing → practice → retrieval → transfer → reflection;
- CEFR personalization thực chất;
- flexible item counts;
- segment-ID grounding;
- multi-stage generation;
- provider independence;
- 14/16 quality threshold;
- grounding và exercise validity là hard gates;
- golden regression benchmark.

## 5. Metrics quality

**PASS cho private beta.** Metrics đo cả coverage và chất lượng:

- transcript acquisition coverage;
- grounded lesson rate;
- exercise validity;
- golden lesson quality;
- core-loop completion;
- provider fallback resilience.

Counter-metrics ngăn hệ thống đánh đổi quyền, quality hoặc teaching value để lấy coverage/speed.

## 6. Legal, privacy và safety

**PASS có điều kiện phát hành:**

- Controlled private beta được phép tiếp tục với quota và retention rõ.
- Public launch bị chặn cho tới khi hoàn thành Privacy Policy, Terms of Use, data retention review, provider terms review và disclosure về AI-generated educational content.
- UX phải thể hiện consent rõ khi tab-audio capture hoặc upload media.

## 7. Architecture handoff questions

Các mục sau không chặn PRD final nhưng Architecture phải chốt khi có tài khoản/chi phí:

- Gemini model/API key và budget.
- Transcript/STT provider shortlist.
- Hosting, database/auth và background-job mechanism.
- Technical token/cost/concurrency limits.
- Audio/transcript retention TTL cụ thể.
- Quota per account/day và cost ceiling/job.

## 8. Gate result

- PRD authoring: **complete**.
- PRD status: **final**.
- Research alignment: **complete**.
- Lesson Engine Spec alignment: **complete**.
- UX allowed: **yes**.
- Architecture allowed: **after UX or in parallel only where UX-independent**.
- Code allowed: **no**.
- Next workflow: `bmad-ux`.
