# Bàn giao Vidlish — đọc file này trước khi làm bất cứ điều gì

Tài liệu này dành cho một AI hoặc lập trình viên tiếp quản dự án. Nó không lặp lại
những gì đọc code là biết. Nó ghi lại **những thứ đắt tiền mới khám phá ra được** —
phần lớn là các cái bẫy chỉ lộ ra khi gọi API thật, và vài chỗ **tài liệu chính thức
của Google nói sai so với thực tế đo được**.

---

## 1. Sản phẩm là gì

Dán link YouTube → AI soạn bài học tiếng Anh từ đúng nội dung video → người dùng học.
Không hơn. Mọi tính năng không phục vụ đúng câu đó đều là phạm vi bị loại.

Người dùng là người Việt tự học tiếng Anh. Giao diện tiếng Việt, nội dung dạy là
tiếng Anh.

## 2. Lời hứa cốt lõi và cách nó được bảo vệ

**Mọi câu trích dẫn trong bài học phải là lời thoại có thật trong video.**

Cách bảo vệ không phải là kiểm tra sau khi model trả lời, mà là làm cho việc bịa đặt
**không thể biểu diễn được**:

- `lessonDraftSchema` (`src/shared/contracts/lesson.ts`) **không có trường nào chứa
  văn bản trích dẫn**. Model chỉ trả về `sourceSegmentIds`.
- Câu gốc được server hydrate lại từ `transcript_segments` theo ID đó.
- `hydrateLessonCitations` (`src/modules/lesson/application/`) là cổng grounding: trích
  ID ngoài danh sách được phép → ném `LessonGroundingError`, bài học không được lưu.

Khi sửa bất cứ thứ gì gần chỗ này, giữ nguyên tính chất đó. Đừng bao giờ để model trả
về text trích dẫn.

## 3. Kiến trúc

Hexagonal. `src/modules/*/ports` là interface, `src/modules/*/application` là use case,
`src/adapters/*` là hiện thực, `src/platform/*` là composition root.

Quy tắc: use case không biết gì về Supabase, Gemini hay Supadata. Muốn thêm nhà cung
cấp mới thì thêm adapter, không sửa use case.

Luồng: `video → lesson_jobs → transcripts + transcript_segments →
language_eligibility_reports + language_eligible_segments → lessons`

## 4. NHỮNG CÁI BẪY ĐÃ TRẢ GIÁ ĐỂ BIẾT

Đây là phần quan trọng nhất của tài liệu này. Mỗi mục dưới đây đều đã làm hỏng sản
phẩm một lần.

### 4.1 Gemini từ chối schema JSON đầy đủ

Gemini biên dịch `responseJsonSchema` thành máy trạng thái trước khi phục vụ. Schema
bài học đầy đủ vượt ngân sách → `400 The specified schema produces a constraint that
has too many states for serving`.

Phải lược 6 keyword trước khi gửi: `$schema`, `pattern`, `minLength`, `maxLength`,
`minItems`, `maxItems` (xem `stripUnsupportedConstraints` trong
`src/adapters/gemini/gemini-lesson-provider.ts`).

**Tài liệu Google nói `minItems`/`maxItems` được hỗ trợ. Đo thực tế: vẫn bị từ chối.**
Đã thử giữ lại chúng, vẫn 400. Đừng thử lại.

Ràng buộc bị lược không mất — `lessonDraftSchema` vẫn kiểm tra đủ ở phía ta, và prompt
nhắc lại bằng lời.

Khi lược, **chỉ lược keyword ở tầng schema, không đụng tên trường trong `properties`** —
`grammarPoints` có một trường tên đúng là `pattern`.

### 4.2 Đừng bắt model chép ID dài — lỗi này từng làm hỏng MỌI bài học

Ban đầu prompt hiển thị segment kèm ID thật (`seg_` + 32 hex) và bảo model chép lại.
`gemini-3.5-flash-lite` trả về **đúng 32 hex của đúng segment nhưng rụng tiền tố
`seg_`**. Mọi `sourceSegmentIds` trượt validation → không bài học nào tạo được.

Giải pháp hiện tại: transcript hiển thị nhãn ngắn `[S1] [S2] [S3]`, `resolveSegmentLabels`
ánh xạ ngược về ID thật **trước khi** validate. Nhãn sai thì hỏng to tiếng chứ không âm
thầm trích nhầm segment.

Nguyên tắc rút ra: **model nhỏ không đáng tin trong việc sao chép chuỗi dài vô nghĩa.**
Nếu cần model tham chiếu thứ gì, cho nó nhãn ngắn.

### 4.3 `thinking_level` mặc định là MINIMAL

`gemini-3.5-flash-lite` mặc định `thinking_level = MINIMAL`. Ở mức đó bài học chạm đáy
mọi khoảng (1 điểm ngữ pháp, 3 câu hỏi).

