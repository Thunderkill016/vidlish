---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - IDEA.md
  - _bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md
workflowType: research
lastStep: 6
research_type: technical
research_topic: Vidlish YouTube transcript and AI lesson generation MVP
research_goals: Xác định kiến trúc MVP chạy thật, cách lấy transcript, xử lý AI có cấu trúc, lưu dữ liệu và triển khai với mức can thiệp thấp
user_name: Creativity
date: 2026-08-03
web_research_enabled: true
source_verification: true
status: complete
---

# Technical Research: Vidlish MVP

**Ngày:** 2026-08-03  
**Phạm vi:** YouTube metadata/player, transcript acquisition, AI structured output, job processing, authentication, persistence và deployment.

## 1. Kết luận điều hành

Vidlish khả thi về mặt kỹ thuật, nhưng lời hứa “dán một video YouTube công khai bất kỳ có transcript” không thể được thực hiện chỉ bằng YouTube Data API chính thức.

API `captions.list` chỉ liệt kê track và không trả nội dung caption. API `captions.download` yêu cầu OAuth và người gọi phải có quyền chỉnh sửa video. Vì vậy, với video của người khác, MVP cần một trong ba con đường:

1. Dùng transcript provider bên thứ ba có API và điều khoản phù hợp.
2. Chỉ hỗ trợ video thuộc kênh đã OAuth với Vidlish.
3. Dùng scraping/unofficial library, chấp nhận rủi ro chính sách và độ ổn định.

Khuyến nghị cho private beta là **phương án 1**, đặt sau một interface `TranscriptProvider` để có thể thay nhà cung cấp. Không khuyến nghị dùng unofficial scraping làm nền tảng production.

Kiến trúc phù hợp nhất với mục tiêu can thiệp thấp:

- Next.js App Router + TypeScript cho web và server endpoints.
- Supabase Auth + Postgres, bắt buộc RLS cho dữ liệu theo người dùng.
- YouTube Data API `videos.list` cho metadata; YouTube IFrame Player API cho phát và seek timestamp.
- Transcript provider phía server, chỉ lấy caption có sẵn trong MVP.
- AI provider adapter + JSON Schema/Zod validation + semantic validation.
- Bản ghi job được lưu trước khi xử lý để hỗ trợ reload, retry và idempotency.
- Vercel Fluid Compute đủ cho beta nhỏ; thời lượng function Hobby mặc định/tối đa 300 giây, nhưng job state vẫn phải được lưu ngoài memory.

## 2. Phát hiện quan trọng nhất: khoảng trống transcript chính thức

### 2.1 YouTube Data API không trả transcript công khai tùy ý

- `captions.list` trả metadata của các caption track, không trả nội dung caption.
- `captions.download` yêu cầu authorization scope và quyền chỉnh sửa video.
- Do đó API chính thức phù hợp khi người dùng là chủ sở hữu/quản lý video, không phù hợp với giá trị cốt lõi hiện tại của Vidlish.

### 2.2 Đánh giá các phương án

| Phương án | Khả năng đáp ứng “video bất kỳ” | Ổn định | Rủi ro chính sách | Chi phí | Khuyến nghị |
|---|---:|---:|---:|---:|---|
| YouTube captions API chính thức | Thấp | Cao | Thấp | Thấp | Không phù hợp core flow |
| Transcript API bên thứ ba | Cao | Trung bình–cao tùy SLA | Cần review hợp đồng/nguồn dữ liệu | Có phí | Tốt nhất cho private beta |
| Unofficial scraping library | Cao khi chưa bị chặn | Thấp | Cao | Có thể thấp lúc đầu | Không dùng làm production dependency |
| Người dùng dán transcript thủ công | Trung bình | Cao | Thấp hơn | Thấp | Chỉ làm fallback nội bộ |
| Speech-to-text từ audio | Cao | Trung bình | Rủi ro download/content; ngoài MVP | Cao | Không thuộc MVP |

### 2.3 Tín hiệu vận hành từ unofficial library

