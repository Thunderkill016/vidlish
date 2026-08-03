# Story 1.1: Truy cập private beta và đăng nhập an toàn

Status: ready-for-dev

## Story

As a người Việt học tiếng Anh đã được mời vào private beta,
I want đăng nhập bằng mã OTP và duy trì phiên riêng tư,
so that tôi có thể dùng Vidlish mà dữ liệu không bị người khác truy cập.

## Business Value

Story này tạo nền ứng dụng greenfield và ranh giới truy cập riêng tư đầu tiên của Vidlish. Khi hoàn tất, một người dùng được mời có thể đăng nhập bằng mã OTP sáu chữ số, truy cập app shell được bảo vệ, duy trì phiên sau khi tải lại và đăng xuất an toàn. Story chưa xử lý YouTube URL, CEFR, generation job, transcript hoặc Lesson Engine.

## Requirements Traceability

- Functional: FR1, FR2.
- Non-functional: NFR1, NFR2, NFR13, NFR14, NFR16, NFR18.
- Architecture: AD-1, AD-13, AD-14, AD-18, AD-19; AR1–AR5, AR20, AR23, AR25–AR27, AR30.
- Implementation decisions: ID-1, ID-2, ID-10, ID-11.
- UX: UX-DR1–UX-DR5, UX-DR28–UX-DR32.

## Acceptance Criteria

### AC1 — Scaffold greenfield

**Given** repository chưa có product code  
**When** Story 1.1 hoàn tất  
**Then** ứng dụng chạy bằng Next.js 16 App Router, Node.js 24 LTS, TypeScript, pnpm, Tailwind 4, shadcn/ui và Zod 4  
**And** exact package versions được khóa trong `pnpm-lock.yaml`  
**And** cấu trúc ban đầu có `src/app`, `src/modules/identity`, `src/platform/config`, `src/adapters/supabase`, `src/shared/contracts` và `src/shared/errors`  
**And** chưa tạo bảng Job, Transcript, Lesson hoặc Activity.

### AC2 — Beta allowlist

**Given** migration được áp dụng  
**When** private-beta access được cấu hình  
**Then** có bảng `beta_access` keyed by normalized email  
**And** browser client không thể select/insert/update/delete allowlist  
**And** chỉ reviewed migration hoặc service-role/secret-key-only admin command được thay đổi dữ liệu  
**And** response đăng nhập không tiết lộ email có trong allowlist hay đã có account.

### AC3 — Email OTP duy nhất

**Given** email hợp lệ và được phép beta  
**When** người dùng yêu cầu đăng nhập  
**Then** Supabase gửi mã OTP sáu chữ số  
**And** MVP không dùng magic link  
**And** resend, cooldown và expiry được xử lý bằng copy tiếng Việt rõ ràng  
**And** raw Supabase error không xuất hiện trên UI.

### AC4 — Xác minh OTP và session

**Given** người dùng nhập OTP hợp lệ  
**When** server xác minh  
**Then** tạo cookie-based Supabase SSR session  
**And** kiểm tra lại allowlist trước khi cấp app access  
**And** quay lại intended route hợp lệ hoặc `/create`  
**And** refresh không làm mất session.

**Given** OTP sai, hết hạn hoặc vượt retry policy  
**When** verification thất bại  
**Then** hiển thị lỗi inline có thể hành động  
**And** không tiết lộ account, allowlist hoặc provider detail.

### AC5 — Route protection và app shell

**Given** route được bảo vệ  
**When** người dùng chưa có session hoặc không còn beta access  
**Then** chuyển đến `/sign-in` và giữ intended URL an toàn.

**Given** user hợp lệ  
**When** app shell hiển thị  
**Then** navigation chỉ có `Tạo bài học`, `Thư viện` và account menu  
**And** account menu trong Story 1.1 chỉ có `Đăng xuất`  
**And** chưa hiển thị quota, retention, feedback link, dashboard, streak, XP hoặc AI chat.

### AC6 — Đăng xuất

**Given** user đang đăng nhập  
**When** chọn `Đăng xuất`  
**Then** session bị hủy và chuyển về `/sign-in`  
**And** back/refresh không mở lại protected content từ shared/server cache.

