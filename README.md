# Vidlish

Vidlish biến video YouTube có đủ lời nói tiếng Anh gốc thành bài học tiếng Anh cá nhân hóa, có căn cứ từ video.

> **Any English video. Your English lesson.**

## Trạng thái

Story 1.1 đang xây dựng nền Next.js, đăng nhập email OTP sáu chữ số, private-beta allowlist, protected app shell, RLS tests và CI. YouTube URL, CEFR và generation job thuộc các story sau.

## Chạy ứng dụng cục bộ

Yêu cầu:

- Node.js 24 LTS
- Corepack + pnpm 10.15.0
- Docker-compatible container runtime khi chạy Supabase local

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
supabase start
pnpm dev
```

Cấu hình email OTP local nằm trong `supabase/templates/magic_link.html` và dùng `{{ .Token }}`. Hosted Supabase project phải cấu hình template tương đương trước khi staging acceptance.

### Chế độ auth giả cho test giao diện

Chỉ local/test:

```bash
AUTH_ADAPTER=fake \
AUTH_FAKE_CODE=123456 \
TEST_BETA_EMAILS=invited@example.com \
pnpm dev
```

`AUTH_ADAPTER=fake` bị từ chối trong production.

## Kiểm thử

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
supabase test db
pnpm build
```

CI không gọi Gemini, YouTube, transcript provider hoặc STT provider thật.

## BMAD cho Codex

BMAD được cấu hình ở phiên bản `6.10.0`, module `bmm`, tích hợp Codex qua `.agents/skills/`.

```bash
chmod +x install-bmad.sh
./install-bmad.sh
```

Windows PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install-bmad.ps1
```

Hoặc:

```bash
pnpm bmad:install
```

Planning artifacts nằm trong `_bmad-output/planning-artifacts/`; sprint/story artifacts nằm trong `_bmad-output/implementation-artifacts/`.
