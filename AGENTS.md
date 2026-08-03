# AGENTS.md

## Vai trò của Codex trong dự án

Vidlish sử dụng BMAD Method theo **Full BMad greenfield track**. `IDEA.md` là nguồn ý tưởng ban đầu; PRD và các artifact BMAD đã được duyệt mới là nguồn yêu cầu trực tiếp cho implementation.

## Trạng thái hiện tại

- BMAD Method 6.10.0 đã được cài cho Codex.
- PRD nháp nằm tại:
  `_bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md`
- Review nằm cùng thư mục tại `review-product-readiness.md`.
- **Chưa được viết code hoặc scaffold Next.js.**
- PRD còn năm quyết định lớn OQ-1 đến OQ-5 cần được product owner duyệt.

## Quy tắc làm việc

1. Đọc `IDEA.md`, PRD hiện hành, `.memlog.md`, `addendum.md` và review trước khi đưa ra quyết định.
2. Ưu tiên các skill trong `.agents/skills/`.
3. Không tự mở rộng MVP ngoài vòng giá trị:
   `nhập video → tạo bài học → học → lưu/mở lại/xóa`.
4. Tự đưa ra giả định cho chi tiết nhỏ và ghi lại trong artifact.
5. Chỉ hỏi product owner về quyết định sản phẩm lớn, pháp lý, API key, tài khoản, nhà cung cấp có chi phí hoặc thanh toán.
6. Không viết code trước khi PRD được final và Implementation Readiness đạt.
7. Lưu planning artifact trong `_bmad-output/planning-artifacts/` và implementation artifact trong `_bmad-output/implementation-artifacts/`.
8. Giao tiếp với product owner bằng tiếng Việt; code, identifier và tài liệu kỹ thuật có thể dùng tiếng Anh.
9. Không sửa tay artifact do workflow có memlog làm nguồn quyết định; cập nhật qua workflow sở hữu artifact đó.

## Chuỗi workflow bắt buộc

```text
IDEA.md
→ bmad-prd
→ bmad-ux
→ bmad-architecture
→ bmad-create-epics-and-stories
→ bmad-check-implementation-readiness
→ bmad-sprint-planning
→ bmad-create-story:create
→ bmad-create-story:validate
→ bmad-dev-story
→ bmad-code-review
```

`bmad-spec` có thể chạy sau Implementation Readiness để tạo machine contract gọn cho Codex, nhưng không thay thế PRD, UX hoặc Architecture.

## Hành động tiếp theo

1. Nhận quyết định D1-D5 trong `review-product-readiness.md`.
2. Cập nhật PRD và memlog.
3. Chuyển PRD sang `status: final` sau review.
4. Chạy `bmad-ux` cho đúng ba bề mặt chính.
