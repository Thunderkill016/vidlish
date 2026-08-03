# Vidlish MVP PRD Review

**Ngày:** 2026-08-03  
**Artifact:** `prd.md`  
**Verdict:** **Có điều kiện — yêu cầu đã đủ rõ để quyết định sản phẩm, nhưng chưa được phép chuyển sang UX/Architecture cho đến khi OQ-1 đến OQ-5 được chốt.**

## 1. Decision readiness

### Điểm tốt

- Lời hứa sản phẩm và vòng giá trị cốt lõi rõ.
- MVP có biên giới mạnh và chỉ giữ ba bề mặt chính.
- 28 FR có thể truy vết tới ba hành trình người dùng.
- Non-goals loại bỏ đúng các nguồn scope creep lớn.
- AI generation có ràng buộc schema và quote matching.
- Auth ownership, error recovery, rate limit và observability đã được đặt thành yêu cầu thay vì để Architecture tự đoán.

### Phase blockers

1. Mô hình đăng nhập ảnh hưởng trực tiếp UJ-1, abuse prevention và persistence.
2. Private/public beta ảnh hưởng mức pháp lý, quota và vận hành.
3. Giới hạn video ảnh hưởng UX, chi phí và kỹ thuật.
4. Chính sách lưu Transcript là quyết định dữ liệu/pháp lý.
5. Auto-generated captions ảnh hưởng coverage và chất lượng.

## 2. Scope integrity

**Pass.** PRD không thêm thanh toán, phát âm, speech-to-text, flashcard system, social, mobile native hoặc extension. Learning goal, số lượng từ và độ dài bài được loại khỏi UI MVP để giảm trạng thái và số nhánh kiểm thử.

## 3. Requirement quality

**Pass with minor follow-up.** FRs mô tả hành vi và hậu quả kiểm thử được. Các chi tiết provider/framework được giữ trong `addendum.md`, không trộn vào yêu cầu sản phẩm.

Điểm cần UX/Architecture làm rõ sau khi PRD final:

- exact loading/error copy;
- trạng thái generation và idempotency;
- transcript storage implementation;
- background job strategy;
- AI schema chi tiết và quote matching tolerance;
- quota/rate limits.

## 4. Metrics quality

**Pass for private beta.** Các mục tiêu 80% success, median dưới 90 giây, 60% value-loop completion và 95% schema stability đủ để kiểm chứng MVP. Nếu chọn public beta, cần bổ sung abuse, support burden và cost-per-successful-lesson.

## 5. Legal and safety review

**Open.** PRD đúng khi chưa tự quyết định quyền lưu Transcript. Trước public launch cần:

- quyết định data retention;
- Privacy Policy;
- Terms of Use;
- review cách dùng YouTube metadata, embedded player và captions;
- disclosure phù hợp về AI-generated educational content.

## 6. Recommended default decision bundle

Để giảm can thiệp của product owner, reviewer khuyến nghị duyệt cùng lúc:

- **D1 / OQ-1:** Bắt buộc đăng nhập trước khi tạo Bài học. Lý do: đơn giản hóa ownership, quota, reload recovery và library.
- **D2 / OQ-2:** Private beta trước. Lý do: kiểm tra transcript coverage, AI quality, chi phí và pháp lý trước public exposure.
- **D3 / OQ-3:** Video tối đa 30 phút. Lý do: đủ cho phần lớn nội dung học, đồng thời giới hạn token, thời gian và timeout.
- **D4 / OQ-4:** Lưu Transcript dạng các segment đã chuẩn hóa cùng Bài học; không lưu video/audio; xóa Transcript khi Bài học cuối cùng phụ thuộc vào nó bị xóa. Trước public launch cần legal review.
- **D5 / OQ-5:** Chấp nhận cả phụ đề do chủ kênh cung cấp và auto-generated English captions; hiển thị cảnh báo chất lượng khi là auto-generated.

## 7. Gate result

- PRD authoring: **complete**.
- PRD status: **draft**.
- Code allowed: **no**.
- UX allowed: **sau khi D1-D5 được duyệt và PRD chuyển final**.
- Next workflow after final: `bmad-ux`.