### AC7 — RLS, secrets và typed config

**Given** database/config được tạo trong story  
**When** migration và tests chạy  
**Then** `beta_access` bật RLS và không có browser-access policy  
**And** service-role/secret key chỉ ở server  
**And** public và server environment variables được Zod validate tập trung  
**And** module sản phẩm không đọc `process.env` trực tiếp  
**And** admin Supabase client không kế thừa cookie session của user.

### AC8 — Accessibility và responsive

**Given** keyboard, screen-reader hoặc mobile user  
**When** thao tác sign-in và navigation  
**Then** visible labels, logical focus order, linked errors, visible focus và 44×44 CSS-pixel touch targets tồn tại  
**And** trạng thái không chỉ dùng màu  
**And** core flow đáp ứng WCAG 2.2 AA floor  
**And** trang gốc dùng `lang="vi"`, còn tagline/source English dùng language attribute phù hợp.

### AC9 — Pull-request CI floor

**Given** pull request được mở  
**When** GitHub Actions chạy  
**Then** pipeline thực hiện frozen pnpm install, typecheck, ESLint, unit/integration tests và production build  
**And** auth/E2E tests dùng local Supabase, Mailpit hoặc deterministic fakes  
**And** CI không gọi Gemini, YouTube, transcript hoặc STT provider thật  
**And** preview deployment/branch protection không bị tuyên bố hoàn tất nếu repo settings chưa được cấu hình.

### AC10 — Kiểm thử auth flow

**Given** Story 1.1 vào CI  
**When** suite chạy  
**Then** có unit test cho email normalization, OTP schema, intended-route sanitization và ProductError mapping  
**And** integration test cho allowlist, session, auth commands và RLS  
**And** E2E cho allowed login, non-allowed neutral response, invalid/expired OTP UI, refresh, intended redirect và logout.

## Tasks / Subtasks

- [ ] **Task 1 — Merge official Next.js scaffold vào repository hiện tại** (AC1, AC9)
  - [ ] Dùng official `create-next-app` output hoặc manual equivalent làm structural seed; không dùng third-party starter repository.
  - [ ] Không chạy scaffold theo cách overwrite repo hiện tại. Repo đã có `package.json`, `README.md`, `.gitignore`, BMAD scripts và planning artifacts.
  - [ ] Merge `package.json` và giữ nguyên các scripts `bmad:install`, `bmad:tools`, `bmad:update`.
  - [ ] Khóa Node 24 LTS bằng `.nvmrc`/`.node-version`, `engines.node` và GitHub Actions; khóa exact pnpm 10.x bằng `packageManager`/Corepack.
  - [ ] Tạo và commit `pnpm-lock.yaml`; không tạo npm/yarn/bun lockfile cạnh tranh.
  - [ ] Cấu hình Next.js 16 App Router, React 19, TypeScript 6, Tailwind 4, ESLint và import alias `@/*`.
  - [ ] Giữ `moduleResolution: "bundler"` theo Next/TypeScript; không dùng deprecated `node10`, `classic` hoặc `outFile`.
  - [ ] Cấu hình Tailwind 4 bằng `@tailwindcss/postcss` và `@import "tailwindcss"`.
  - [ ] Khởi tạo shadcn/ui theo kiểu copy-in, alias UI tới `src/shared/ui`; chỉ thêm components cần cho sign-in/app shell.

- [ ] **Task 2 — Tạo module identity và contract boundaries** (AC1, AC3, AC4, AC7)
  - [ ] Tạo `src/modules/identity/domain`, `application`, `ports` và public module export.
  - [ ] Tạo use cases tối thiểu: request OTP, verify OTP, resolve current access, sign out.
  - [ ] Định nghĩa provider/repository ports để application/domain không import Next.js hoặc Supabase SDK.
  - [ ] Tạo Zod contracts cho email, six-digit OTP, request/response và safe intended path.
  - [ ] Tạo stable `ProductError` codes/copy cho invalid email, invalid-or-expired code, cooldown, temporary auth failure, missing session và revoked beta access.
  - [ ] Không log raw email, OTP, auth token, cookie hoặc Supabase payload; chỉ dùng redacted/pseudonymous context khi thật sự cần.

