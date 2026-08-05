# Nguồn nghiên cứu CI

Danh sách này ghi lại các nguồn chính thức đã dùng để quyết định thay đổi CI ngày 2026-08-06. Khi nâng version, cần đọc lại tài liệu/changelog tương ứng thay vì áp dụng máy móc nội dung cũ.

## GitHub Actions

- Secure use reference: pin third-party actions bằng full commit SHA; đặt quyền `GITHUB_TOKEN` tối thiểu.
- Workflow syntax/concurrency: hủy run cũ cùng nhóm khi commit mới làm run cũ không còn giá trị.
- Dependency caching: cache package-manager store theo lockfile; cache không thay thế bước install.
- Dependabot: hỗ trợ cập nhật action đã pin SHA và npm dependencies.

## Next.js

- CI build caching: cache `.next/cache` với lockfile và input source/config; cache phải là tăng tốc, không phải nguồn đúng duy nhất.

## pnpm

- `pnpm/action-setup`: hỗ trợ pin version cụ thể; Vidlish dùng cùng version với `packageManager` trong `package.json`.

## Playwright

- CI ổn định ưu tiên một worker nếu suite/state chưa cô lập.
- Chỉ cài browser cần dùng.
- Headless-only CI có thể dùng `--only-shell` để tránh tải full Chromium.
- Không mặc định cache browser binaries vì restore archive thường không nhanh hơn tải và OS dependencies vẫn cần cài.

## Supabase

- Database-test CI chính thức dùng `supabase db start` rồi `supabase test db`.
- `supabase start` khởi động full local stack; `db start` chỉ phục vụ database workflow.
- Trên runner sạch, startup áp dụng migrations/seed; chạy thêm `db reset` ngay sau đó lặp lại công việc.
- Pin Supabase CLI khi cần reproducibility; service image có thể thay đổi theo CLI release.
- Baseline dùng PostgreSQL image `17.6.1.156`; Supabase CLI được pin tại `2.111.0` để giữ cùng release đã quan sát.

## Vitest

- Vitest tự bật GitHub Actions reporter trong Actions khi không cấu hình reporter tùy chỉnh, cung cấp annotations và job summary. Không cần thêm reporter trùng lặp.