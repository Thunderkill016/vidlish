# Vidlish Requirements Inventory

## Functional Requirements

FR1: Đăng ký, đăng nhập, đăng xuất; bắt buộc đăng nhập trước generation; Job, Transcript và Lesson có owner và bị cô lập giữa người dùng.

FR2: Vận hành MVP dưới dạng private beta để kiểm chứng coverage, chất lượng, chi phí và rủi ro.

FR3: Nhận các dạng URL YouTube phổ biến, chuẩn hóa video ID và từ chối URL không hợp lệ.

FR4: Người dùng chọn CEFR A1–C1 trước khi tạo bài.

FR5: Lấy title, channel, thumbnail, duration và phân biệt video unavailable/private/restricted/unplayable.

FR6: Không dùng trần phút cố định; video dài được xử lý bằng budget, chunking, async workflow và overview/micro-lessons; không truncate âm thầm.

FR7: Ưu tiên manual caption và auto-caption, giữ source/confidence.

FR8: Dùng hosted transcript provider khi caption fast path thất bại.

FR9: Private beta có thể dùng unofficial extractor qua abstraction, timeout/retry giới hạn và feature flag.

FR10: `NO_CAPTIONS` không phải lỗi cuối; có audio-to-text fallback có consent, ưu tiên browser tab-audio capture.

FR11: Cho phép paste transcript hoặc upload subtitle; owned audio/video upload chỉ khi người dùng có quyền.

FR12: Chuẩn hóa transcript thành stable segments có timestamp, source và confidence; loại dữ liệu trống/trùng/hỏng và không bịa phần thiếu.

FR13: Lưu normalized transcript để mở lại lesson; không lưu video; audio tạm bị xóa; transcript phụ thuộc bị xóa theo retention.

FR14: Trước model call, transcript được normalize, hash, gắn segment ID/source/confidence và đánh dấu untrusted.

FR15: Phân tích genre, topic, structure, difficulty, semantic sections, listening challenges và low-confidence regions với evidence.

FR16: Tạo candidate pool ngôn ngữ có form, kind, CEFR, register, context, evidence, usefulness và transferability.

FR17: Chọn tối đa ba learning outcomes; mọi section/activity phục vụ ít nhất một outcome.

FR18: Chọn teachable moments theo teaching value; loại item không hữu ích hoặc quá chuyên ngành khi không cần thiết.

FR19: Tạo Core Lesson 10–20 phút theo activation → gist → noticing → practice → retrieval → transfer → reflection; số lượng nội dung co giãn.

FR20: Cá nhân hóa A1–C1 thực chất về support, item count, question type, explanation depth và production demand.

FR21: Source quote, claim, question, grammar evidence và rationale phải tham chiếu segment ID; generated example được phân biệt.

FR22: AI stages dùng structured output có version; lesson lưu schema/pipeline/prompt/model/transcript hash/quality versions.

FR23: Production generation bắt buộc multi-stage; cấm one-shot transcript-to-published-lesson.

FR24: Gemini chỉ là `LessonGenerationProvider`; domain schema và validators độc lập provider.

FR25: Lesson sai schema/type/enum/relationship không được publish.

FR26: Segment giả, quote không khớp hoặc claim thiếu evidence là hard failure.

FR27: Scored activity có answer key, rationale và evidence/criteria; MCQ có đúng một đáp án tốt nhất.

FR28: Chỉ publish khi qua mọi hard gate và quality score tối thiểu 14/16; grounding và exercise validity đạt tối đa.

FR29: Targeted repair theo lỗi cụ thể; tối đa một structural repair và một semantic repair rồi fail closed.

FR30: Mọi thay đổi model/prompt/schema/selector chạy regression trên ít nhất 10 video đa genre và level trước production.

FR31: Tạo persisted job ID + idempotency key trước provider call; reload/retry không làm mất trạng thái hay tạo trùng.

FR32: UI hiển thị các stage: kiểm tra video, transcript, ngôn ngữ, phân tích, chọn nội dung, tạo hoạt động, kiểm định, hoàn tất.

FR33: Lỗi map sang mã ổn định, copy tiếng Việt và action cụ thể; không lộ provider error thô.

FR34: Lesson Viewer hiển thị player, outcomes, video map, transcript timestamp, language items, activities, explanations và provenance nội bộ.

FR35: Evidence/timestamp seek player tới đoạn tương ứng.

FR36: Người dùng làm gist/comprehension/listening/retrieval, submit scored items và xem feedback.

FR37: Lesson có transfer/production prompt, self-check criteria và exit ticket; không giả chấm open speaking/writing.

FR38: Người dùng đánh dấu lesson completed/incomplete.

FR39: Lesson chỉ tự lưu sau Final Quality Gate và atomic publish.

FR40: Mở lesson đã lưu không gọi lại transcript provider hoặc Lesson Engine.

FR41: Library hiển thị metadata/status/source, mở, lọc trạng thái và xóa lesson sau xác nhận.

FR-LANG-1: Detect language ở transcript và segment level sau normalization, trước Lesson Engine.

FR-LANG-2: Chỉ tiếp tục khi có đủ English speech gốc, đáng tin cậy và liền mạch để tạo lesson grounded.

FR-LANG-3: Mixed-language video chỉ hợp lệ khi phần English tự nó đủ; non-English chỉ làm context.

FR-LANG-4: Không đủ English thì dừng trước expensive lesson calls với `VIDEO_LANGUAGE_UNSUPPORTED` và `choose_another_video`.

FR-LANG-5: Không dịch video khác ngôn ngữ, không synthesize English audio và không giả generated text thành source evidence.

## Non-Functional Requirements

NFR1: Secrets và service-role credentials chỉ ở server.

NFR2: Ownership enforcement ở application và RLS/storage policy.

NFR3: Không log full transcript, captured audio body hoặc prompt chứa full transcript.

NFR4: Temporary audio private, TTL ngắn, xóa sau transcription/failure và có sweeper.

NFR5: Có rate limit, quota, concurrency và estimated-cost gate.

NFR6: Provider adapters có timeout, bounded retry, mapping và fallback/circuit behavior.

NFR7: Generation state persisted, không phụ thuộc browser/request/worker memory.

NFR8: Fail closed khi eligibility hoặc quality chưa đạt; không publish partial lesson.

NFR9: Ghi provider/model/prompt/pipeline/schema versions để tái tạo lỗi.

NFR10: URL/metadata validation phản hồi hoặc bắt đầu phản hồi trong khoảng 2 giây ở điều kiện bình thường.

NFR11: Saved Lesson và Library hiển thị dữ liệu chính trong khoảng 3 giây ở điều kiện bình thường.

NFR12: Generation dài chạy async, có persisted status và không giữ HTTP request mở vô hạn.

NFR13: Core flows dùng được bằng bàn phím, có labels, focus và responsive behavior.

NFR14: Core web đạt WCAG 2.2 AA theo UX floor.

NFR15: Job telemetry có stage latency, strategy, source/confidence, eligibility, provider/model, token, retry/repair, quality và cost; không log secrets/content.

NFR16: CI mặc định chỉ dùng fixtures/fakes/sandboxes, không gọi live providers.

NFR17: Pipeline/model/prompt changes phải qua deterministic tests và golden evaluation.

NFR18: Local, staging và production tách data, secrets và provider environments.

NFR19: Production có managed backups và tested restore trước public launch.

NFR20: Video dài bị giới hạn bằng semantic/token/request/cost budgets, không silent truncation.

NFR21: Public launch cần Privacy Policy, Terms và legal review về transcript, retention, embeds và AI content.
