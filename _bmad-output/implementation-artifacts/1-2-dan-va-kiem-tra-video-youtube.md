# Story 1.2: Dán và kiểm tra video YouTube

Status: ready-for-dev

## Story

As a người học đã đăng nhập,
I want dán một liên kết YouTube và xem metadata/playability đã được xác nhận,
so that tôi biết video có thể tiếp tục vào Create flow.

## Business Value

Story này biến `/create` từ placeholder thành bề mặt nhập video đầu tiên của Vidlish. Người học có thể dán URL YouTube phổ biến, nhận preview title/channel/thumbnail/duration và biết video có thể tiếp tục hay cần đổi URL. Story chưa chọn CEFR, chưa tạo generation job, chưa lấy transcript và không kết luận video có đủ tiếng Anh.

## Requirements Traceability

- Functional: FR3, FR5.
- Non-functional: NFR1, NFR6, NFR10, NFR13, NFR14, NFR16, NFR18.
- Architecture: AD-1, AD-5, AD-13, AD-14, AD-17, AD-18, AD-19; AR1–AR5, AR20, AR21, AR23, AR25–AR27, AR30.
- Implementation decision: ID-3, ID-10.
- UX: UX-DR4–UX-DR7, UX-DR27–UX-DR32.

## Acceptance Criteria

### AC1 — URL input và canonical parser

**Given** người dùng đã đăng nhập và mở `/create`  
**When** trang hiển thị  
**Then** có trường URL YouTube với visible label, paste affordance và một primary action `Kiểm tra video`  
**And** validation chỉ chạy khi blur hoặc submit, không báo lỗi trong lúc đang gõ  
**And** bố cục một cột, tối đa 720px.

**Given** URL YouTube hợp lệ  
**When** parser chạy  
**Then** hỗ trợ tối thiểu `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/embed/` và mobile watch URL  
**And** trả canonical video ID  
**And** bỏ playlist, timestamp và tracking parameters không ảnh hưởng  
**And** không chấp nhận domain giả, user-info attack, malformed URL, unsupported path hoặc video ID sai định dạng.

### AC2 — Provider-independent metadata lookup

**Given** URL đã parse thành video ID hợp lệ  
**When** server kiểm tra video  
**Then** application gọi `VideoMetadataProvider` qua port  
**And** initial adapter dùng YouTube Data API v3 `videos.list` với `part=snippet,contentDetails,status` và filter `id`  
**And** raw Google response được Zod validate và không đi vào domain/UI  
**And** API key chỉ tồn tại trong typed server config  
**And** local/CI dùng fixture adapter, không gọi YouTube thật.

### AC3 — Canonical metadata và availability

**Given** provider trả video resource  
**When** adapter map kết quả  
**Then** canonical result tối thiểu chứa `videoId`, `title`, `channelName`, optional `thumbnailUrl`, optional `durationMs`, `availability`, `metadataVersion` và optional caption indicator  
**And** availability chỉ dùng các giá trị `playable`, `not_found`, `private`, `restricted`, `unavailable`, `metadata_failed`  
**And** mapping xét resource existence, `status.privacyStatus`, `status.uploadStatus`, `status.embeddable` và `contentDetails.regionRestriction`  
**And** không suy đoán private/deleted/restricted khi provider không cung cấp đủ bằng chứng  
**And** caption/default-audio-language chỉ là metadata phụ, không phải bằng chứng video đủ tiếng Anh.

### AC4 — Preview thành công

**Given** canonical availability là `playable`  
**When** lookup hoàn tất  
**Then** trang hiển thị thumbnail khi hợp lệ, title, channel và duration khi có  
**And** external text được render như text, không dùng raw HTML  
**And** preview nằm gần URL field và không gây horizontal overflow  
**And** copy chỉ xác nhận video có thể tiếp tục, không hứa lesson chắc chắn được tạo.

### AC5 — Error, timeout và retry

**Given** video được map thành known unavailable state  
**When** kết quả hiển thị  
**Then** dùng stable ProductError như `VIDEO_URL_INVALID`, `VIDEO_NOT_FOUND`, `VIDEO_PRIVATE`, `VIDEO_RESTRICTED`, `VIDEO_UNAVAILABLE` hoặc `VIDEO_METADATA_FAILED`  
**And** copy tiếng Việt không lộ raw Google error, stack trace hoặc API key  
**And** người dùng có thể sửa URL mà không reload.

**Given** metadata provider gặp timeout hoặc transient failure  
**When** request kết thúc  
**Then** `VIDEO_METADATA_FAILED` là retryable và có một action `Thử lại`  
**And** retry dùng cùng canonical video ID  
**And** không gửi request trùng khi submit liên tục.

