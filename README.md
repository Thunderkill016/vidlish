# Vidlish

Vidlish là một hệ thống học tiếng Anh cho người Việt, được tổ chức quanh **năng lực người học** thay vì quanh việc “AI tạo một bài học”.

Mục tiêu dài hạn là đưa một người từ **chưa biết tiếng Anh** đến nghe, nói, đọc và viết được bằng một vòng lặp nhất quán:

```text
comprehensible input
→ notice
→ retrieval / production
→ changed-context use
→ delayed review
→ less support as evidence strengthens
```

Giá trị bền vững của sản phẩm là:

> **comprehensible input at the learner's level + personal capability evidence + varied delayed review + progressively less support**

## Video là một nguồn, không phải trung tâm

Vidlish bắt đầu như một sản phẩm “dán YouTube URL → AI tạo lesson”. Pipeline đó vẫn tồn tại và là một nguồn input quan trọng khi người học đã đủ khả năng dùng nội dung thật.

Nhưng người bắt đầu từ zero không thể học hiệu quả bằng authentic video ngay. Vì vậy sản phẩm hiện có hai lớp nguồn input:

- **beginner path**: input ngắn, comprehensible, được kiểm soát theo evidence hiện có của người học;
- **source-grounded path**: YouTube/canonical transcript → allowlist → lesson authoring → guided learning session.

Không coi việc “đến được video” là đích cuối của sản phẩm.

## Trạng thái hiện tại

Learning Model v2 đã nằm trên `main`. Luồng sản phẩm hiện có:

- learner-first shell;
- beginner `/start` flow cho người có rất ít hoặc chưa có lexical evidence;
- durable learning sessions và privacy-safe evidence;
- support/replay evidence do server xác nhận;
- changed-context transfer;
- delayed review được schedule ở application layer;
- capability-oriented progress views;
- source-grounded YouTube generation pipeline;
- Supabase RLS/RPC + pgTAP;
- Chromium product journeys + durable Supabase learning journey.

Production đã chứng minh v2 authoring có thể tạo và publish `lesson_versions`. Điều **chưa được chứng minh** là teaching value trên người học thật.

### Gate đang hoạt động

Hard gate hiện tại là **Gate 5 — analytics + moderated usability với 5 target users**.

PR #128 đã merge local study harness để moderator có thể chạy một participant bằng local Supabase, capture owner-scoped durable measurement và bounded observations mà không dùng DevTools, production DB hay paid provider.

Điều đó chỉ chứng minh harness kỹ thuật chạy đúng. **Gate 5 chưa PASS** cho tới khi có đủ 5 phiên người học thật theo protocol đã khai báo.

Runbook:

- `docs/product/learning-model-v2/golden-session-usability-runbook.md`

Local harness:

```bash
pnpm study:golden
```

## Đọc trước khi phát triển

Thứ tự authority hiện tại:

1. [`docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`](./docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md)
2. [`docs/product/learning-model-v2/golden-session-validation.md`](./docs/product/learning-model-v2/golden-session-validation.md)
3. [`.specify/memory/constitution.md`](./.specify/memory/constitution.md)
4. active `specs/<feature>/spec.md`, `plan.md`, `tasks.md`
5. code + tests trên branch đang thay đổi
6. [`docs/archive/bmad/`](./docs/archive/bmad/) chỉ để tra lịch sử

Ngoài ra:

- [`AGENTS.md`](./AGENTS.md) — mission, current program state, invariant và execution protocol;
- [`HANDOVER.md`](./HANDOVER.md) — operational handover, production traps và verified recent state.

BMAD đã archive. Không dùng artifact BMAD cũ để ghi đè product docs, constitution, active specs hoặc code/tests hiện tại.

## Learning invariants quan trọng