Repository `youtube-transcript-api` vẫn hoạt động và có cộng đồng, nhưng issue công khai ghi nhận cloud-provider IP bị chặn, proxy failures và lỗi translated captions. Đây là dấu hiệu dependency này không đạt yêu cầu “MVP dùng thật, ít can thiệp” khi deploy serverless.

### 2.4 Provider bên thứ ba có thể dùng để thử nghiệm

Hai API có tài liệu hiện tại:

- TranscriptAPI: endpoint trả segment `text`, `start`, `duration`, hỗ trợ nhận biết auto-generated caption và metadata.
- Supadata: endpoint transcript đa nền tảng, hỗ trợ `native`, `auto`, `generate`; với Vidlish MVP chỉ nên dùng `native` để không vô tình mở rộng sang speech-to-text.

Đây chỉ là shortlist kỹ thuật, không phải phê duyệt pháp lý hay thương mại. Trước khi chọn phải kiểm tra pricing, retention, SLA, nguồn dữ liệu, DPA và quyền sử dụng kết quả.

## 3. Kiến trúc đề xuất

### 3.1 Bề mặt ứng dụng

```text
Next.js application
├── Auth screens
├── Create Lesson
├── Lesson Viewer
├── Lesson Library
└── Server routes/actions
```

MVP giữ đúng ba bề mặt sản phẩm; auth là bề mặt hỗ trợ.

### 3.2 Thành phần server

```text
LessonJobService
├── YouTubeMetadataProvider
├── TranscriptProvider
├── TranscriptNormalizer
├── LessonGenerationProvider
├── LessonSchemaValidator
├── QuoteGroundingValidator
└── LessonRepository
```

Mọi provider bên ngoài phải nằm sau interface để đổi vendor mà không sửa domain logic.

### 3.3 Luồng tạo bài học

1. User đăng nhập.
2. Client gửi URL + level.
3. Server parse video ID và tạo `lesson_job` với idempotency key.
4. Lấy metadata chính thức qua `videos.list`.
5. Kiểm tra public/embeddable/duration.
6. Gọi `TranscriptProvider` ở chế độ native caption.
7. Chuẩn hóa segment; lưu fingerprint và metadata nguồn.
8. Kiểm tra giới hạn duration + token/character budget.
9. Gọi AI với schema version cố định.
10. Validate JSON schema.
11. Validate số lượng item, timestamp và quote grounding.
12. Lưu Lesson trong transaction hoặc trạng thái publish-safe.
13. Đánh dấu job complete; client poll/realtime nhận kết quả.

Khi lỗi, job giữ error code chuẩn hóa và không tạo Lesson hoàn chỉnh.

## 4. YouTube integration

### 4.1 Metadata

Dùng YouTube Data API `videos.list` với `part=snippet,contentDetails,status` và video ID. Call này có quota cost thấp và cung cấp title, channel, thumbnail, duration cùng trạng thái cần thiết.

Không dùng `search.list` vì người dùng đã cung cấp URL/video ID; search tốn quota cao hơn và không cần thiết.

### 4.2 Player và timestamp

Dùng YouTube IFrame Player API:

- player tối thiểu 200 × 200; desktop nên theo tỷ lệ 16:9.
- gửi `origin` và không suppress HTTP Referer.
- không che controls/branding bằng overlay.
- timestamp click gọi `seekTo(seconds, true)`.
- xử lý error 100, 101/150 và 153 thành error code sản phẩm.

Transcript đặt cạnh/bên dưới player, không phủ lên player.

## 5. TranscriptProvider contract

```ts
interface TranscriptProvider {
  inspect(videoId: string): Promise<TranscriptAvailability>;
  fetch(input: {
    videoId: string;
    preferredLanguage: "en";
    allowAutoGenerated: boolean;
  }): Promise<TranscriptResult>;
}
```

`TranscriptResult` tối thiểu:

```ts
type TranscriptResult = {
  provider: string;
  sourceType: "manual-caption" | "auto-caption";
  language: string;
  fetchedAt: string;
  segments: Array<{
    text: string;
    startMs: number;
    durationMs?: number;
  }>;
};
```