**Given** mạng/provider bình thường  
**When** người dùng submit URL hợp lệ  
**Then** loading acknowledgement bắt đầu ngay và response mục tiêu hoàn tất trong khoảng 2 giây  
**And** provider call có timeout cấu hình, không treo vô hạn.

### AC6 — Authentication và server boundary

**Given** metadata validation request tới server  
**When** command chạy  
**Then** server xác nhận current session và active beta access  
**And** parse/validate lại URL phía server  
**And** client không được chọn arbitrary provider endpoint, API parts hoặc canonical availability  
**And** response có private/no-store semantics  
**And** Story này không persist `videos`, Job, Transcript, Lesson hoặc Activity records.

### AC7 — Accessibility và responsive

**Given** desktop, mobile, keyboard hoặc screen-reader user  
**When** thao tác URL field, submit, loading, preview và error  
**Then** field có visible label, linked help/error, visible focus và touch target tối thiểu 44×44 CSS pixels  
**And** loading/result được công bố bằng `aria-live` có kiểm soát  
**And** trạng thái không chỉ dùng màu  
**And** thumbnail có accessible alt phù hợp hoặc được đánh dấu decorative khi title đã truyền đạt cùng nội dung  
**And** core flow đáp ứng WCAG 2.2 AA floor.

### AC8 — Kiểm thử và CI

**Given** Story 1.2 được đưa vào CI  
**When** suite chạy  
**Then** có unit test cho URL parser với supported, malformed, hostile và unsupported inputs  
**And** có unit test cho ISO-8601 duration, region restriction và availability mapping  
**And** có adapter contract tests cho valid response, empty items, corrupt payload, HTTP error và timeout  
**And** có integration tests cho protected command, schema boundary và stable ProductError  
**And** có desktop/mobile E2E cho loading, success, sửa URL, unavailable và retryable failure  
**And** CI không gọi YouTube Data API thật.

## Tasks / Subtasks

- [ ] **Task 1 — Mở rộng typed config và fixture mode** (AC2, AC5, AC6, AC8)
  - [ ] Thêm server-only `YOUTUBE_DATA_API_KEY`, `YOUTUBE_VIEWER_REGION` và bounded metadata timeout vào `src/platform/config/server.ts`.
  - [ ] Thêm typed adapter selector cho metadata: real YouTube adapter ở staging/production khi có credential, fixture adapter cho local/CI.
  - [ ] Missing production/staging credential phải disable/fail cấu hình rõ ràng; không âm thầm đổi vendor.
  - [ ] Cập nhật `.env.example`, README và GitHub Actions env mà không lộ secret thật.
  - [ ] Không đọc `process.env` ngoài config modules.

- [ ] **Task 2 — Tạo video module theo hexagonal boundary** (AC1–AC3, AC6)
  - [ ] Tạo `src/modules/video/domain`, `application`, `ports` và public `index.ts`.
  - [ ] Định nghĩa `VideoMetadataProvider`, canonical metadata DTO, availability enum và application result contract.
  - [ ] Tạo `ParseYouTubeUrl`/`ValidateVideoInput` use case; domain/application không import Next.js, fetch API cụ thể hoặc Google SDK.
  - [ ] Dùng versioned Zod schemas ở request/provider/result boundaries.
  - [ ] Không tạo database repository vì Story 1.2 không persist video.

- [ ] **Task 3 — Implement URL parser an toàn** (AC1, AC5, AC8)
  - [ ] Parse bằng WHATWG `URL`; không dùng một regex toàn cục làm nguồn xác nhận duy nhất.
  - [ ] Allowlist exact hosts: `youtube.com`, `www.youtube.com`, `m.youtube.com`, `music.youtube.com` cho watch/embed/shorts khi phù hợp và `youtu.be` cho short URL.
  - [ ] Hỗ trợ `watch?v=<id>`, `/shorts/<id>`, `/embed/<id>` và `youtu.be/<id>`; normalize canonical ID.
  - [ ] Loại/ignore `list`, `index`, `t`, `start`, `si`, `feature` và fragment mà không để chúng thay video ID.
  - [ ] Reject HTTP user-info, wrong protocol, lookalike suffix, extra nested URL, empty/duplicate `v`, unsupported path và ID không khớp canonical current format.
  - [ ] Không chấp nhận raw ID hoặc non-YouTube URL ngoài yêu cầu.

- [ ] **Task 4 — Implement YouTube Data API adapter** (AC2, AC3, AC5, AC8)
  - [ ] Tạo server-only adapter dưới `src/adapters/youtube/` sử dụng built-in `fetch` và `AbortSignal.timeout`/AbortController; không thêm SDK nếu REST call đủ.
  - [ ] Gọi `GET https://www.googleapis.com/youtube/v3/videos` với `id`, `part=snippet,contentDetails,status` và API key server-side.
  - [ ] Ghi nhận quota contract: mỗi `videos.list` call có cost 1 unit; không retry vô hạn hoặc gọi thừa.
  - [ ] Validate list response và video resource bằng Zod trước mapping.
  - [ ] Parse ISO-8601 duration deterministically sang milliseconds; invalid duration trở thành `undefined` hoặc validated failure theo contract, không bịa giá trị.
  - [ ] Chọn thumbnail từ known YouTube thumbnail host/HTTPS; reject arbitrary URL trong corrupt fixture.
  - [ ] Không đưa description/tags/raw payload vào canonical UI result.