Đo trên cùng transcript, 3 lần mỗi mức:

| thinking_level | ngữ pháp | câu hỏi | thời gian |
|---|---|---|---|
| MINIMAL | 1, 1, 2 | 3, 3, 4 | ~8s |
| HIGH | 2, 2, 2 | 4, 4, 4 | ~16–19s |

Đang đặt `ThinkingLevel.HIGH` cho bước soạn bài. Dùng **enum của SDK**, không dùng
chuỗi `"high"` — chuỗi bị TypeScript từ chối, nghĩa là viết ẩu sẽ thành tuỳ chọn bị bỏ
qua âm thầm.

Nếu sau này thêm bước phiên âm bằng Gemini thì bước đó nên để `MINIMAL` — tài liệu
Google khuyên đúng mức này cho tác vụ trích xuất sự kiện.

### 4.4 Đừng đụng `temperature` / `top_p` / `top_k` trên Gemini 3.x

Tài liệu Google cảnh báo rõ: sửa các tham số này trên model 3.x "có thể gây lặp vô hạn
hoặc suy giảm chất lượng". Code hiện tại không đụng tới. Giữ nguyên như vậy.

### 4.5 Bộ e2e từng tự bóp cổ chính nó

Hai project Playwright dùng chung một dev server và một beta user, chạy nhanh hơn người
thật nên vượt `GENERATION_MAX_JOBS_PER_MINUTE=3`, và project chạy sau hỏng với thông
báo "Bạn thao tác quá nhanh".

Đã sửa bằng cách đặt hạn ngạch rộng ngay trong `webServer.env` của `playwright.config.ts`.
Nếu thấy e2e đỏ ở project thứ hai, nghĩ tới hạn ngạch trước khi nghĩ tới lỗi sản phẩm.

### 4.6 pgTAP: hai cái bẫy

- `plan(N)` phải khớp **chính xác** số assertion. Lệch một là cả file đỏ dù mọi
  assertion đều pass. **Đếm bằng máy, đừng đếm tay.**
- `throws_ok(query, errcode, X)` với SQLSTATE thì `X` là **thông điệp lỗi mong đợi**,
  không phải mô tả. Muốn có mô tả thì dùng dạng bốn tham số:
  `throws_ok(query, '23514', null, 'mô tả')`.

### 4.7 Build production tại máy cần đủ biến môi trường

`pnpm build` sẽ hỏng với "Server application configuration is invalid" nếu thiếu.
Cần `CI=true` cộng toàn bộ khối `env:` trong `.github/workflows/ci.yml`. GitHub Actions
tự đặt `CI` nên CI không bao giờ lộ vấn đề này.

## 5. Số liệu đã đo (đừng đo lại, tốn quota)

### Phân rã thời gian một bài học (video 3m34s, 61 segment)

| Bước | Thời gian | Tỉ trọng |
|---|---|---|
| Gemini soạn bài | 13.595ms | **68%** |
| Supadata + chuẩn hoá | 5.919ms | **30%** |
| YouTube Data API | 410ms | 2% |
| Cổng tiếng Anh (franc) | 27ms | 0,1% |
| **Tổng** | **~20s** | |

Supadata tự nó tốn 2,5–3,8s (byte đầu ≈ tổng → xử lý phía máy chủ họ, kết nối chỉ 55ms).
Không tối ưu được.

### Đã thử và BÁC BỎ: chẻ Gemini thành 2 lời gọi song song

| | Thời gian tường | Token output |
|---|---|---|
| Một lời gọi | 6,74s | 1.948 |
| Hai lời gọi song song | 4,78s | 2.374 |

Nhanh hơn 29% nhưng tốn thêm 22% token, gấp đôi mức tiêu RPM, và hai nửa không thấy
nhau nên nội dung dễ trùng trọng tâm. **Không đáng.** Đừng làm lại.

### Gemini đọc thẳng URL YouTube (phương án thay Supadata)

Gemini nhận `fileData: { fileUri: "https://www.youtube.com/watch?v=..." }` và tự nghe
ra lời thoại kèm mốc thời gian. Đã kiểm chứng chạy được.

| Cấu hình | Video token (video 3m33s) | Quy đổi |
|---|---|---|
| Mặc định | 19.386 | ~91 token/giây |
| **`videoMetadata: { fps: 0.2 }`** | **8.165** | **~38 token/giây** |
| `mediaResolution: LOW` | 19.386 | **không tác dụng** |

Hạ `fps` **không làm giảm chất lượng lời thoại** (âm thanh không phụ thuộc fps) — đã so
từng câu, lệch mốc thời gian dưới nửa giây.

**Tài liệu Google nói ~300 token/giây và nói `mediaResolution` là đòn bẩy. Cả hai đều
sai với URL YouTube trên model này.**

