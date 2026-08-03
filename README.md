# Vidlish

Vidlish biến video YouTube có đủ lời nói tiếng Anh gốc thành bài học tiếng Anh cá nhân hóa, có căn cứ từ video.

> **Any English video. Your English lesson.**

## Trạng thái

- Epic 1: email OTP/private beta, URL + metadata validation, CEFR và confirmed Create draft.
- Story 2.1: durable generation job, owner-scoped progress page, idempotency, quota boundary và Inngest workflow entry.
- Transcript acquisition, original-English eligibility và Lesson Engine thuộc các story tiếp theo.

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

### Video metadata adapter

Local và CI mặc định dùng fixture, không gọi YouTube thật:

```bash
VIDEO_METADATA_ADAPTER=fixture
YOUTUBE_VIEWER_REGION=VN
YOUTUBE_METADATA_TIMEOUT_MS=5000
```

Staging/production dùng YouTube Data API v3:

```bash
VIDEO_METADATA_ADAPTER=youtube
YOUTUBE_DATA_API_KEY=replace-with-server-only-key
YOUTUBE_VIEWER_REGION=VN
YOUTUBE_METADATA_TIMEOUT_MS=5000
```

`YOUTUBE_DATA_API_KEY` chỉ được đọc từ server config. Khi chọn adapter `youtube` mà thiếu key, ứng dụng fail closed và không tự đổi sang provider khác. Metadata vẫn đi qua Zod và canonical availability mapping.

### Durable generation job

Local và CI dùng repository in-memory cùng inline workflow fixture. Chế độ này không gọi transcript, Gemini, STT hoặc Inngest Cloud:

```bash
GENERATION_REPOSITORY=fake
GENERATION_DISPATCHER=inline
GENERATION_MAX_ACTIVE_JOBS=2
GENERATION_MAX_JOBS_PER_DAY=20
GENERATION_MAX_JOBS_PER_MINUTE=3
```

Để chạy durable workflow cục bộ bằng Supabase + Inngest Dev Server:

```bash
GENERATION_REPOSITORY=supabase
GENERATION_DISPATCHER=inngest
INNGEST_DEV=1
npx inngest-cli@latest dev
pnpm dev
```

Hosted staging/production phải dùng `GENERATION_REPOSITORY=supabase`, `GENERATION_DISPATCHER=inngest` và cấu hình riêng `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY`. Job được persist trước dispatch; duplicate submit dựa vào unique active-job key trong Postgres, không chỉ dựa vào event idempotency.

## Kiểm thử

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
supabase test db
pnpm build
```

CI sử dụng auth/video/generation fixtures và không gọi Gemini, YouTube, transcript provider, STT provider hoặc Inngest Cloud thật.

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
