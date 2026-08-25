# Nếp

> **Tiếng Anh thành nếp.**
> Hiểu thật. Nhớ lâu. Dùng được.

Nếp là web app cho một người lớn nói tiếng Việt học tiếng Anh từ gần số 0.
Sản phẩm xây năng lực qua input vừa sức, tự nhớ lại, dùng trong ngữ cảnh khác,
và ôn sau một khoảng thời gian — không đo tiến bộ bằng streak hoặc số card đã
lật.

## Hướng sản phẩm hiện tại

Lộ trình bắt đầu bằng audio/text ngắn có thể hiểu, rồi mở rộng dần sang nói,
viết và nguồn thật. Video YouTube là một nguồn đầu vào ở giai đoạn sau; không
phải trung tâm trải nghiệm của người mới.

Xem kế hoạch, curriculum và các điều chưa được chứng minh trong
[`docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`](./docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md).
Nguồn nghiên cứu cho lộ trình A0 nằm ở
[`docs/product/A0_ENGLISH_LEARNING_RESEARCH_DOSSIER.md`](./docs/product/A0_ENGLISH_LEARNING_RESEARCH_DOSSIER.md).

## Hiện có trong checkout

- luồng đăng nhập và shell cho người học;
- `/start`: chọn từ tiếp theo, câu i+1, nghe trước khi xem chữ, recall trong
  phiên và lưu attempt;
- nền persistence/review theo FSRS;
- đường video có kiểm chứng nguồn dành cho giai đoạn sau.

Đây là foundation kỹ thuật; chưa chứng minh rằng người học thật đạt kết quả,
quay lại ôn, hoặc sẵn sàng trả tiền.

## Chạy cục bộ

Yêu cầu Node.js 24 và pnpm 10.15.0.

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Chạy kiểm tra:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Tương thích khi đổi thương hiệu

Tên hiển thị là **Nếp**, package nội bộ là `nep`. Repository GitHub, domain,
cookie, telemetry và local-storage key vẫn dùng `vidlish` cho tới khi có kế
hoạch migration riêng. Không đổi chúng chỉ bằng tìm-thay-thế.