## 6. Hạn mức các dịch vụ

### Supadata (gói Free)

| | |
|---|---|
| Hạn mức | **100 credit/tháng**, 1 request/giây |
| `mode=native` | **1 credit** |
| `mode=generate` | **2 credit mỗi PHÚT video** |
| Kiểm tra còn bao nhiêu | `GET https://api.supadata.ai/v1/me` → `maxCredits`, `usedCredits` |

**Không bao giờ dùng `mode=generate` ở gói Free.** Video 10 phút ăn 20 credit — một
phần năm hạn mức cả tháng.

Thiết kế phân tầng đúng:
1. **Tầng 0** — YouTube Data API (1 đơn vị): lấy duration và `defaultAudioLanguage` để
   **chặn sớm trước khi tiêu credit**.
2. **Tầng 1** — Supadata `mode=native` (1 credit): phụ đề gốc, verbatim, chính xác.
3. **Tầng 2** — Gemini đọc URL YouTube, `fps: 0.2` (0 credit): cho video không phụ đề.

Nên đặt mức dự trữ: ngừng dùng Supadata khi còn dưới ~10 credit.

**Lưu ý về sự thật**: Gemini ASR **không phải phụ đề gốc**, nó là thứ model nghe được và
có thể nhầm tên riêng. Kiến trúc đã lường trước — `sourceType` phân biệt `native_caption`
với `generated`. Tầng 2 phải ghi đúng là `generated`, và giao diện nên nói rõ mức tin cậy
khác nhau.

### YouTube Data API

10.000 đơn vị/ngày. `videos.list` tốn 1 → ~10.000 video/ngày. Đủ dùng thoải mái.

**`captions.list` cần OAuth, API key không đủ.** Nên không thể dùng nó để dò trước xem
video có phụ đề hay không nhằm tiết kiệm credit Supadata. Ngõ cụt, đừng đi lại.

### Gemini (gói Free)

- `gemini-3.5-flash-lite`: 15 RPM, 250K TPM, **500 RPD** — hạn mức tốt nhất trong các model
- `gemini-3.6-flash` / `gemini-3.5-flash` / `gemini-2.5-flash`: chỉ 5 RPM, **20 RPD**
- Tối đa **8 giờ video YouTube/ngày**
- Chỉ video công khai

Chất lượng đo được trên cùng transcript: `gemini-2.5-flash` soạn bài **dày nhất**
(14 từ vựng / 7 cụm / 3 ngữ pháp), nhưng chỉ 20 RPD. `gemini-3.5-flash` **chậm bất
thường** (có lần 102 giây) mà không dày hơn — không đáng dùng.

Mặc định hiện tại là `gemini-3.5-flash-lite`, đổi qua `LESSON_MODEL_ID` không cần sửa code.

### Điều khoản — QUAN TRỌNG trước khi có người dùng thật

Free tier: **Google dùng dữ liệu gửi lên để cải thiện sản phẩm, người thật có thể đọc
prompt và kết quả**, và điều khoản ghi rõ free tier "không dành cho triển khai tới người
dùng cuối".

Giá trả phí `gemini-3.5-flash-lite`: $0,30/1M input, $2,50/1M output →
**~$0,006/bài học** khi có phụ đề gốc, **~$0,016** khi phải dùng Gemini nghe video.
100 bài/tháng ≈ $1,6.

**Bật billing trước khi mở cho người học thật.** Nó cũng mở khoá **flex inference
(giảm 50% giá)** — hợp đúng với dự án này vì soạn bài là tác vụ nền chịu được gián đoạn.
Đã thử trên free tier: `serviceTier` là trường hợp lệ nhưng giá trị bị từ chối.

## 7. Trạng thái hiện tại

### Đã chạy được thật

Chuỗi hoàn chỉnh đã chạy đầu-cuối với dịch vụ thật, 21,7 giây:
`YouTube Data API → Supadata (61 segment phụ đề gốc) → franc → Gemini → bài học 10 trích dẫn`.
Xem `tests/integration/full-real-path.test.ts`.

### Đã hoàn thành sau bàn giao

- **Schema đã đẩy lên Supabase ngày 2026-08-05.** Đã áp dụng đủ 6 migration trong
  `supabase/migrations/` lên project **AtoEnglish** (`zpiwddskhduuykpxltun`), tạo đủ
  9 bảng mới mà không đụng các bảng có sẵn. Đã kiểm tra cả 9 bảng đều bật RLS, đủ 8
  RPC, và `lesson_jobs` có đủ ba liên kết `canonical_transcript_id`,
  `language_eligibility_report_id`, `lesson_id`. Không chạy lại các migration này bằng
  SQL Editor. Trạng thái triển khai tiếp theo được theo dõi ở issue #19.

### Chưa làm

