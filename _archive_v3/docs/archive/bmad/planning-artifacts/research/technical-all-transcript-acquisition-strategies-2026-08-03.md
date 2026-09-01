---
stepsCompleted: [1, 2, 3, 4, 5, 6]
workflowType: research
research_type: technical
research_topic: Tất cả phương án lấy hoặc tạo transcript cho Vidlish
research_goals: Tối đa hóa coverage video YouTube trong khi tách rõ độ ổn định, chi phí, trải nghiệm và rủi ro pháp lý
user_name: Creativity
date: 2026-08-03
web_research_enabled: true
source_verification: true
status: complete
---

# Technical Research: mọi cách lấy hoặc tạo transcript cho Vidlish

## 1. Kết luận điều hành

Không có một API duy nhất bảo đảm xử lý mọi video. Cách đạt coverage cao nhất là một **waterfall nhiều tầng**, trong đó caption có sẵn là đường nhanh và audio-to-text là đường bảo đảm.

Đề xuất cuối cùng cho Vidlish:

```text
YouTube URL
  → metadata + policy checks
  → official/available caption
  → hosted transcript provider
  → unofficial web-client extractor
  → user-approved tab audio capture + cloud STT
  → Chrome extension tabCapture + cloud/on-device STT
  → user upload/paste fallback
  → desktop companion for difficult cases
```

Vidlish không được coi `NO_CAPTIONS` là lỗi cuối cùng. Nó phải đổi sang một acquisition strategy khác.

## 2. Ma trận toàn bộ phương án

| # | Phương án | Coverage | Ổn định | Chi phí | Thao tác người dùng | Rủi ro | Vai trò đề xuất |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | YouTube Captions API cho video người dùng sở hữu | Thấp với video công cộng bất kỳ | Rất cao | Thấp | OAuth | Thấp | Đường chính cho creator-owned videos |
| 2 | Transcript hiển thị sẵn trên YouTube, đọc bằng extension/DOM | Trung bình-cao với video có captions | Trung bình | Thấp | Cài extension | Trung bình | Fast path ở client |
| 3 | Unofficial YouTube web-client/InnerTube extractor | Cao với video có manual/auto captions | Trung bình-thấp | Thấp-trung bình | Không | Cao hơn | Fast path có fallback |
| 4 | `youtube-transcript-api` self-hosted | Cao với captions | Trung bình-thấp | Thấp + proxy khi cần | Không | Cao hơn | Prototype/private beta |
| 5 | `yt-dlp` lấy manual/auto subtitles | Cao với captions | Trung bình | Thấp + maintenance | Không | Cao hơn | Worker fallback |
| 6 | Headless browser mở transcript panel và đọc DOM/network | Cao với captions | Thấp-trung bình | Trung bình | Không | Cao | Fallback cuối cho caption extraction |
| 7 | Transcript API bên thứ ba | Cao với captions; một số vendor có ASR | Trung bình-cao | Theo usage | Không | Phụ thuộc vendor | MVP nhanh nhất |
| 8 | Web app `getDisplayMedia()` chia sẻ tab + STT | Rất cao với video phát được | Trung bình | STT usage | Chọn tab + bật audio | Thấp-trung bình | Fallback web không cần extension |
| 9 | Chrome extension `tabCapture` + STT | Rất cao với video phát được | Cao trên Chrome | STT usage | Cài extension + click | Trung bình | Đường coverage tốt nhất cho sản phẩm |
| 10 | Extension đọc subtitle DOM, nếu thiếu thì capture audio | Rất cao | Cao | Thấp khi có caption, STT khi thiếu | Cài extension | Trung bình | Kiến trúc tối ưu dài hạn |
| 11 | Desktop companion/Electron loopback audio + STT | Gần tối đa với audio phát được | Cao sau khi cài | STT hoặc local compute | Cài app + OS permissions | Trung bình | Fallback mạnh nhất |
| 12 | On-device Whisper/whisper.cpp | Rất cao nếu có audio | Phụ thuộc máy | Gần 0 API cost | Chờ model/inference | Thấp về dữ liệu | Tùy chọn privacy/cost |
| 13 | Cloud STT streaming/batch | Rất cao nếu có audio | Cao | Theo phút/audio | Không thêm nếu đã capture | Phụ thuộc provider | Default ASR engine |
| 14 | User upload SRT/VTT/TXT | Cao khi user có file | Rất cao | Thấp | Upload file | Thấp | Fallback hợp pháp, đơn giản |
| 15 | User paste transcript | Trung bình | Rất cao | Thấp | Copy/paste | Thấp | Fallback cuối tối giản |
| 16 | User upload audio/video hợp pháp | Cao | Cao | STT cost | Upload file | Thấp hơn server download | Fallback cho nội dung sở hữu |
| 17 | Server-side tải audio rồi STT | Rất cao kỹ thuật | Trung bình | Compute + bandwidth + STT | Không | Cao nhất | Không dùng production mặc định |
| 18 | Browser Web Speech API trên audio track | Trung bình | Thấp | Có thể thấp | Browser-specific | Trung bình | Chỉ thử nghiệm |