- [ ] **Task 3 — Tạo typed environment configuration** (AC1, AC7, AC9)
  - [ ] Tạo `src/platform/config/public.ts` cho `NEXT_PUBLIC_SUPABASE_URL` và publishable key.
  - [ ] Tạo `src/platform/config/server.ts` với `server-only` cho Supabase secret/service key và server-only settings.
  - [ ] Chỉ các config modules được đọc `process.env`; mọi consumer import typed config.
  - [ ] Tạo `.env.example` không chứa secret thật và mô tả local/staging/production isolation.
  - [ ] App phải fail fast với lỗi cấu hình có kiểm soát; không render secret/config value ra UI.

- [ ] **Task 4 — Tạo Supabase clients đúng boundary** (AC3–AC7)
  - [ ] Browser client dùng `@supabase/ssr` và publishable key.
  - [ ] Server client được tạo theo từng request với cookie adapter; không dùng module-level singleton cho user session.
  - [ ] `src/proxy.ts` dùng Supabase SSR để refresh cookie và `getClaims()` cho optimistic session check; không tạo `middleware.ts`.
  - [ ] Proxy không query `beta_access`, không làm full authorization và không chứa slow business logic.
  - [ ] Protected layouts/routes/commands re-check claims/session và active beta access server-side.
  - [ ] Admin allowlist client dùng server-only `@supabase/supabase-js` client tách biệt, không dùng SSR cookie adapter; tắt persist/refresh/detect-session để user cookie không thay Authorization header.
  - [ ] Không dùng `getSession()` làm server authorization source.

- [ ] **Task 5 — Tạo migration, local config và beta seed** (AC2, AC7, AC10)
  - [ ] Khởi tạo `supabase/config.toml`, migrations, `seed.sql` và database tests.
  - [ ] Tạo `public.beta_access` với `email_normalized text primary key`, `is_active boolean not null default true`, timestamps và constraint bảo đảm `lower(trim(email))`.
  - [ ] Enable RLS và revoke access của `anon`/`authenticated`; không tạo browser read/write policy.
  - [ ] Grant/admin access chỉ cho server role thích hợp; không tạo learner-facing allowlist management UI.
  - [ ] Seed chỉ dùng email test giả, không commit email cá nhân thật.
  - [ ] Không tạo profile, Job, Transcript, Lesson hoặc Activity tables chỉ để “chuẩn bị trước”.
  - [ ] Cấu hình local email template dùng `{{ .Token }}` để phát OTP code thay vì magic link; document hosted-template requirement.

- [ ] **Task 6 — Implement private-beta admission và OTP request** (AC2, AC3, AC7)
  - [ ] Normalize/validate email ở application boundary trước mọi provider/database call.
  - [ ] Server kiểm tra active `beta_access` trước khi gọi Supabase Auth.
  - [ ] Với email được phép, gọi `signInWithOtp` theo ID-1; cho phép tạo user chỉ sau khi admission đã pass.
  - [ ] Với email không được phép, không gọi Auth provider nhưng trả cùng valid-email HTTP status/body như allowed path.
  - [ ] Copy trung tính: ví dụ “Nếu email của bạn được mời, mã đăng nhập sẽ được gửi.”; không dùng “email không được mời”.
  - [ ] Provider/infrastructure outage được map thành generic retryable error, không giả thành successful acceptance.
  - [ ] Respect Supabase cooldown/expiry; UI chỉ enable resend khi cooldown kết thúc và không hardcode con số khác config/test contract.
  - [ ] Bảo vệ POST mutation bằng same-origin validation phù hợp; không chấp nhận arbitrary callback URL.

- [ ] **Task 7 — Implement OTP verification, intended redirect và logout** (AC4–AC7)
  - [ ] OTP input contract chỉ nhận đúng sáu chữ số.
  - [ ] Re-check active allowlist trước verify và sau session creation để xử lý revoke/race.
  - [ ] Gọi `verifyOtp({ email, token, type: "email" })` qua adapter và để SSR response persist cookies.
  - [ ] Khi allowlist bị revoke sau verify, sign out/clear auth cookies và deny access.
  - [ ] Sanitize `next`/intended path: chỉ relative same-origin path bắt đầu `/`; reject `//`, absolute URL, auth loops và malformed encoding; fallback `/create`.
  - [ ] Logout dùng POST/application command, hủy Supabase session, vô hiệu protected cache state và redirect `/sign-in`.
  - [ ] Auth response/route có private/no-store semantics; không để CDN/shared cache phát `Set-Cookie` hoặc protected HTML cho user khác.

