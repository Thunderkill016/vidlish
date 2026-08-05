# Vidlish

Vidlish biến video YouTube có đủ lời nói tiếng Anh gốc thành bài học tiếng Anh cá nhân hóa, có căn cứ từ video.

> **Any English video. Your English lesson.**

## Trạng thái

- Production: Vercel project `vidlish` đã kết nối Supabase project `vidlish`; redeploy từ checkpoint này để nhận environment variables mới.
- Epic 1: email OTP/private beta, URL + metadata validation, CEFR và confirmed Create draft.
- Story 2.1: durable generation job, owner-scoped progress page, idempotency, quota boundary và Inngest workflow entry.
- Story 2.2: native-caption fast path, deterministic normalization, canonical transcript persistence và handoff tới `checking_language`.
- Story 2.3: versioned original-English eligibility gate, mixed-language allowlist và terminal unsupported-language UX.
- Transcript fallback strategies và Lesson Engine thuộc các story tiếp theo.

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

Local và CI dùng repository in-memory cùng inline workflow fixture:

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

### Native caption fast path

Local/CI dùng transcript fixture và in-memory repository:

```bash
TRANSCRIPT_NATIVE_ENABLED=true
TRANSCRIPT_NATIVE_ADAPTER=fixture
TRANSCRIPT_REPOSITORY=fake
SUPADATA_NATIVE_TIMEOUT_MS=8000
```

Hosted workflow dùng Supadata native captions và Supabase persistence:

```bash
TRANSCRIPT_NATIVE_ENABLED=true
TRANSCRIPT_NATIVE_ADAPTER=supadata
TRANSCRIPT_REPOSITORY=supabase
SUPADATA_API_KEY=replace-with-server-only-key
SUPADATA_NATIVE_TIMEOUT_MS=8000
```

Adapter gọi universal `GET /v1/transcript` với `mode=native` và `text=false`. Vidlish không gửi `lang`, không gọi translation endpoint và không dùng AI generation trong Story 2.2. Candidate được Zod-validate, normalized deterministically, rồi transcript + segments + acquisition attempt được commit atomically trước khi job chuyển sang `checking_language`. `transcript-unavailable` chỉ có nghĩa không có caption dùng được; nó không phải kết luận ngôn ngữ.

### Original-English eligibility gate

Story 2.3 dùng `franc-min@6.2.0` sau `LanguageAnalysisPort` để tạo evidence theo coherent windows. Caption language, video metadata và segment language do provider khai báo không được dùng làm quyết định. Detector rank được lưu như raw evidence, không được trình bày như xác suất.

Policy `original-english:v1` nằm trong `src/modules/language/application/default-language-policy.ts` và xét đồng thời:

- tỷ lệ English trong phần evidence đủ tin cậy;
- thời lượng English liên tục;
- số từ English đủ tin cậy;
- coverage, số từ và số window tối thiểu để được phép kết luận.

Video chủ yếu nói tiếng Anh hoặc có một English portion đủ dài/coherent được đánh dấu `eligible`. Chỉ segment IDs thuộc reliable English windows được ghi vào downstream allowlist trước khi job chuyển sang `analyzing_video`. Video được xác nhận không đủ tiếng Anh gốc chuyển sang `failed` với `VIDEO_LANGUAGE_UNSUPPORTED` và hành động `choose_another_video`. Evidence quá yếu quay lại `acquiring_transcript` để fallback strategy sau có thể tiếp tục; nó không bị gắn nhãn sai là unsupported language.

## Kiểm thử

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
supabase test db
pnpm build
```

CI sử dụng auth/video/generation/transcript fixtures và detector chạy cục bộ; không gọi Gemini, YouTube, Supadata, STT provider hoặc Inngest Cloud thật.

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