## 3. Nhóm A — nguồn caption

### A1. YouTube Captions API chính thức

`captions.list` chỉ trả metadata caption track. `captions.download` trả nội dung nhưng yêu cầu OAuth và quyền chỉnh sửa video. Vì vậy đây là giải pháp tốt cho video thuộc kênh người dùng kết nối, không giải quyết toàn bộ video công cộng.

Nguồn:
- https://developers.google.com/youtube/v3/docs/captions/list
- https://developers.google.com/youtube/v3/docs/captions/download

### A2. Đọc transcript đang hiển thị trên YouTube bằng extension

YouTube có UI **Show transcript** cho video có captions. Chrome content script có thể đọc DOM của trang đang mở sau khi người dùng cấp quyền. Cách này không cần server gọi YouTube để lấy caption, nhưng phụ thuộc cấu trúc DOM và cần cập nhật khi YouTube đổi UI.

Nguồn:
- https://support.google.com/youtube/answer/15930243
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

### A3. Unofficial web-client/InnerTube extraction

Thư viện `youtube-transcript-api` lấy được manual captions và auto-generated captions mà không cần API key hoặc headless browser. Chính README của thư viện cảnh báo rằng nó dùng phần undocumented của YouTube web client và có thể ngừng hoạt động khi YouTube thay đổi. Thư viện cũng hỗ trợ proxy/cookie khi IP bị chặn.

Nguồn:
- https://github.com/jdepoix/youtube-transcript-api

### A4. `yt-dlp` subtitle extraction

`yt-dlp` hỗ trợ `--write-subs` và `--write-auto-subs`. Đây là worker/tool fallback mạnh nhưng cũng dựa vào extractor không chính thức và cần cập nhật thường xuyên.

Nguồn:
- https://github.com/yt-dlp/yt-dlp/blob/master/README.md

### A5. Headless browser/network interception

Worker mở trang YouTube bằng Playwright/Puppeteer, mở transcript panel hoặc quan sát request caption mà web client thực hiện. Coverage có thể cao nhưng tốn compute, dễ vỡ khi UI/network đổi và khó scale.

Khuyến nghị: chỉ dùng sau các extractor nhẹ hơn, không phải đường chính.

### A6. Hosted transcript providers

Ví dụ:

- TranscriptAPI: endpoint nhận URL/video ID và trả segment `text`, `start`, `duration`.
- Supadata: `native`, `auto` hoặc `generate`; `auto` thử transcript có sẵn rồi chuyển sang AI transcription.

Nguồn:
- https://transcriptapi.com/docs/api/
- https://docs.supadata.ai/api-reference/endpoint/transcript/transcript

Ưu điểm: nhanh đưa MVP ra thị trường. Nhược điểm: chi phí, lock-in, SLA, nguồn dữ liệu và data retention phải được kiểm tra.

## 4. Nhóm B — lấy audio do người dùng cấp quyền

### B1. Web app chia sẻ tab bằng `getDisplayMedia()`

Một website HTTPS có thể yêu cầu người dùng chọn tab/window/screen và chia sẻ audio. Kết quả là `MediaStream`; app dùng `MediaRecorder` hoặc `AudioWorklet` để chia audio thành chunk và gửi tới STT. Quyền phải được hỏi lại mỗi phiên và browser support của audio capture không đồng nhất.

Nguồn:
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture
- https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet

Luồng UX:

```text
Không tìm thấy captions
→ Vidlish hiển thị “Tạo transcript từ âm thanh”
→ user bấm
→ chọn tab YouTube + Share tab audio
→ Vidlish ghi nhận audio tạm thời theo chunk
→ STT trả segment có timestamp
→ dừng capture và giải phóng stream
```

### B2. Chrome extension `tabCapture`