- **Chưa kiểm chứng durable flow với Supabase thật + Inngest dispatcher.** Đây là bước
  tiếp theo, trước khi quyết định deploy.
- **Lấy Inngest key không phụ thuộc Vercel.** Có thể tạo app trên Inngest Cloud rồi lấy
  `INNGEST_EVENT_KEY` và `INNGEST_SIGNING_KEY` trực tiếp trong dashboard. Vercel
  integration chỉ là tiện ích provision/sync biến môi trường và endpoint khi deploy,
  không phải con đường duy nhất.
- **Local Inngest Dev Server không bắt buộc key thật.** Với `INNGEST_DEV=1`, kiểm tra chữ
  ký được tắt cho local; Event Key có thể để trống hoặc dùng giá trị giả. Key thật cần
  khi kết nối Inngest Cloud/production.
- Để kiểm chứng local bằng lưu trữ thật, đổi đúng ba dòng trong `.env.local`:
  `GENERATION_REPOSITORY=supabase`, `GENERATION_DISPATCHER=inngest`,
  `TRANSCRIPT_REPOSITORY=supabase`. Code hiện tại chỉ có **hai** biến `*_REPOSITORY`;
  không có `LESSON_REPOSITORY`.
- Chạy `npx inngest-cli@latest dev` và `pnpm dev`, tạo một bài học qua UI, rồi kiểm tra
  dữ liệu thật được ghi theo chuỗi `lesson_jobs → transcripts →
  language_eligibility_reports → lessons`. Sau đó chạy
  `tests/integration/full-real-path.test.ts` với key thật.
- **Chưa deploy.** Chỉ quyết định Vercel sau khi local durable flow đã pass:
  - Trỏ project `atoenglish` (`prj_2lnCWZp4PvBvuTBksDjMtPPruVqL`) từ
    `Thunderkill016/AtoEnglish` sang `Thunderkill016/vidlish` nếu muốn giữ domain hiện
    tại. Việc này thay site đang chạy.
  - Hoặc tạo Vercel project mới cho `Thunderkill016/vidlish`, giữ nguyên AtoEnglish.
    Phương án này an toàn hơn và dễ hoàn tác; hai app vẫn có thể dùng chung Supabase.
- Khi deploy, **production cấm mọi adapter giả**: bắt buộc
  `AUTH_ADAPTER=supabase`, `VIDEO_METADATA_ADAPTER=youtube`,
  `GENERATION_REPOSITORY=supabase`, `GENERATION_DISPATCHER=inngest`,
  `TRANSCRIPT_NATIVE_ADAPTER=supadata`, `TRANSCRIPT_REPOSITORY=supabase`,
  `LESSON_PROVIDER=gemini`.
- **PR #7** (Story 2.4 — transcript tự sinh) còn ở dạng nháp. Nếu làm tiếp, nên hiện thực
  bằng **Gemini đọc URL YouTube** thay vì Supadata `mode=generate`, vì lý do chi phí ở mục 6.
- **PR #8–#11** là tài liệu, chưa merge. Không ảnh hưởng sản phẩm chạy hay không.

### Cấu hình máy phát triển

`.env.local` đã có đủ ba key (Gemini, Supadata, YouTube Data API) và đang bật dịch vụ
thật cho metadata và transcript, nhưng lưu trữ vẫn trong RAM. Chạy `pnpm dev`, đăng nhập
`invited@example.com` với mã `123456`.

Để chuyển sang durable flow local, chỉ đổi `GENERATION_REPOSITORY`,
`GENERATION_DISPATCHER`, `TRANSCRIPT_REPOSITORY` như trên và chạy Inngest Dev Server.
Không cần đụng Vercel ở bước này.

## 8. Quy tắc làm việc

- **Đừng tin fixture.** 156 unit test và 28 e2e đều xanh trong khi sản phẩm không tạo
  nổi một bài học nào, vì tất cả đều dừng trước khi chạm tới model. Sau khi sửa bất cứ
  thứ gì liên quan tới provider, chạy `tests/integration/full-real-path.test.ts` với key thật.
- **Lỗi phải tự khai báo nguyên nhân.** Đã hai lần mất nhiều vòng debug chỉ vì thông điệp
  lỗi nuốt mất lý do. `LessonGenerationFailure` giờ mang `cause` và nêu đích danh trường
  sai. Giữ nếp đó.
- **Đo trước khi tối ưu.** Ba lần trong dự án này, tài liệu chính thức nói khác thực tế đo.
- **Chạy đủ cổng chất lượng trước khi báo xong**: `pnpm typecheck`, `pnpm lint`,
  `pnpm test`, `pnpm test:e2e`, và `pnpm build` (nhớ `CI=true` + đủ env).
- Repo dùng squash merge, lịch sử `main` tuyến tính.