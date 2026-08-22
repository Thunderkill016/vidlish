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
→ study workspace + library
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
- study workspace: nghe từng câu trong trang, làm bài tập có chấm, flashcard, lưu tiến độ;
- structured generation telemetry;
- watchdog pg_cron mỗi 2 phút, dọn job active quá 5 phút.

PR #42 đã thêm pagination đầy đủ cho transcript và permitted-segment reads vượt giới hạn
1.000 rows của Supabase Data API. Full CI xanh và production deployment READY.

Đọc trước khi phát triển:

- [`AGENTS.md`](./AGENTS.md) — trạng thái chương trình, invariant và protocol làm việc;
- [`.specify/memory/constitution.md`](./.specify/memory/constitution.md) — luật bền vững của sản phẩm/kỹ thuật;
- [`HANDOVER.md`](./HANDOVER.md) — invariant, bẫy production và kiến thức đắt tiền;
- [`docs/archive/bmad/`](./docs/archive/bmad/) — artifact BMAD cũ, chỉ dùng để tra lịch sử.

## Học như thế nào

Một bài học là chỗ để luyện, không phải trang để đọc:

- **Video nhúng** đứng cạnh nội dung; mọi timestamp phát đúng câu đó rồi tự dừng, có tốc
  độ 0.5x/0.75x/1x và nút ẩn video để nghe trước khi nhìn.
- **Từ vựng** có hai chế độ: danh sách kèm câu gốc, và flashcard hiện nghĩa sau khi tự nhớ.
- **Kiểm tra hiểu nội dung** chấm ngay khi chọn đáp án, mỗi câu trả lời một lần, kèm giải
  thích và câu gốc trong video.
- **Điền từ** yêu cầu gõ đáp án. Tự làm đúng và xem đáp án được ghi lại tách biệt.
- **Luyện nghe** phát từng câu của toàn bộ lời thoại tiếng Anh đủ điều kiện, có chế độ ẩn
  chữ để nghe trước rồi mới đối chiếu.
- **Tiến độ** tự lưu theo từng thao tác; thư viện hiển thị phần trăm đã học và bài đã hoàn
  thành. Tải lại trang không mất kết quả.

Tiến độ học nằm ở bảng riêng `lesson_progress`. Nó là dữ liệu của người học và không bao
giờ được ghi vào bài học đã publish.

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

## Spec Kit cho phát triển

Vidlish dùng Spec Kit làm workflow phát triển đang hoạt động. Luật bền vững nằm ở
`.specify/memory/constitution.md`; mỗi thay đổi có scope đáng kể dùng artifact dưới
`specs/<feature>/`.

Luồng mặc định:

```text
constitution → specify → clarify → plan → checklist → tasks → analyze → implement → converge
```

Không copy constitution vào từng template/agent. Agent đọc constitution hiện tại trực tiếp,
rồi đọc spec/plan/tasks của feature đang làm và `AGENTS.md`.

Artifact BMAD trước đây được lưu nguyên dưới `docs/archive/bmad/` để tra lịch sử. Chúng không
còn là source of truth và không được dùng để ghi đè product docs, constitution, feature spec hay
code/tests hiện tại.