- [ ] **Task 8 — Build sign-in UX và protected app shell** (AC3–AC8)
  - [ ] Tạo route groups `src/app/(auth)` và `src/app/(protected)`; `/sign-in` ngoài protected layout.
  - [ ] Root route redirect tới `/create` khi access hợp lệ, ngược lại `/sign-in`.
  - [ ] Sign-in flow có hai bước rõ ràng: email → OTP; dùng tiếng Việt bình tĩnh, không provider jargon.
  - [ ] Dùng một OTP input accessible với `inputMode="numeric"`, `autoComplete="one-time-code"`, `maxLength=6`, visible label và linked help/error; không bắt buộc six-box widget.
  - [ ] Có loading, accepted, cooldown, invalid/expired và temporary-error states; focus chuyển hợp lý và aria-live không đọc lặp toàn form.
  - [ ] Protected app shell chỉ có logo/Create, Library và account dropdown với `Đăng xuất`.
  - [ ] Tạo placeholder protected pages `/create` và `/library` đủ để kiểm tra route protection; không thêm URL field, CEFR, job hoặc dashboard.
  - [ ] Áp dụng Geist Sans/Mono, Learning Indigo/Evidence Teal/Timestamp Amber tokens, radii/spacing từ Design Spine; không gradient, mascot, gamification.
  - [ ] Root HTML `lang="vi"`; tagline English dùng `lang="en"` và canonical text “Any English video. Your English lesson.”
  - [ ] Mobile và desktop có 44×44 targets, visible focus, responsive top bar và no color-only state.

- [ ] **Task 9 — Implement unit, database, integration và E2E coverage** (AC2–AC10)
  - [ ] Vitest unit tests: normalize email, schema validation, safe redirect, error mapping và neutral admission result.
  - [ ] Database/pgTAP or equivalent tests: normalized constraint, RLS enabled, anon/auth cannot select or mutate, server admin can perform allowed operations.
  - [ ] Adapter/integration tests: allowed request invokes OTP provider once; disallowed request invokes zero provider calls but returns same public response; admin client never inherits user cookie/session.
  - [ ] Local Supabase integration: OTP request/verify cookie session through Mailpit or deterministic local auth fixture.
  - [ ] Playwright E2E: allowed first-time login, neutral non-allowed request, invalid and expired-code UI, protected deep-link redirect/return, refresh persistence, revoked beta access, logout and back/refresh denial.
  - [ ] Test mobile viewport, keyboard-only flow, labels/error linkage and basic accessibility assertions.
  - [ ] No test calls live external providers; production secrets are absent in CI.

- [ ] **Task 10 — Add PR CI and update repository documentation safely** (AC1, AC3, AC9, AC10)
  - [ ] Tạo `.github/workflows/ci.yml` với Node 24, exact pnpm cache/setup, frozen install, typecheck, ESLint, tests và build.
  - [ ] Start/reset local Supabase for database/integration/E2E jobs; install only required Playwright browser/dependencies.
  - [ ] Ensure cleanup runs even after test failure and no local secret/artifact is uploaded.
  - [ ] Update `README.md` canonical tagline và local setup, giữ BMAD installation guidance còn đúng.
  - [ ] Update current root `package.json` description/engines/scripts by merge; preserve every `bmad:*` script.
  - [ ] Extend `.gitignore` for `.next`, build output, coverage, Playwright reports/results và Supabase temp while preserving `_bmad-output` tracking rules.
  - [ ] Update stale stage/reference text in `AGENTS.md` only as needed so it points to current `project-context.md`, final planning/readiness/sprint artifacts and the normal story cycle; do not weaken any language invariant.
  - [ ] Do not claim branch protection, hosted SMTP, hosted Supabase project configuration or preview deployment unless actually configured and verified.

