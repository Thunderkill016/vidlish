# Vidlish

Vidlish biến video YouTube có đủ lời nói tiếng Anh gốc thành bài học tiếng Anh cá nhân hóa, có căn cứ từ video.

> **Any English video. Your English lesson.**

## Trạng thái

Vidlish đang chạy private beta trên Vercel với Supabase production.

Luồng hiện tại:

```text
YouTube metadata
→ Vercel Workflow durable job
→ Supadata native caption
→ original-English eligibility gate
→ Gemini lesson generation
→ server-side citation grounding
→ atomic publish
→ lesson viewer + library
```

Các phần đã hoạt động production:

- Google OAuth/email OTP private beta;
- YouTube metadata và availability validation;
- durable generation job, idempotency và quota boundary;
- canonical transcript persistence;
- original-English eligibility + permitted-segment allowlist;
- Gemini Lesson Engine;
- citation text/timestamp hydrate từ Supabase;
- lesson viewer, library và active-job recovery;
- structured generation telemetry;
- watchdog pg_cron mỗi 2 phút, dọn job active quá 5 phút.

PR #42 đã thêm pagination đầy đủ cho transcript và permitted-segment reads vượt giới hạn
1.000 rows của Supabase Data API. Full CI xanh và production deployment READY.

Đọc trước khi phát triển:

- [`HANDOVER.md`](./HANDOVER.md) — invariant, bẫy production và kiến thức đắt tiền;
- [`continuous-development-plan.md`](./_bmad-output/planning-artifacts/continuous-development-plan.md) — backlog và việc hiện tại.

## Lời hứa dữ liệu

**Mọi citation trong bài học phải là lời thoại thật của video.**

Model không trả văn bản trích dẫn. Model chỉ trả segment labels/IDs; server ánh xạ về
segment thật, hydrate text/timestamp từ database và từ chối ID ngoài allowlist trước khi publish.

## Chạy ứng dụng cục bộ

Yêu cầu:

- Node.js 24 LTS;
- Corepack + pnpm 10.15.0;
- Docker-compatible runtime khi chạy Supabase local.

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
supabase start
pnpm dev
```

Email OTP local dùng `supabase/templates/magic_link.html` với `{{ .Token }}`.

### Chế độ fixture cho local/CI

```bash
AUTH_ADAPTER=fake
AUTH_FAKE_CODE=123456
TEST_BETA_EMAILS=invited@example.com

VIDEO_METADATA_ADAPTER=fixture
GENERATION_REPOSITORY=fake
GENERATION_DISPATCHER=inline
TRANSCRIPT_NATIVE_ADAPTER=fixture
TRANSCRIPT_REPOSITORY=fake
LESSON_PROVIDER=fixture
```

Adapter giả bị từ chối trong production.

### Cấu hình hosted

```bash
AUTH_ADAPTER=supabase
VIDEO_METADATA_ADAPTER=youtube
YOUTUBE_DATA_API_KEY=replace-with-server-only-key

GENERATION_REPOSITORY=supabase
GENERATION_DISPATCHER=workflow

TRANSCRIPT_NATIVE_ENABLED=true
TRANSCRIPT_NATIVE_ADAPTER=supadata
TRANSCRIPT_REPOSITORY=supabase
SUPADATA_API_KEY=replace-with-server-only-key

LESSON_PROVIDER=gemini
GEMINI_API_KEY=replace-with-server-only-key
```

`GENERATION_DISPATCHER=workflow` dùng Vercel Workflow DevKit. Inngest không còn thuộc
kiến trúc hiện tại.

Có thể mở dashboard workflow local:

```bash
pnpm exec workflow web
```

## Native caption và language gate

Supadata fast path gọi transcript với `mode=native`; không dùng AI generation cho tầng này.
Candidate được validate, normalize deterministic và persist atomically trước khi chuyển sang
`checking_language`.

Language gate dùng `franc-min` trên coherent windows. Metadata language và provider-declared
language chỉ là evidence, không phải quyết định cuối. Chỉ reliable English segment IDs được ghi
vào allowlist cho Lesson Engine.

## Supabase Data API

Mỗi response có thể bị giới hạn ở 1.000 rows dù query thành công. Với tập dữ liệu có thể lớn:

- lọc nghiệp vụ trong Postgres;
- deterministic order;
- `count: "exact"` + `range()`;
- fail closed nếu pagination kết thúc trước exact count.

Không tải owner-wide rồi lọc nghiệp vụ trong Node.

## Kiểm thử

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
supabase test db
pnpm test:e2e
```

CI chạy typecheck/lint, unit, production build, Supabase migrations/RLS, Chromium product
journeys và CI gate. Fixtures không chứng minh provider thật; thay đổi provider phải dùng
`tests/integration/full-real-path.test.ts` khi có key và quyền tiêu quota.

Local `pnpm build` cần `CI=true` cùng các biến env trong `.github/workflows/ci.yml`.

## BMAD cho Codex

BMAD được cấu hình ở phiên bản `6.10.0`, module `bmm`, tích hợp qua `.agents/skills/`.

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

Planning artifacts nằm trong `_bmad-output/planning-artifacts/`; sprint/story artifacts nằm
trong `_bmad-output/implementation-artifacts/`.