Extension có thể lấy `MediaStream` chứa audio/video của tab hiện tại sau thao tác chủ động của user. Đây là cách ổn định và ít bước hơn `getDisplayMedia()` cho Chrome. Có thể chạy capture trong offscreen document và vẫn giữ âm thanh phát cho user qua `AudioContext`.

Nguồn:
- https://developer.chrome.com/docs/extensions/reference/api/tabCapture

Đây là hướng gần nhất với Trancy: extension tương tác trực tiếp với trang/video và dùng AI transcription khi subtitle gốc không đủ.

### B3. Extension hybrid

Một extension duy nhất có hai mode:

1. Đọc transcript/captions từ DOM hoặc web-client khi có.
2. Nếu không có, tự chuyển sang `tabCapture` và STT.

Đây là phương án tốt nhất để cân bằng tốc độ, chi phí và coverage.

### B4. Desktop companion/Electron

Electron `desktopCapturer` có thể cấp nguồn screen/window và loopback audio cho `getDisplayMedia`. Desktop app xử lý tốt hơn browser đối với capture dài, background processing, local models và OS-specific audio. Đổi lại phải cài app và xử lý permission khác nhau trên Windows/macOS/Linux.

Nguồn:
- https://www.electronjs.org/docs/latest/api/desktop-capturer

## 5. Nhóm C — speech-to-text

### C1. Cloud streaming STT

Audio chunks từ tab capture có thể stream đến dịch vụ STT. Google Cloud, Deepgram, Azure và AWS đều hỗ trợ real-time hoặc streaming transcription.

Nguồn:
- https://docs.cloud.google.com/speech-to-text/docs/streaming-recognize
- https://developers.deepgram.com/docs/live-streaming-audio
- https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text
- https://docs.aws.amazon.com/transcribe/latest/dg/streaming.html

Ưu điểm: ổn định, nhanh, không phụ thuộc cấu hình máy user. Nhược điểm: chi phí, API key và chính sách dữ liệu.

### C2. Batch/pre-recorded STT

Capture audio thành file/chunks rồi gửi batch transcription. Dễ retry và thường cho chất lượng/segmentation ổn định hơn streaming; người dùng phải chờ đến khi audio đủ dài hoặc video phát xong.

### C3. On-device `whisper.cpp`

`whisper.cpp` hỗ trợ Windows, macOS, Linux, mobile và WebAssembly. Có demo browser và streaming. Cách này giảm chi phí API, tăng privacy, nhưng tốc độ và memory phụ thuộc thiết bị; model từ tiny đến large có footprint rất khác nhau.

Nguồn:
- https://github.com/ggml-org/whisper.cpp

### C4. Browser Web Speech API

`SpeechRecognition.start(audioTrack)` có thể nhận một `MediaStreamTrack` trong một số browser, nhưng API chưa Baseline và trên Chrome có thể dùng server-side recognition. Không nên làm đường production chính.

Nguồn:
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

## 6. Nhóm D — input do user cung cấp

### D1. Upload subtitle file

Cho phép SRT, VTT, SBV hoặc TXT. Đây là phương án ổn định và minh bạch nhất khi user có file.

### D2. Paste transcript

Không timestamp thì Vidlish có thể:

- tạo bài học không có timestamp; hoặc
- chạy alignment với audio capture; hoặc
- yêu cầu user dùng bài học text-only.

### D3. Upload audio/video file

User xác nhận họ có quyền dùng file; Vidlish chạy STT trên file thay vì tự tải từ YouTube. Đây là fallback pháp lý tốt hơn server-side download.

### D4. Google OAuth cho creator-owned video

User kết nối kênh YouTube; Vidlish dùng API chính thức để tải caption track của video họ có quyền chỉnh sửa.

## 7. Nhóm E — phương án rủi ro cao

### E1. Server-side audio extraction/download

Dùng extractor như `yt-dlp` để lấy audio rồi gửi STT. Kỹ thuật này cho coverage cao và user ít thao tác, nhưng có rủi ro lớn nhất về YouTube Terms, bản quyền, IP blocking và bandwidth. Không nên là default production path; chỉ cân nhắc cho nội dung người dùng sở hữu hoặc môi trường thử nghiệm đã được legal review.

### E2. Proxy/residential IP pool

Có thể giảm IP blocking cho unofficial extractor. Tuy nhiên đây là operational workaround, không biến một cơ chế undocumented thành API ổn định hoặc được YouTube bảo đảm.

### E3. Cookie-authenticated extraction

