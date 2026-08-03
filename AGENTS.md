# AGENTS.md

## Vai trò của Codex trong dự án

Dự án này sử dụng BMAD Method và lấy `IDEA.md` làm nguồn ý tưởng ban đầu.

## Quy tắc làm việc

1. Đọc toàn bộ `IDEA.md` trước khi đưa ra quyết định sản phẩm.
2. Khi BMAD đã được cài, ưu tiên các skill trong `.agents/skills/`.
3. Bắt đầu bằng `bmad-spec` để biến ý tưởng thành đặc tả nhỏ, rõ và kiểm chứng được.
4. Không bắt đầu viết toàn bộ ứng dụng khi chưa xác định phạm vi MVP và tiêu chí chấp nhận.
5. Lưu artifact do BMAD tạo trong `_bmad-output/`.
6. Giải thích cho người dùng bằng tiếng Việt; code, tên biến và tài liệu kỹ thuật có thể dùng tiếng Anh.
7. Với thông tin chưa chắc chắn, nêu giả định thay vì tự bịa.
8. Ưu tiên MVP chạy được trước các tính năng nâng cao.

## Lệnh bắt đầu đề xuất

> Đọc `IDEA.md`, kích hoạt skill `bmad-spec`, tạo đặc tả MVP trong `_bmad-output/`, sau đó dùng `bmad-help` để đề xuất workflow tiếp theo. Chưa viết code sản phẩm cho đến khi đặc tả đã rõ.
