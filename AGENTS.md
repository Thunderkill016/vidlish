# AGENTS.md

## Vai trò của Codex

Vidlish dùng BMAD Method 6.10.0 theo Full BMad greenfield track. `project-context.md` là nguồn bối cảnh bắt buộc; planning authorities nằm trong `_bmad-output/planning-artifacts/`, sprint/story tracking nằm trong `_bmad-output/implementation-artifacts/`.

## Trạng thái hiện tại

- PRD, UX, Architecture, Epics/Stories: final.
- Implementation Readiness: READY/PASS.
- Sprint Planning: complete.
- Epic 1: in progress.
- Story hiện tại: `1-1-truy-cap-private-beta-va-dang-nhap-an-toan`.
- Product code chỉ được thay đổi theo story artifact hiện tại và chuỗi create/validate/dev/review.

## Invariant nguồn tiếng Anh

Vidlish chỉ tạo bài học từ lời nói tiếng Anh thực sự tồn tại trong video nguồn.

```text
Có đủ lời nói tiếng Anh gốc và đáng tin cậy → tiếp tục Lesson Engine.
Không đủ tiếng Anh → VIDEO_LANGUAGE_UNSUPPORTED → chọn video khác.
```

Bắt buộc:

- Detect language sau transcript normalization và trước Lesson Engine.
- Mixed-language chỉ dùng khi phần tiếng Anh tự nó đủ cho một Core Lesson hợp lệ.
- Non-English segments không làm source quote, listening, grammar hoặc scored evidence.
- Không dịch video không phải tiếng Anh, không tạo dub/TTS thay audio gốc, không trình bày generated English như source speech.

Story 1.1 chưa triển khai pipeline này nhưng không được tạo cấu trúc làm yếu invariant.

## Quy tắc implementation

1. Đọc `project-context.md` và story artifact trước khi sửa code.
2. Dependency hướng vào trong: App/route handlers → application → ports; adapter Supabase/Next.js ở ngoài domain.
3. Chỉ config modules đọc `process.env`; service/secret key không vào client bundle.
4. Mọi owner-scoped table/bucket sau này phải có server ownership check và RLS.
5. Không gọi provider thật trong CI; dùng fixtures/fakes/local services.
6. Không log API key, OTP, auth token, cookie, email thô, transcript hoặc prompt chứa transcript.
7. Không mở rộng MVP sang payment, AI chat, gamification, classroom, public sharing hoặc mobile native.
8. Không tạo trước Job, Transcript, Lesson hoặc Activity entities khi story chưa sở hữu chúng.
9. Chỉ đánh dấu task/story hoàn tất khi tests và acceptance criteria thực sự đạt.
10. Giao tiếp product-owner bằng tiếng Việt; code/identifier kỹ thuật dùng tiếng Anh.

## Chuỗi workflow

```text
create-story
→ validate-create-story
→ dev-story
→ code-review
→ story done
→ create story kế tiếp
```

## Nguồn chuẩn

- `project-context.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md`
- `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/LANGUAGE-ELIGIBILITY-AMENDMENT.md`
- `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Story artifact hiện tại.