- [ ] **Task 5 — Implement availability mapper không false precision** (AC3, AC5, AC8)
  - [ ] Empty `items` map tới safe inaccessible/not-found outcome; UI copy không khẳng định private/deleted nếu không có bằng chứng.
  - [ ] Explicit `privacyStatus=private` map `private` khi provider thật sự trả field đó.
  - [ ] `embeddable=false`, viewer region bị blocked/not in allowed list map `restricted`.
  - [ ] failed/rejected/deleted/processing hoặc unsupported upload status map `unavailable` theo typed policy.
  - [ ] Public/unlisted + processed + embeddable + region allowed map `playable`.
  - [ ] Unknown enum/corrupt structure fail closed thành safe metadata failure, không mặc định playable.
  - [ ] `contentDetails.caption` và `snippet.defaultAudioLanguage` không được dùng làm language eligibility gate.

- [ ] **Task 6 — Tạo authenticated metadata command route** (AC1, AC2, AC5, AC6)
  - [ ] Tạo route handler/application command nhận bounded JSON `{ url }` từ same-origin POST.
  - [ ] Reuse `readAuthJsonBody`, `assertSameOrigin`, `ProductError` và `createIdentityService`; không sao chép auth logic.
  - [ ] Recheck current access trong route/application boundary; unauthenticated/revoked trả stable auth error.
  - [ ] URL luôn được parse lại phía server; client result không được tin cậy.
  - [ ] Map provider errors/timeouts thành ProductError; không log API key, full provider body hoặc stack trên client.
  - [ ] Response `Cache-Control: private, no-store`.

- [ ] **Task 7 — Build Create URL UX và metadata preview** (AC1, AC4, AC5, AC7)
  - [ ] Thay placeholder `/create` bằng client form trong centered 720px content column, giữ protected app shell.
  - [ ] URL input có visible label, paste affordance, help text và validation khi blur/submit.
  - [ ] Primary action `Kiểm tra video`; disable/guard duplicate submit nhưng không làm mất focus.
  - [ ] Hiển thị loading skeleton/status, playable preview và one-action errors; `Thử lại` chỉ cho retryable failure.
  - [ ] Sửa URL phải clear stale preview/error/readiness.
  - [ ] Dùng `next/image` với remote pattern giới hạn cho YouTube thumbnails hoặc một safe image component; không raw HTML.
  - [ ] Copy không nhắc provider, quota, API key hoặc hứa caption/lesson.
  - [ ] Không thêm CEFR selector hoặc `Tạo bài học` CTA trong story này.

- [ ] **Task 8 — Test pyramid và regression** (AC1–AC8)
  - [ ] Unit-test parser matrix, malicious URLs, duplicate query values, duration parser và availability policy.
  - [ ] Adapter tests mock `fetch` cho success/empty/corrupt/403/429/5xx/timeout; assert exact endpoint parts và no key leakage in errors.
  - [ ] Integration-test authenticated command, revoked session, wrong origin/content type, product errors và no persistence.
  - [ ] Component tests cho blur/submit, stale clear, loading, preview và retry.
  - [ ] Playwright desktop/mobile flows dùng fixture adapter: valid preview, unavailable URL, transient retry và keyboard labels/focus.
  - [ ] Giữ toàn bộ Story 1.1 auth/RLS/logout regression xanh.

## Dev Notes

### Previous Story Intelligence

Story 1.1 đã thiết lập các patterns bắt buộc phải reuse:

- Protected routes dùng `(protected)` layout + `createIdentityService().resolveCurrentAccess()`; Proxy chỉ optimistic session boundary.
- Server mutations dùng `assertSameOrigin`, bounded `readAuthJsonBody` và `productErrorResponse`.
- Typed config tách public/server/proxy; chỉ config modules đọc environment variables.
- Domain/application phụ thuộc ports; Supabase/fake implementations nằm trong adapters.
- CI có quality, Supabase pgTAP và Playwright desktop/mobile jobs; không live provider.
- `ProductError` dùng stable uppercase code, Vietnamese copy, retryability và safe action.
- Auth responses/private pages dùng no-store; browser history được revalidate sau logout.
- UI primitives hiện có: Button, Input, Card, `cn`; mở rộng thay vì tạo design system cạnh tranh.

### Technical Contracts

Recommended canonical contract:

```ts
type VideoAvailability =
  | "playable"
  | "not_found"
  | "private"
  | "restricted"
  | "unavailable"
  | "metadata_failed";

type VideoMetadata = {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl?: string;
  durationMs?: number;
  availability: VideoAvailability;
  metadataVersion: string;
  captionAvailable?: boolean;
  declaredAudioLanguage?: string;
};
```

Provider should return a typed success/failure union rather than throw raw HTTP/provider objects across the port.

### YouTube API Guardrails

- Official endpoint: `GET /youtube/v3/videos` with `id` and `part=snippet,contentDetails,status`.
- Official quota cost for `videos.list`: 1 unit per call.
- `snippet` provides title/channel/thumbnails; `contentDetails.duration` is ISO 8601; `contentDetails.regionRestriction` has `allowed` or `blocked`; `status` provides upload/privacy/embeddable state.
- Empty results are inherently ambiguous for public API-key lookup. Do not claim a video is definitely deleted or private without explicit evidence.
- `contentDetails.caption=true` does not prove caption usability or spoken English; Stories 2.2–2.3 own those conclusions.
- API response fields and enums are untrusted external input; unknown values fail closed.

### Performance and Reliability

- One UI submit should cause at most one `videos.list` request.
- Use a bounded timeout configured server-side; no unbounded retry inside Story 1.2.
- UI acknowledgement/loading is immediate; target normal response within ~2 seconds.
- Do not cache authenticated HTTP response publicly. A later story may introduce safe provider-result caching with explicit key/version ownership.

### Expected File Shape

```text
src/modules/video/
  domain/
    video-metadata.ts
    youtube-url.ts
  application/
    validate-video-url.ts
  ports/
    video-metadata-provider.ts
  index.ts
src/adapters/youtube/
  youtube-data-api-provider.ts
  youtube-data-api-schemas.ts
  fixture-video-metadata-provider.ts
src/platform/video/
  create-video-metadata-provider.ts
src/app/api/video/validate/route.ts
src/app/(protected)/create/
  page.tsx
  _components/video-url-form.tsx
  _components/video-metadata-preview.tsx
src/shared/contracts/video.ts
```

Adjust names only to preserve established conventions. Do not put Google response types in `modules/video` and do not create a generic global fetch wrapper unless reuse is proven.

### Testing Notes

- Fixture adapter must model canonical provider behavior, including latency/failure cases, without live network.
- Parser tests should include Unicode/whitespace, user-info, lookalike domains, encoded path, duplicate `v`, playlist-only URL and unsupported live/channel URLs.
- Mapper tests must include region `allowed=[]`, `blocked=[]`, blocked `VN`, allowed without `VN`, embeddable false, private, processing, unknown enum and corrupt thumbnail.
- Preserve Story 1.1 tests and CI.

### Latest Technical Information

Checked against official Google documentation on 2026-08-04:

- `videos.list` returns video resources, accepts `id` and `part`, and currently costs 1 quota unit.
- `snippet`, `contentDetails` and `status` expose the exact metadata required by ID-3.
- `contentDetails.duration` uses ISO 8601.
- `contentDetails.regionRestriction.allowed` means all unlisted countries are blocked; an empty allowed list blocks all countries.
- `contentDetails.regionRestriction.blocked` means listed countries are blocked; an empty blocked list blocks none.
- `status.embeddable` indicates whether third-party embedding is allowed.

### References

- [Source: `_bmad-output/planning-artifacts/epics/epic-1.md` — Story 1.2]
- [Source: `_bmad-output/planning-artifacts/epics/requirements-inventory.md` — FR3, FR5 and NFRs]
- [Source: `_bmad-output/planning-artifacts/epics/architecture-ux-requirements.md`]
- [Source: `_bmad-output/planning-artifacts/epics/implementation-clarifications.md`]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md`]
- [Source: `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md` — ID-3, ID-10]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/DESIGN.md`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md`]
- [Official: YouTube Data API `videos.list` and video resource docs, updated July 2026]

## Definition of Done

- [ ] AC1–AC8 demonstrably satisfied.
- [ ] Exact dependencies remain lockfile-pinned; no unnecessary YouTube SDK added.
- [ ] Typecheck, lint, unit/integration, production build and Playwright pass.
- [ ] Existing Story 1.1 auth/RLS/logout tests remain green.
- [ ] CI makes zero live YouTube calls.
- [ ] No secret or raw provider payload reaches client/logs.
- [ ] No CEFR, generation job, transcript, lesson or persistence scope is added.
- [ ] Story is ready for independent code review.

## Dev Agent Record

### Agent Model Used

To be recorded by `dev-story`.

### Debug Log References

To be recorded during implementation.

### Completion Notes List

- Story context created automatically after Story 1.1 merged.
- Previous-story security, test and architecture patterns incorporated.

### File List

To be completed by the dev agent.