Có thể xử lý một số nội dung yêu cầu phiên đăng nhập, nhưng làm tăng rủi ro bảo mật và compliance. Không yêu cầu user đưa cookie cho server trong MVP.

### E4. Browser automation đọc network nội bộ

Có thể intercept endpoint caption của YouTube web client. Đây là kỹ thuật maintenance-heavy và chỉ nên nằm sau interface adapter để thay thế nhanh.

## 8. Benchmark Trancy

Trancy có Chrome extension và web learning center. Tài liệu chính thức của họ nói AI Subtitles dùng OpenAI Whisper để chuyển audio YouTube thành subtitles bất đồng bộ trong khoảng vài phút. Điều này xác nhận mô hình **extension + audio transcription fallback** đang được dùng trong sản phẩm thực tế.

Nguồn:
- https://www.trancy.org/en/ai-subtitle
- https://chromewebstore.google.com/detail/trancy-ai-translator-dual/mjdbhokoopacimoekfgkcoogikbfgngb

## 9. Kiến trúc coverage-first đề xuất

```text
TranscriptAcquisitionOrchestrator
├── OwnedVideoCaptionsProvider       # official OAuth
├── HostedTranscriptProvider         # vendor API
├── WebClientCaptionProvider         # unofficial extractor
├── BrowserDomCaptionProvider        # extension content script
├── BrowserTabAudioProvider          # getDisplayMedia
├── ExtensionTabAudioProvider        # chrome.tabCapture
├── DesktopLoopbackAudioProvider     # Electron companion
├── UploadedSubtitleProvider
├── UploadedMediaProvider
└── SpeechToTextProvider
    ├── CloudStreamingSttProvider
    ├── CloudBatchSttProvider
    └── OnDeviceWhisperProvider
```

Mọi kết quả được chuẩn hóa về:

```ts
type TranscriptSource =
  | "official-caption"
  | "youtube-ui-caption"
  | "web-client-caption"
  | "third-party-caption"
  | "cloud-asr"
  | "on-device-asr"
  | "uploaded-subtitle"
  | "user-pasted";

type TranscriptResult = {
  source: TranscriptSource;
  language: string;
  isAutoGenerated: boolean;
  confidence?: number;
  segments: Array<{
    id: string;
    text: string;
    startMs?: number;
    durationMs?: number;
  }>;
};
```

## 10. Waterfall triển khai thực tế

### Phase 1 — web MVP nhanh

1. Hosted transcript provider.
2. Self-hosted unofficial extractor fallback.
3. Upload/paste transcript.
4. `getDisplayMedia()` + cloud STT fallback.

### Phase 2 — extension

5. Chrome extension đọc caption DOM.
6. `tabCapture` + streaming/batch STT.
7. Gửi transcript về Vidlish web app để tạo lesson.

### Phase 3 — maximum coverage

8. On-device Whisper option.
9. Desktop companion loopback audio.
10. Creator OAuth official captions.
11. Multi-provider routing theo cost/latency/quality.

## 11. Quyết định sản phẩm đề xuất

Vidlish nên hứa:

> Dán một video YouTube công khai. Vidlish ưu tiên phụ đề có sẵn; nếu không có, hệ thống hướng dẫn bạn tạo transcript từ âm thanh của tab đang phát.

Không nên hứa “100% mọi video” vì vẫn có các trường hợp không thể bảo đảm:

- video bị xóa hoặc private mà user không có quyền;
- video bị chặn theo vùng/tài khoản;
- DRM hoặc browser không cho capture audio;
- video không có lời nói hoặc âm thanh quá kém;
- user từ chối quyền capture;
- nền tảng thay đổi endpoint undocumented.

Mục tiêu kỹ thuật đúng là **maximum practical coverage**, không phải guarantee tuyệt đối.

## 12. Khuyến nghị cuối cùng

Kiến trúc được chọn:

```text
Caption-first + audio-fallback + extension-first long term
```

Thứ tự ưu tiên:

1. Transcript provider API để ra MVP nhanh.
2. Unofficial extractor tự host để giảm phụ thuộc vendor.
3. Web tab-share audio + cloud STT để không bị giới hạn bởi caption.
4. Chrome extension hybrid để UX gần Trancy và coverage cao.
5. On-device Whisper hoặc desktop companion khi cần giảm chi phí/tăng coverage.

Không được xây domain logic phụ thuộc một nguồn transcript. Mọi nguồn nằm sau adapter và orchestrator; provider fail chỉ làm chuyển tầng, không làm kết thúc toàn bộ job.