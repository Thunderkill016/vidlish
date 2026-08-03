# AGENTS.md

## Vai trò của Codex trong dự án

Vidlish sử dụng BMAD Method theo **Full BMad greenfield track**. `IDEA.md` là nguồn ý tưởng ban đầu; các artifact BMAD đã final và `project-context.md` là nguồn yêu cầu, kiến trúc và invariant trực tiếp cho downstream workflows.

## Trạng thái hiện tại

- BMAD Method 6.10.0 đã được cài cho Codex.
- Project context bắt buộc:
  `project-context.md`
- PRD đã `final`:
  `_bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md`
- PRD language amendment:
  `_bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/language-eligibility-amendment.md`
- UX đã `final`:
  - `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/DESIGN.md`
  - `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md`
  - `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/language-eligibility-amendment.md`
- Lesson Engine SPEC:
  `_bmad-output/specs/spec-vidlish-lesson-engine/SPEC.md`
- Lesson Engine language companion:
  `_bmad-output/specs/spec-vidlish-lesson-engine/language-eligibility.md`
- Architecture spine đã `final`:
  `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md`
- Architecture language amendment:
  `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/language-eligibility-amendment.md`
- Product code và Next.js scaffold **chưa được tạo**.
- Workflow tiếp theo: `bmad-create-epics-and-stories`.

## Invariant nguồn tiếng Anh

Vidlish chỉ tạo bài học từ lời nói tiếng Anh thực sự tồn tại trong video nguồn.

```text
Có đủ lời nói tiếng Anh gốc và đáng tin cậy → tiếp tục Lesson Engine.
Không đủ tiếng Anh → VIDEO_LANGUAGE_UNSUPPORTED → chọn video khác.
```

Bắt buộc:

- Detect language sau transcript normalization và trước Lesson Engine.
- Mixed-language chỉ được dùng khi phần tiếng Anh tự nó đủ tạo một Core Lesson hợp lệ.
- Non-English segments không được làm source quote, listening evidence, grammar evidence hoặc scored evidence.
- Không dịch video không phải tiếng Anh để tạo lesson.
- Không tạo English TTS/dub/learning track thay thế audio gốc.
- Không trình bày generated English như lời nói trong video.

## Quy tắc làm việc

1. Trước mọi planning/implementation task, đọc `project-context.md`, PRD final + amendment, UX spines + amendment, Lesson Engine SPEC cùng companions và Architecture Spine + amendment.
2. `project-context.md` và language eligibility amendments thắng nếu artifact cũ còn câu chữ rộng hơn hoặc mâu thuẫn.
3. Architecture Decision `AD-*` và amendment AD-22 là invariant bắt buộc; không được âm thầm thay đổi hoặc làm yếu đi trong epic, story hay code.
4. Ưu tiên các skill trong `.agents/skills/` và đúng chuỗi BMAD.
5. Không tự mở rộng MVP ngoài vòng giá trị:
   `nhập video tiếng Anh → lấy/tạo transcript tiếng Anh gốc → tạo bài học → học → lưu/mở lại/xóa`.
6. Tự đưa ra giả định cho chi tiết nhỏ và ghi lại trong artifact sở hữu quyết định đó.
7. Chỉ hỏi product owner về quyết định sản phẩm lớn, pháp lý, API key, tài khoản, nhà cung cấp có chi phí hoặc thanh toán.
8. Không viết code hoặc scaffold ứng dụng trước khi:
   - `bmad-create-epics-and-stories` hoàn tất;
   - `bmad-check-implementation-readiness` đạt;
   - `bmad-sprint-planning` hoàn tất;
   - story hiện tại được create và validate.
9. Lưu planning artifact trong `_bmad-output/planning-artifacts/` và implementation artifact trong `_bmad-output/implementation-artifacts/`.
10. Giao tiếp với product owner bằng tiếng Việt; code, identifier và tài liệu kỹ thuật có thể dùng tiếng Anh.
11. Không sửa tay artifact có memlog làm nguồn quyết định; cập nhật qua workflow sở hữu artifact đó.
12. Không gọi provider thật trong unit test hoặc CI mặc định. Dùng fixtures/fakes theo Architecture AD-19.
13. Không đưa API key, service-role key, transcript đầy đủ hoặc prompt chứa transcript vào log hoặc client bundle.

## Chuỗi workflow bắt buộc

```text
IDEA.md
→ bmad-prd                       [done]
→ bmad-ux                        [done]
→ bmad-architecture              [done]
→ language eligibility amendment [done]
→ bmad-create-epics-and-stories  [next]
→ bmad-check-implementation-readiness
→ bmad-sprint-planning
→ bmad-create-story:create
→ bmad-create-story:validate
→ bmad-dev-story
→ bmad-code-review
```

## Hành động tiếp theo

Chạy `bmad-create-epics-and-stories` với các nguồn bắt buộc:

1. `project-context.md`.
2. PRD final và `language-eligibility-amendment.md`.
3. UX `DESIGN.md`, `EXPERIENCE.md` và UX language amendment.
4. Lesson Engine `SPEC.md`, toàn bộ companions và `language-eligibility.md`.
5. `ARCHITECTURE-SPINE.md`, architecture memlog và architecture language amendment.
6. Không tạo story implementation trước khi epic map đã truy vết toàn bộ FR, CAP, AD và language eligibility gate.