Yêu cầu:

- API key chỉ ở server.
- timeout và retry có giới hạn.
- không retry vô hạn lỗi 4xx.
- ghi provider request ID nhưng không log toàn transcript.
- circuit breaker đơn giản khi provider liên tục thất bại.
- có fixture provider cho test, không gọi vendor trong unit test.

## 6. AI generation

### 6.1 Provider-independent contract

```ts
interface LessonGenerationProvider {
  generate(input: LessonGenerationInput): Promise<LessonGenerationResult>;
}
```

Provider phải hỗ trợ structured output hoặc JSON Schema. OpenAI và Gemini đều có cơ chế structured output; provider vẫn cần semantic validation vì schema đúng không đảm bảo trích dẫn đúng hay nội dung giáo dục tốt.

### 6.2 Hai lớp validation

**Lớp 1 — Structural**

- parse thành công;
- đúng schema version;
- đúng kiểu dữ liệu;
- đúng số lượng vocabulary/phrases/questions;
- enum hợp lệ;
- không có field lạ nếu schema cấm.

**Lớp 2 — Semantic**

- mọi `source_quote` phải map tới transcript segment;
- grammar point phải có evidence segment;
- câu hỏi comprehension phải trả lời được từ transcript;
- đáp án đúng tồn tại trong options;
- không lặp vocabulary;
- mức độ phù hợp level.

Nếu structural fail: retry tối đa một lần với lỗi validation cụ thể. Nếu semantic fail: sửa cục bộ hoặc regenerate tối đa một lần. Sau đó fail closed.

### 6.3 Prompt shape

Prompt gồm:

- system policy cố định;
- level rubric;
- lesson schema version;
- transcript segments có stable IDs;
- yêu cầu mọi quote trả `segment_id` thay vì chỉ text;
- cấm suy diễn nội dung không có trong transcript;
- phân biệt `source_quote` và `generated_example`.

Dùng segment ID giúp quote grounding deterministic hơn fuzzy string matching.

## 7. Auth và dữ liệu

Supabase Auth tích hợp trực tiếp với Postgres và RLS. Khuyến nghị:

- magic link hoặc OTP email cho private beta;
- mọi table public phải bật RLS;
- policy `auth.uid() = user_id` cho `lesson_jobs` và `lessons`;
- service role chỉ dùng trong server code, không bao giờ expose browser;
- delete Lesson kiểm tra owner cả ở application layer và RLS.

Mô hình dữ liệu tối thiểu:

```text
profiles
lesson_jobs
videos
transcripts
lessons
```

Không tạo table Flashcard trong MVP.

### 7.1 Trạng thái job

```text
queued
validating_video
fetching_transcript
normalizing_transcript
generating_lesson
validating_output
completed
failed
```

Job chứa:

- `id`, `user_id`, `video_id`, `level`;
- `status`, `error_code`, `attempt_count`;
- `idempotency_key`;
- timestamps từng phase;
- provider names và request IDs;
- token/cost metadata khi có.

## 8. Execution và deployment

Vercel Functions với Fluid Compute phù hợp private beta vì Node.js function trên Hobby có thể chạy tối đa 300 giây. Tuy nhiên không được giữ state trong memory của function.

MVP nên:

- ghi job vào Postgres trước khi gọi provider;
- trả job ID sớm;
- client poll trạng thái hoặc dùng Supabase Realtime;
- worker cập nhật từng phase;
- đặt hard timeout thấp hơn platform timeout;
- dùng idempotency để tránh tạo hai Lesson khi retry/reload.

Cơ chế worker có thể bắt đầu bằng Vercel Function dài và chuyển sang queue/workflow khi traffic tăng. Architecture workflow sẽ chốt execution mechanism dựa trên hosting plan đã được cấp.

## 9. Giới hạn đầu vào

Không chỉ dùng thời lượng video. Dùng cả:

1. Video duration limit — đề xuất 30 phút cho beta.
2. Normalized transcript token budget — chốt sau khi chọn AI model.
3. Segment count limit.
4. Maximum request cost estimate.

Nếu vượt giới hạn, fail trước khi gọi AI và hiển thị lý do cụ thể. Không silently truncate transcript vì có thể làm summary/questions sai nội dung.

## 10. Reliability và observability

Mỗi job ghi:

- success/failure của metadata, transcript và AI;
- latency mỗi phase;
- provider HTTP status/error category;
- auto-caption hay manual-caption;
- transcript length và segment count;
- AI input/output token usage;
- schema retry và semantic retry;
- total cost estimate.

Không log:

- API keys;
- auth tokens;
- full transcript;
- toàn bộ AI prompt chứa transcript.

## 11. Testing strategy

### Unit

- YouTube URL parser.
- ISO 8601 duration parser.
- transcript normalization.
- schema validation.
- segment ID quote grounding.
- error mapping.
- idempotency.

### Integration

- metadata provider fixture.
- transcript provider sandbox/fixture.
- AI structured output fixture.
- Supabase RLS policies.

### E2E

- login → create → processing → lesson → complete → library → reopen → delete.
- invalid URL.
- unavailable transcript.
- auto-caption warning.
- provider timeout.
- reload during processing.
- unauthorized lesson access.

## 12. Quyết định kỹ thuật đề xuất

| Mã | Quyết định | Trạng thái |
|---|---|---|
| TR-1 | Next.js App Router + TypeScript | Đề xuất chấp nhận |
| TR-2 | Supabase Auth/Postgres + RLS | Đề xuất chấp nhận |
| TR-3 | YouTube Data API cho metadata, IFrame API cho playback | Đề xuất chấp nhận |
| TR-4 | TranscriptProvider adapter | Bắt buộc |
| TR-5 | Không dùng scraping library làm production dependency | Đề xuất chấp nhận |
| TR-6 | Private beta dùng transcript API bên thứ ba ở chế độ native caption | Cần owner/API key/pháp lý phê duyệt |
| TR-7 | AI provider adapter + structured output + semantic validation | Đề xuất chấp nhận |
| TR-8 | Persisted job state + idempotency | Bắt buộc |
| TR-9 | 30 phút + token budget, không silent truncation | Đề xuất chấp nhận |

## 13. Blocker trước UX/Architecture

Cần một quyết định sản phẩm/API lớn:

> Vidlish có chấp nhận dùng transcript API bên thứ ba cho private beta không?

Nếu không, scope phải đổi thành một trong hai:

- chỉ video thuộc kênh đã OAuth;
- hoặc người dùng tự dán transcript.

Không nên tiếp tục giả định rằng API chính thức lấy được transcript của video công khai bất kỳ.

## 14. Nguồn chính

- YouTube Captions: download: https://developers.google.com/youtube/v3/docs/captions/download
- YouTube Captions: list: https://developers.google.com/youtube/v3/docs/captions/list
- YouTube Videos: list: https://developers.google.com/youtube/v3/docs/videos/list
- YouTube Data API overview/quota: https://developers.google.com/youtube/v3/getting-started
- YouTube IFrame API: https://developers.google.com/youtube/iframe_api_reference
- Required Minimum Functionality: https://developers.google.com/youtube/terms/required-minimum-functionality
- YouTube Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Next.js Auth: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Vercel Function duration: https://vercel.com/docs/functions/configuring-functions/duration
- Vercel Fluid Compute: https://vercel.com/docs/fluid-compute
- OpenAI Structured Outputs: https://openai.com/index/introducing-structured-outputs-in-the-api/
- Gemini Structured Outputs: https://ai.google.dev/gemini-api/docs/structured-output
- youtube-transcript-api issues: https://github.com/jdepoix/youtube-transcript-api/issues
- TranscriptAPI docs: https://transcriptapi.com/docs/api/
- Supadata transcript docs: https://docs.supadata.ai/api-reference/endpoint/transcript/transcript
