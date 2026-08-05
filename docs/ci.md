# Kiến trúc và baseline CI của Vidlish

Tài liệu này là bộ nhớ chuẩn cho GitHub Actions của Vidlish. Khi sửa CI, phải đọc tài liệu này cùng `.github/workflows/ci.yml`, `package.json`, `playwright.config.ts`, `vitest.config.ts` và `supabase/config.toml` trước khi thay đổi.

## Mục tiêu

CI phải đồng thời bảo vệ sáu thuộc tính:

1. Phát hiện lỗi thật trước khi merge hoặc deploy.
2. Ổn định và chẩn đoán được khi thất bại.
3. Phản hồi nhanh mà không cắt bớt phạm vi kiểm tra.
4. Không tiêu tốn runner, network và cache không cần thiết.
5. Dùng quyền tối thiểu, dependency có kiểm soát và action bất biến.
6. Giữ cấu hình dễ đọc, dễ chạy lại và dễ mở rộng.

## Phạm vi kiểm tra hiện tại

Workflow `CI` chạy khi có pull request, push vào `main`, hoặc kích hoạt thủ công. Năm job kiểm tra chạy song song, sau đó `CI gate` tổng hợp kết quả:

| Job | Trách nhiệm |
| --- | --- |
| Typecheck and lint | TypeScript strict type checking và ESLint/Next.js rules |
| Unit tests | Vitest unit + integration contract tests bằng fixture/fake |
| Production build | Next.js production build và Vercel Workflow compilation |
| Supabase migration and RLS tests | Khởi tạo PostgreSQL local, áp dụng migrations/seed và chạy toàn bộ pgTAP |
| Chromium product journeys | Playwright trên desktop Chromium và mobile Chromium |
| CI gate | Một status ổn định để tổng hợp toàn bộ required jobs |

CI không gọi YouTube, Supadata, Gemini hoặc Workflow backend thật. Đây là chủ ý kiến trúc để pull request không phụ thuộc secret, quota, mạng provider hoặc dữ liệu bên ngoài. Provider-real smoke tests tồn tại riêng và bị skip khi không có key.

## Baseline trước đợt tối ưu 2026-08-06

Nguồn đo chính là PR #21, workflow run `31037291434`, attempt thành công cuối cùng. Thời gian được lấy từ timestamp trong job logs; đây là wall-clock quan sát được, không phải số liệu billing chính thức.

| Job | Thời gian xấp xỉ | Nút thắt chính |
| --- | ---: | --- |
| Typecheck and lint | 24 giây | setup/cache/install khoảng 13 giây; kiểm tra thật khoảng 10 giây |
| Unit tests | 26 giây | setup/cache/install khoảng 18 giây; Vitest 6,95 giây |
| Production build | 37 giây | setup/cache/install khoảng 19 giây; `next build` khoảng 17 giây |
| Supabase migration and RLS | 103 giây | full-stack Docker pull/start + reset DB lần hai + stop; pgTAP chỉ khoảng 3 giây |
| Chromium journeys | 99 giây | cài OS dependencies và tải cả Chrome + headless shell khoảng 30 giây; test khoảng 46 giây |
| CI gate | <1 giây thực thi | cần thêm một runner và chờ scheduling sau critical path |

Wall-clock từ khi các job đầu bắt đầu đến khi gate kết thúc khoảng **116 giây**. Tổng thời gian runner quan sát được của sáu job khoảng **289 giây**.

Bốn job Node cùng khôi phục một pnpm store khoảng **248 MB** và cài lại khoảng **901 packages**. Việc tách job vẫn được giữ vì cho phản hồi song song, phân loại lỗi rõ và không thay đổi tên required checks; chi phí này sẽ được đánh giá lại khi repo lớn hơn hoặc branch protection được kiểm kê đầy đủ.

### Chi tiết database baseline

Trong run baseline:

- `supabase start -x studio,imgproxy`: khoảng 56 giây; vẫn kéo PostgREST, Mailpit, Logflare, GoTrue, Vector, Kong, Realtime, Edge Runtime và PostgreSQL.
- `supabase db reset --local`: khoảng 18 giây; áp dụng lại cùng migrations và seed vừa được `start` áp dụng trên runner sạch.
- `supabase test db`: khoảng 3 giây; 107 assertions trong 6 file, pgTAP báo 1 giây wall clock.
- `supabase stop --no-backup`: khoảng 15 giây.

Log cũng báo `github-token` không phải input hợp lệ của action đang chạy và `[inbucket]` đã deprecated.

### Chi tiết Playwright baseline

- 28 tests pass, 2 tests skip, 1 worker, khoảng 46 giây.
- `playwright install --with-deps chromium` tải cả Chrome (~177 MiB), Chromium headless shell (~114 MiB), FFmpeg và OS packages.
- `workers: 1`, `fullyParallel: false` và quota test được nâng trong web server env là quyết định có chủ ý. Trước đó desktop/mobile cùng dùng một fake beta user và global in-memory state đã tạo lỗi quota/nondeterministic; không được bật parallel lại nếu chưa cô lập state theo worker.