## Dev Notes

### Scope Boundaries

**In scope**

- Greenfield web scaffold merged into the existing repository.
- Supabase SSR OTP authentication.
- Server-managed private-beta allowlist.
- Protected Create/Library placeholder shell.
- Central typed config, RLS migration/tests, local auth environment and PR CI.

**Explicitly out of scope**

- YouTube URL parser/metadata (Story 1.2).
- CEFR selector/readiness draft (Story 1.3).
- Generation job, Inngest workflow, quota summary, transcript, language gate, Lesson Engine, activities or library data.
- Learner-facing beta administration, quota UI, retention UI or feedback link.
- Magic-link login, password auth, OAuth/social login or account settings hierarchy.
- Hosted production deployment, branch-protection configuration or public-launch legal pages.

### Authority Warning

`project-context.md`, final PRD/UX/Architecture companions, `epics.md`, readiness rerun and sprint status are current authorities. The status/workflow text and `AD-22` wording in the older root `AGENTS.md` are stale. Do not implement a literal nonexistent `AD-22`; the Architecture Language Eligibility Amendment and ID-12 own that later lifecycle contract. Story 1.1 must preserve the language invariant but does not implement it.

### Existing Repository Files That Must Be Preserved

| File | Current state | Story change | Must preserve |
| --- | --- | --- | --- |
| `package.json` | BMAD-only scripts and Node `>=20.12.0` | Merge application dependencies/scripts, Node 24 and exact pnpm | All `bmad:*` scripts and project identity |
| `README.md` | BMAD setup plus stale broad tagline | Correct promise and add app/local setup | Useful BMAD installer instructions |
| `.gitignore` | env/node_modules and `_bmad-output` rules | Add Next/test/Supabase generated outputs | Existing `_bmad-output` exceptions |
| `AGENTS.md` | Strong invariants but stale workflow status/reference | Refresh current stage/reference only | Workflow guardrails and English-source invariant |

There is no `pnpm-lock.yaml`, `.github/workflows/ci.yml`, `src/app`, product migration or product test suite yet.

### Required Application Contracts

Recommended public application shapes; exact names may vary only when dependency direction and tests stay clear:

```ts
type RequestLoginCodeCommand = {
  email: string;
};

type RequestLoginCodeResult = {
  status: "accepted";
};

type VerifyLoginCodeCommand = {
  email: string;
  code: string;
  intendedPath?: string;
};

type VerifyLoginCodeResult = {
  redirectTo: string;
};

type CurrentAccess = {
  userId: string;
  email: string;
  betaAccess: "active";
};
```

Public request-code responses for syntactically valid email must be indistinguishable between allowed and not allowed addresses. Internal result types may distinguish them but must not cross the route/UI boundary.

### Suggested Product Errors

```text
AUTH_EMAIL_INVALID
AUTH_CODE_INVALID_OR_EXPIRED
AUTH_CODE_COOLDOWN
AUTH_TEMPORARILY_UNAVAILABLE
AUTH_SESSION_REQUIRED
AUTH_BETA_ACCESS_REVOKED
AUTH_REQUEST_REJECTED
```

- `AUTH_CODE_INVALID_OR_EXPIRED` intentionally combines cases for user-facing privacy.
- Never put raw Supabase error, email address, OTP or account existence in `messageVi` or client diagnostics.

### Database Guidance

Minimal migration shape:

```sql
create table public.beta_access (
  email_normalized text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_access_email_is_normalized
    check (email_normalized = lower(trim(email_normalized)))
);

alter table public.beta_access enable row level security;
revoke all on table public.beta_access from anon, authenticated;
```

Add the explicit grants needed for the chosen server admin role. Do not add anon/auth policies. No profile table is needed for this story.

### Authentication Flow

```text
Email form
→ validate + normalize
→ server-only beta_access lookup
   → inactive/not found: no provider call, return neutral accepted response
   → active: request six-digit OTP from Supabase
→ OTP form
→ recheck beta_access
→ verifyOtp(email, token, type=email)
→ recheck beta_access after session creation
→ sanitize intended path
→ redirect to protected route
```

