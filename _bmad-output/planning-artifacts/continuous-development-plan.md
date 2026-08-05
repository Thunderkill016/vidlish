# Kế hoạch phát triển sống — Vidlish

Cập nhật: 2026-08-06. Đọc `HANDOVER.md` trước file này.

## Trạng thái sản phẩm

Luồng giá trị chính **đã chạy thật trên production**: dán link YouTube → YouTube Data API lấy metadata → Supadata lấy phụ đề gốc → franc kiểm tiếng Anh gốc → Gemini soạn bài → mở bài học có trích dẫn thật kèm mốc thời gian.

Bằng chứng: `vidlish.vercel.app` trả 200, database có bài học thật với 18 trích dẫn khớp mốc thời gian tới từng ms, `tests/integration/full-real-path.test.ts` pass 21,7s.

Giai đoạn hiện tại: **ổn định hoá sau khi lên production**, không phải xây tính năng mới.

## Đã hoàn thành và có bằng chứng

| Việc | PR | Bằng chứng |
|---|---|---|
| Job luôn kết thúc, không treo (transcript) | #12 | pgTAP + e2e |
| Sinh bài học có trích dẫn thật | #13 | full-real-path |
| Sửa model rụng tiền tố ID segment | #14 | 7 unit test, hành trình thật |
| pgTAP cho `lessons` (RLS + publish) | #15 | 22 assertion chạy trên Postgres |
| `thinking_level: HIGH` | #16 | đo 3 lần/mức |
| Trang bài học 500 do timestamp offset | #28 | test dùng chuỗi Supabase thật |
| Bỏ qua deploy không cần thiết | #29 | kiểm trên commit thật |
| Thư viện đọc database thật | #30 | 2 e2e |
| Watchdog cho giai đoạn soạn bài | #31 | 6 pgTAP |
| Thẻ báo lỗi khi soạn bài hỏng | #32 | e2e 34/34 |
| Job đang chạy quay lại được | #33 | 2 unit test |
| Kết thúc ngay khi soạn bài bỏ cuộc | #34 | e2e 34/34 |

## Vấn đề đang mở, theo ưu tiên

**P1 — Nguyên nhân gốc khiến job kẹt ở `analyzing_video` chưa tìm ra.**
Đã loại trừ: timeout Vercel (Hobby cho 300s, Gemini chỉ 13–19s), allowlist rỗng (339–352 segment vẫn kẹt), hạn mức Gemini (còn tốt). PR #31 và #34 là lưới an toàn — job giờ kết thúc ngay thay vì treo 15 phút — nhưng chưa chữa gốc.
*Chặn bởi*: không đọc được log runtime Vercel; API `/v1/deployments/{id}/runtime-logs` trả 404. Cần lấy từ dashboard.

**P2 — `unavailable video shows actionable safe copy` thỉnh thoảng đỏ.**
Phụ thuộc thứ tự chạy, đỏ ở cả chromium lẫn mobile-chromium. Giả thuyết hydration đã bị bác bỏ (test pass cả khi gỡ bản sửa). Chỉ ảnh hưởng CI.

**P2 — Chưa có observability.** Ba lần chẩn đoán trong dự án này phải đoán vì không có log lỗi. Đây là nguyên nhân khiến P1 chưa giải được.

**P3 — Ngưỡng watchdog 15 phút.** Sau #34 thì hầu hết trường hợp kết thúc trong vài giây, nên 15 phút chỉ còn là lưới cuối. Hạ xuống 5 phút vẫn rất rộng.

**P3 — Chưa bật billing Gemini.** Free tier có điều khoản không dành cho người dùng cuối và dữ liệu được dùng để huấn luyện. ~40 nghìn đồng cho 100 bài/tháng.

## Việc không nên làm

- Chẻ lời gọi Gemini thành song song: đã đo, nhanh hơn 29% nhưng tốn thêm 22% token và làm hai nửa mất mạch.
- Dùng Supadata `mode=generate` ở gói Free: 2 credit/phút video.
- Giữ `minItems`/`maxItems` trong wire schema: đã đo, vẫn bị từ chối.

## Task tiếp theo

1. Lấy log lỗi runtime từ Vercel dashboard → giải P1.
2. Hạ ngưỡng watchdog xuống 5 phút (một dòng).
3. Bật billing Gemini trước khi mở cho người học thật.