## Sự cố CI thực tế đã ghi nhận

1. pgTAP `throws_ok` dùng sai arity làm CI đỏ 2 assertions dù database constraint trả đúng SQLSTATE. Sửa bằng overload bốn tham số và không ghim message Postgres.
2. E2E từng có 5/26 case thất bại do hai project desktop/mobile chạy trên shared fake state và quota. Cấu hình serial hiện tại là biện pháp ổn định có bằng chứng.
3. Một unit test timing-sensitive từng thất bại hai lần rồi pass ở các commit sau; tránh timeout quá sát cold compile.
4. Khi chuyển Inngest sang Vercel Workflow, CI phát hiện contract test còn tham chiếu file đã xóa, keyboard order thay đổi sau Google sign-in, và navigation timeout dưới cold compile.
5. Standard CI không phát hiện được một lỗi Gemini/provider thật trước đây vì fixture. Không giải quyết bằng cách đưa secret/provider thật vào mọi PR; dùng smoke/acceptance workflow có kiểm soát riêng.

Không có đủ API metadata trong connector hiện tại để tính chính xác tỷ lệ failure/re-run toàn bộ lịch sử. Các con số failure rate trong tương lai phải lấy trực tiếp từ Actions API hoặc dashboard, không suy ra từ các commit cuối đã xanh.

## Thay đổi ưu tiên cao trong đợt 2026-08-06

1. Pin runner vào `ubuntu-24.04` để tránh drift của `ubuntu-latest`.
2. Pin mọi third-party action bằng full commit SHA và giữ comment major version để Dependabot cập nhật được.
3. Đặt `persist-credentials: false` cho checkout vì các job chỉ đọc repository.
4. Pin pnpm `10.15.0` thay vì để action tự cài version mới rồi hạ xuống theo `packageManager`.
5. Pin Supabase CLI `2.111.0`, bỏ input `github-token` không hợp lệ.
6. Dùng `supabase db start` trên runner sạch và bỏ `db reset` lần hai cùng explicit stop; vẫn áp dụng migrations/seed và chạy toàn bộ 107 pgTAP assertions.
7. Dùng Playwright `--only-shell chromium`; CI chạy headless nên không cần tải full Chrome.
8. Mở Dependabot weekly cho npm production/dev minor+patch, ngoài GitHub Actions hiện có.
9. Mở rộng Next build-cache key để tính cả CSS, `public/**` và PostCSS config.

## Kết quả sau thay đổi

Sẽ được điền từ pull-request workflow run đầu tiên chạy thành công với cấu hình mới. Không tuyên bố tăng tốc trước khi có job logs thực tế.

| Chỉ số | Trước | Sau | Thay đổi |
| --- | ---: | ---: | ---: |
| Wall-clock đến CI gate | ~116 giây | Chờ đo | Chờ đo |
| Database job | ~103 giây | Chờ đo | Chờ đo |
| E2E job | ~99 giây | Chờ đo | Chờ đo |
| Tổng runner time quan sát | ~289 giây | Chờ đo | Chờ đo |

## Quyết định tiếp theo

### Nên làm sau

- Kiểm kê branch protection/ruleset để xác nhận `CI gate` thực sự là required check và production deploy không thể vượt CI.
- Đo ít nhất 10–20 run sau thay đổi để có p50/p95, cache-hit rate, failure rate và cancellation rate đáng tin cậy.
- Xem xét một scheduled/provider acceptance workflow riêng, có environment protection và secret hạn chế, sau khi xác định quota/cost budget.
- Chuyển `[inbucket]` sang cấu hình local SMTP mới sau khi chốt schema tương thích với Supabase CLI đã pin.
- Đánh giá dependency review/code scanning theo threat model và khả năng GitHub plan của repository.

### Chưa phù hợp

- Không shard hoặc tăng Playwright workers khi state vẫn dùng chung.
- Không cache browser binaries; OS dependencies vẫn phải cài và cache archive thường không có lợi.
- Không bỏ database, mobile Chromium, production build hoặc RLS tests để giảm thời gian.
- Không dùng path filtering để skip required jobs trước khi có ruleset ổn định và change-impact map được kiểm chứng.
- Không gộp toàn bộ Node checks thành một job chỉ để giảm setup; việc này làm mất song song, tăng time-to-first-failure và có thể phá required-check names.
- Không chạy provider thật trên mọi pull request.
- Không đặt coverage threshold tùy ý khi chưa có baseline coverage và risk-based target.

## Cách tái hiện local

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install --with-deps --only-shell chromium
pnpm test:e2e
supabase db start
supabase test db
```

Khi CI thất bại, đọc job log trước, xác định step đầu tiên sai, lưu artifact Playwright khi có, và sửa nguyên nhân gốc. Không rerun mù để biến một lỗi flaky thành màu xanh.