- Hosted Supabase must configure its email template with `{{ .Token }}`; otherwise it sends a magic link and violates ID-1.
- Supabase defaults are currently a six-digit code, a request cooldown around 60 seconds and expiry around one hour; treat values as provider/config data rather than duplicating unrelated constants throughout UI/domain.
- Allowed first-time users may be created only after allowlist admission. Other code paths must use `shouldCreateUser: false`.

### Next.js and Supabase Guardrails

- Next.js 16 renamed the network interception convention from `middleware.ts` to `proxy.ts`; place it at `src/proxy.ts` alongside `src/app`.
- Proxy is an optimistic refresh/redirect boundary, not complete authorization. It must not query allowlist or own business rules.
- Use `@supabase/ssr` for browser/request-scoped cookie clients.
- Use `supabase.auth.getClaims()` rather than trusting `getSession()` for server route protection.
- Full access checks live in protected layouts and each protected mutation.
- A service/secret admin client must be a separate server-only `@supabase/supabase-js` client without cookie/session persistence. Do not initialize service credentials inside an SSR client because a user session can replace the Authorization header.
- Auth responses that set cookies must be private/non-cacheable. Never statically cache protected HTML across users.

### Accessibility and UX Guardrails

- Vietnamese system UI, canonical English tagline only.
- Keep sign-in narrow and task-focused; one primary action per state.
- Use visible labels rather than placeholder-only fields.
- A single accessible OTP input is preferred over six disconnected boxes unless the multi-box implementation proves equivalent keyboard, paste and screen-reader behavior.
- Preserve entered email when moving to OTP step; allow changing it intentionally.
- Error text must be next to and programmatically associated with the input.
- Do not tell a user whether they are invited; the accepted message remains neutral.
- Account menu contains sign-out only in this story.

### File Structure Requirements

Expected minimum shape:

```text
.github/workflows/ci.yml
.env.example
.nvmrc
components.json
next.config.ts
postcss.config.mjs
tsconfig.json
pnpm-lock.yaml
src/
  proxy.ts
  app/
    layout.tsx
    globals.css
    page.tsx
    (auth)/
      sign-in/page.tsx
      sign-in/_components/sign-in-flow.tsx
    (protected)/
      layout.tsx
      create/page.tsx
      library/page.tsx
    api/auth/
      request-code/route.ts
      verify-code/route.ts
      sign-out/route.ts
  modules/identity/
    domain/
    application/
    ports/
    index.ts
  adapters/supabase/
    browser-client.ts
    server-client.ts
    admin-client.ts
    proxy-session.ts
    supabase-identity-provider.ts
    beta-access-repository.ts
  platform/config/
    public.ts
    server.ts
  shared/
    contracts/auth.ts
    errors/product-error.ts
    lib/
    ui/
supabase/
  config.toml
  migrations/<timestamp>_create_beta_access.sql
  seed.sql
  tests/beta_access_rls.test.sql
tests/
  integration/
  e2e/
vitest.config.ts
playwright.config.ts
```

Names may be adjusted to established generated conventions, but domain/application must not import Next.js or Supabase, and no later product modules/tables may be created.

### Testing Requirements

**Unit**

- Email trim/lowercase/invalid/max-length cases.
- OTP exactly six numeric characters.
- ProductError mapping and no raw-provider leakage.
- Intended path sanitizer including `//evil`, encoded external URL, auth-loop path and valid protected path.
- Public admission response is identical for allowlisted/non-allowlisted valid email.

**Database/integration**

- `beta_access` normalized-email constraint.
- RLS enabled; anon/auth select and all mutations denied.
- Server admin access succeeds only through server adapter.
- Allowed request invokes provider once; denied request invokes it zero times.
- Session cookies survive refresh; revoked allowlist blocks protected access.
- Admin client behavior is not affected by a user cookie.

**E2E**

- First-time allowlisted OTP login via local Mailpit or deterministic fake adapter.
- Non-allowlisted email sees same accepted copy and receives no local email.
- Invalid/expired OTP error and resend/cooldown UX.
- Deep link `/library` → sign-in → OTP → `/library`.
- External/open redirect attempt falls back to `/create`.
- Refresh remains authenticated.
- Logout then back/refresh cannot reveal protected content.
- Keyboard/mobile/label/focus checks.