- Comprehensibility là gate; policy hiện tại không phải chân lý khoa học bất biến.
- Completion không đồng nghĩa mastery.
- Scheduler quyết định khi nào item quay lại; nó không tự chứng minh independent capability.
- Reading a correction không phải completion nếu policy yêu cầu retry.
- Changed-context transfer phải thực sự đổi context/input.
- Delayed transfer được lưu và diễn giải riêng khỏi immediate transfer.
- Supported success và independent success không được gộp thành một claim.
- Durable learning evidence thuộc server/database authority; UI-local state không được tự phong mastery.

Với source-grounded lessons:

- citation phải là lời thoại thật từ canonical permitted transcript segments;
- model chỉ đề xuất IDs/labels;
- server hydrate text/timestamp và reject evidence ngoài allowlist;
- không cho model tự viết “quote” rồi coi là grounded.

## Kiến trúc

Dependency direction:

```text
app / route handlers
→ application
→ ports
← adapters
```

Các khu vực chính:

- `src/shared/contracts/`: runtime/domain contracts và privacy-safe schemas;
- `src/modules/learning/application/`: authoritative learning behavior;
- `src/modules/learning/ports/`: repository/provider interfaces;
- `src/adapters/fake/`: deterministic local/test adapters;
- `src/adapters/supabase/`: durable persistence;
- `src/platform/`: composition/config;
- `src/workflows/`: durable generation orchestration;
- `supabase/migrations/`: DB invariants/RPC/RLS;
- `supabase/tests/`: pgTAP;
- `tests/e2e/`: browser evidence.

## Source-grounded YouTube pipeline

Pipeline production-shaped vẫn là:

```text
YouTube metadata
→ durable generation job
→ native transcript acquisition
→ canonical transcript persistence
→ original-English eligibility gate
→ permitted segment allowlist
→ bounded lesson diagnosis / authoring
→ deterministic grounding + quality gate
→ v2 lesson_version publish
→ guided learning session
```

Native transcript fast path hiện dùng Supadata `mode=native`. Inngest không còn thuộc kiến trúc; durable orchestration dùng Vercel Workflow.

## Chạy ứng dụng cục bộ

Yêu cầu chính:

- Node.js 24 LTS;
- Corepack + pnpm 10.15.0;
- Docker-compatible runtime khi chạy Supabase local đầy đủ.

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env.local
supabase start
pnpm dev
```

### Fixture/local mode

Ordinary local/CI work không được gọi paid provider hoặc production Supabase.

Ví dụ fixture selectors:

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
LEARNING_AUTHORING_PROVIDER=fixture
```

Fixture/fake adapter bị chặn ở production theo config boundary tương ứng.

### Hosted/provider configuration

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
LEARNING_AUTHORING_PROVIDER=gemini
GEMINI_API_KEY=replace-with-server-only-key
```

Không log hoặc commit provider/service keys.

## Supabase Data API

Mỗi response có thể bị giới hạn ở 1.000 rows dù query thành công. Với tập dữ liệu có thể lớn:

- lọc nghiệp vụ trong Postgres;
- deterministic order;
- `count: "exact"` + `range()`;
- tiến offset theo số row server thực trả;
- fail closed nếu exact count báo còn dữ liệu nhưng page tiếp theo rỗng.

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

DB changes chưa hoàn tất cho tới khi pgTAP xanh. Learning-flow changes chưa hoàn tất cho tới khi Chromium xanh. Persistence changes chưa hoàn tất cho tới khi durable Supabase journey chứng minh rows và privacy boundary mong đợi.

Fixtures không chứng minh provider thật. Chỉ gọi integration path với key/provider thật khi task cho phép rõ ràng việc tiêu quota.

## Spec Kit

Vidlish dùng Spec Kit làm workflow phát triển đang hoạt động.

Với material scope:

```text
constitution
→ specify
→ clarify
→ plan
→ tasks
→ implement
→ focused verification
→ adversarial analysis
→ exact-head PR CI
→ merge
```

Không merge chỉ vì “build chạy”. Không bỏ qua learner/product gates chỉ vì CI xanh.
