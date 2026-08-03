# AGENTS.md

## Vai trò của Codex trong dự án

Vidlish sử dụng BMAD Method theo **Full BMad greenfield track**. `IDEA.md` là nguồn ý tưởng ban đầu; các artifact BMAD đã final là nguồn yêu cầu và kiến trúc trực tiếp cho downstream workflows.

## Trạng thái hiện tại

- BMAD Method 6.10.0 đã được cài cho Codex.
- PRD đã `final`:
  `_bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md`
- UX đã `final`:
  - `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/DESIGN.md`
  - `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md`
- Lesson Engine SPEC:
  `_bmad-output/specs/spec-vidlish-lesson-engine/SPEC.md`
- Architecture spine đã `final`:
  `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md`
- Architecture readiness review:
  `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/review-architecture-readiness.md`
- Product code và Next.js scaffold **chưa được tạo**.
- Workflow tiếp theo: `bmad-create-epics-and-stories`.

## Quy tắc làm việc

1. Trước mọi planning/implementation task, đọc PRD final, UX spines, Lesson Engine SPEC cùng companions và Architecture Spine.
2. Architecture Decision `AD-*` là invariant bắt buộc; không được âm thầm thay đổi hoặc làm yếu đi trong epic, story hay code.
3. Ưu tiên các skill trong `.agents/skills/` và đúng chuỗi BMAD.
4. Không tự mở rộng MVP ngoài vòng giá trị:
   `nhập video → lấy/tạo transcript → tạo bài học → học → lưu/mở lại/xóa`.
5. Tự đưa ra giả định cho chi tiết nhỏ và ghi lại trong artifact sở hữu quyết định đó.
6. Chỉ hỏi product owner về quyết định sản phẩm lớn, pháp lý, API key, tài khoản, nhà cung cấp có chi phí hoặc thanh toán.
7. Không viết code hoặc scaffold ứng dụng trước khi:
   - `bmad-create-epics-and-stories` hoàn tất;
   - `bmad-check-implementation-readiness` đạt;
   - `bmad-sprint-planning` hoàn tất;
   - story hiện tại được create và validate.
8. Lưu planning artifact trong `_bmad-output/planning-artifacts/` và implementation artifact trong `_bmad-output/implementation-artifacts/`.
9. Giao tiếp với product owner bằng tiếng Việt; code, identifier và tài liệu kỹ thuật có thể dùng tiếng Anh.
10. Không sửa tay artifact có memlog làm nguồn quyết định; cập nhật qua workflow sở hữu artifact đó.
11. Không gọi provider thật trong unit test hoặc CI mặc định. Dùng fixtures/fakes theo Architecture AD-19.
12. Không đưa API key, service-role key, transcript đầy đủ hoặc prompt chứa transcript vào log hoặc client bundle.

## Chuỗi workflow bắt buộc

```text
IDEA.md
→ bmad-prd                       [done]
→ bmad-ux                        [done]
→ bmad-architecture              [done]
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

1. PRD final.
2. UX `DESIGN.md` và `EXPERIENCE.md`.
3. Lesson Engine `SPEC.md` và toàn bộ companions.
4. `ARCHITECTURE-SPINE.md` và architecture memlog.
5. Không tạo story implementation trước khi epic map đã truy vết toàn bộ FR, CAP và AD.