### CI Requirements

At minimum, pull-request CI performs:

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The workflow may split database and E2E jobs for speed, but all required checks must gate completion. Use local Supabase/Mailpit and fixtures; no live provider keys. Do not commit `.env.local`, local database state, emails, Playwright traces containing secrets or test auth cookies.

### Latest Technical Notes Checked for Story Creation

Checked against official documentation on 2026-08-03:

- Node 24 is an LTS line; lock the current supported Node 24 patch used by CI/local.
- Next.js 16 App Router is stable and uses `proxy.ts`; Proxy documentation explicitly says not to rely on it as full authorization or slow data-fetching layer.
- TypeScript 6 deprecates `moduleResolution: node/node10`; bundled web apps should use modern bundler resolution.
- Tailwind 4 with Next.js uses `@tailwindcss/postcss` plus `@import "tailwindcss"`.
- Supabase email OTP is six digits; `{{ .Token }}` selects code delivery, and `signInWithOtp` can be prevented from creating users until admission passes.
- Supabase SSR guidance uses cookie clients, a Proxy for refresh, and `getClaims()` for server protection instead of trusting `getSession()`.
- Supabase requires RLS on exposed tables and forbids service/secret keys in browser clients.
- Vitest 4.1 and current Playwright support Node 24; pin exact packages in the lockfile.

Recheck exact patch versions when implementation runs; do not replace the architecture’s major-version choices without Correct Course.

### Project Structure Notes

- This is the first product story. There is no prior story implementation or code pattern to reuse.
- Official create-next-app output may be generated in a temporary directory and merged, because scaffolding directly into a non-empty repo can overwrite BMAD/project files.
- Keep dependency direction inward: App/route handlers → identity application → ports; Supabase adapters implement ports.
- Do not place Supabase calls directly in page components or identity domain files.
- Do not create a generic `lib/supabase.ts` singleton used for both browser, user server and admin access.
- Update existing root files deliberately rather than replacing them wholesale.

### References

- [Source: `project-context.md` — Current stage, initial implementation decisions and invariant]
- [Source: `_bmad-output/planning-artifacts/epics/epic-1.md` — Story 1.1 and Epic 1 boundaries]
- [Source: `_bmad-output/planning-artifacts/epics/requirements-inventory.md` — FR1, FR2 and NFRs]
- [Source: `_bmad-output/planning-artifacts/epics/architecture-ux-requirements.md` — AR1–AR5, AR20, AR23, AR25–AR27, AR30 and UX requirements]
- [Source: `_bmad-output/planning-artifacts/epics/implementation-clarifications.md` — Story 1.1 scaffold, entity timing, CI and account-menu ownership]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md` — AD-1, AD-13, AD-14, AD-18, AD-19, stack, source tree and conventions]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md` — ID-1, ID-2, ID-10, ID-11]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/DESIGN.md` — brand tokens, typography, layout and anti-patterns]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md` — sign-in, app shell, voice/tone and accessibility]
- [Official docs checked: Node.js Releases; Next.js 16 Installation/Proxy; TypeScript 6 release notes; Tailwind CSS Next.js guide; Supabase SSR/Auth/RLS docs; Vitest 4.1; Playwright installation]

## Definition of Done

- [ ] All AC1–AC10 are demonstrably satisfied.
- [ ] `pnpm install --frozen-lockfile`, typecheck, lint, unit/integration tests and production build pass from a clean checkout.
- [ ] Required Playwright flows pass against local/test infrastructure without live external providers.
- [ ] No secret, OTP, auth cookie or real user email exists in committed files/logs/artifacts.
- [ ] No Job, Transcript, Lesson, Activity, YouTube or generation functionality is added.
- [ ] Existing BMAD scripts and artifacts remain intact.
- [ ] Story implementation is ready for independent code review.

## Dev Agent Record

### Agent Model Used

To be recorded by `dev-story`.

### Debug Log References

To be recorded during implementation.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.
- No previous implementation story or product-code baseline exists.

### File List

To be completed by the dev agent with every created, modified and deleted file.
