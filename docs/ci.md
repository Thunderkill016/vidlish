# Kiến trúc, baseline và quyết định CI của Vidlish

Tài liệu này là bộ nhớ chuẩn cho GitHub Actions của Vidlish. Trước khi sửa CI, phải đọc tài liệu này cùng `.github/workflows/ci.yml`, `package.json`, `playwright.config.ts`, `vitest.config.ts` và `supabase/config.toml`.

## Mục tiêu

CI phải đồng thời:

1. Phát hiện lỗi thật trước khi merge hoặc deploy.
2. Ổn định và chẩn đoán được khi thất bại.
3. Phản hồi nhanh mà không cắt phạm vi kiểm tra.
4. Không tiêu tốn runner, network và cache không cần thiết.
5. Dùng quyền tối thiểu, dependency có kiểm soát và action bất biến.
6. Giữ cấu hình dễ đọc, dễ tái hiện và dễ mở rộng.

## Phạm vi kiểm tra

Workflow `CI` chạy trên pull request, push vào `main`, hoặc kích hoạt thủ công. Năm job kiểm tra chạy song song, sau đó `CI gate` tổng hợp kết quả:

| Job | Trách nhiệm |
| --- | --- |
| Typecheck and lint | TypeScript strict type checking và ESLint/Next.js rules |
| Unit tests | Vitest unit + integration contract tests bằng fixture/fake |
| Production build | Next.js production build và Vercel Workflow compilation |
| Supabase migration and RLS tests | Khởi tạo database local, áp dụng migrations/seed và chạy toàn bộ pgTAP |
| Chromium product journeys | Playwright trên desktop Chromium và mobile Chromium |
| CI gate | Một status ổn định tổng hợp toàn bộ required jobs |

Standard CI không gọi YouTube, Supadata, Gemini hoặc Workflow backend thật. Đây là chủ ý kiến trúc để pull request không phụ thuộc secret, quota, mạng provider hoặc dữ liệu ngoài. Provider-real smoke tests tồn tại riêng và bị skip khi không có key.

## Baseline trước thay đổi

Nguồn đo chính là PR #21, workflow run `31037291434`, attempt thành công cuối cùng. Thời gian lấy từ timestamp trong job logs, không phải số liệu billing chính thức.

| Job | Trước | Nút thắt chính |
| --- | ---: | --- |
| Typecheck and lint | ~24 giây | setup/cache/install ~13 giây; kiểm tra thật ~10 giây |
| Unit tests | ~26 giây | setup/cache/install ~18 giây; Vitest 6,95 giây |
| Production build | ~37 giây | setup/cache/install ~19 giây; `next build` ~17 giây |
| Supabase migration and RLS | ~103 giây | full-stack Docker pull/start + reset DB lần hai + stop; pgTAP ~3 giây |
| Chromium journeys | ~99 giây | cài OS dependencies và tải cả Chrome + headless shell ~30 giây; test ~47 giây |
| CI gate | <1 giây thực thi | runner mới và scheduling sau critical path |

Wall-clock từ khi job đầu bắt đầu đến khi gate kết thúc khoảng **116 giây**. Tổng runner-time quan sát được khoảng **289 giây**.

Bốn job Node cùng khôi phục pnpm store khoảng **248 MB** và cài lại khoảng **901 packages**. Việc tách job vẫn được giữ vì cho phản hồi song song, phân loại lỗi rõ và bảo toàn tên required checks.

### Database baseline

- `supabase start -x studio,imgproxy`: ~56 giây; vẫn kéo nhiều dịch vụ ngoài PostgreSQL.
- `supabase db reset --local`: ~18 giây; áp dụng lại migrations và seed vừa được startup áp dụng trên runner sạch.
- `supabase test db`: ~3 giây; 107 assertions trong 6 file.
- `supabase stop --no-backup`: ~15 giây.
- Log báo `github-token` không còn là input hợp lệ và `[inbucket]` đã deprecated.

### Playwright baseline

- 28 tests pass, 2 skip, 1 worker, ~47 giây test execution.
- `playwright install --with-deps chromium` tải Chrome (~177 MiB), Chromium headless shell (~114 MiB), FFmpeg và OS packages.
- `workers: 1` và `fullyParallel: false` là quyết định có bằng chứng. Desktop/mobile từng dùng chung fake user và global in-memory state, gây quota race và lỗi không xác định; không bật parallel lại trước khi cô lập state theo worker.

## Sự cố thực tế đã ghi nhận

1. pgTAP `throws_ok` dùng sai arity làm CI đỏ dù database trả đúng SQLSTATE.
2. E2E từng có 5/26 case thất bại do desktop/mobile chạy song song trên shared fake state và quota.
3. Một unit test timing-sensitive từng thất bại hai lần rồi pass ở commit sau; timeout không được đặt sát cold compile.
4. Khi chuyển Inngest sang Vercel Workflow, CI phát hiện contract test còn tham chiếu file đã xóa, keyboard order đổi sau Google sign-in và navigation timeout dưới cold compile.
5. Fixture CI từng không phát hiện lỗi provider/Gemini thật. Không giải quyết bằng cách đưa secret và live provider vào mọi pull request; dùng acceptance workflow riêng có kiểm soát.

Connector hiện tại không cung cấp đủ lịch sử Actions để tính chính xác failure rate, rerun rate và cancellation rate toàn repo. Không được suy ra các tỷ lệ đó chỉ từ một nhóm commit cuối.

## Thay đổi ưu tiên cao đã thực hiện

| Thay đổi | Tác động | Cấp thiết | Chi phí | Rủi ro |
| --- | --- | --- | --- | --- |
| Database-only startup, bỏ reset/stop thừa | Rất cao | Cao | Thấp | Thấp; đã chạy đủ 107 assertions |
| Pin runner, action SHA và Supabase CLI | Cao về reproducibility/security | Cao | Thấp | Thấp |
| `persist-credentials: false` | Cao về least privilege | Cao | Thấp | Thấp |
| Chỉ tải Chromium headless shell | Trung bình | Trung bình | Thấp | Thấp; desktop/mobile đều đã pass |
| Dependabot cho npm và Actions | Trung bình | Trung bình | Thấp | Trung bình; PR update vẫn phải qua full CI |
| Mở rộng Next cache key | Trung bình | Trung bình | Thấp | Thấp |
| Pin target pnpm 10.15.0 | Trung bình về reproducibility | Trung bình | Thấp | Thấp; action vẫn bootstrap v11 rồi chuyển về v10 |

Chi tiết triển khai:

- runner cố định `ubuntu-24.04`;
- mọi third-party action được pin full commit SHA, kèm comment major version để Dependabot nhận diện;
- checkout không lưu credential sau bước fetch;
- Supabase CLI cố định `2.111.0`, bỏ input `github-token` sai;
- database dùng `supabase db start` rồi `supabase test db`, không reset và stop lần hai;
- Playwright dùng `--with-deps --only-shell chromium`;
- Dependabot weekly cho GitHub Actions và npm production/development minor+patch;
- Next build-cache key tính cả TS/JS, CSS, `public/**`, Next/PostCSS config và `tsconfig.json`.

## Kết quả đo sau thay đổi

Phép đo đầu tiên là PR #22, workflow run `31041781739`. Cả typecheck, lint, unit, production build, 107 pgTAP assertions, desktop Chromium, mobile Chromium và `CI gate` đều pass.

| Chỉ số | Trước | Sau, run đầu | Thay đổi quan sát |
| --- | ---: | ---: | ---: |
| Wall-clock đến CI gate | ~116 giây | ~117 giây | Gần như không đổi; E2E variance che lợi ích DB |
| Tổng runner-time | ~289 giây | ~258 giây | **-31 giây, khoảng -11%** |
| Typecheck and lint | ~24 giây | ~27 giây | +3 giây, nằm trong setup/cache variance |
| Unit tests | ~26 giây | ~24 giây | -2 giây |
| Production build | ~37 giây | ~36 giây | -1 giây |
| Database job | ~103 giây | ~61 giây | **-42 giây, khoảng -41%** |
| E2E job | ~99 giây | ~110 giây | +11 giây; không được coi là tối ưu tổng job |
| Browser install step | ~30 giây | ~25 giây | -5 giây và bỏ download Chrome ~177 MiB |

### Kết luận có thể khẳng định

- Database-only startup là cải tiến đã được kiểm chứng: vẫn áp dụng toàn bộ migrations/seed và pass 107 assertions, đồng thời giảm khoảng 41% job time.
- Headless-shell giảm download và browser-install step khoảng 5 giây, nhưng **chưa chứng minh** giảm tổng E2E job. Run sau có test execution ~64 giây thay vì ~47 giây baseline, chủ yếu do cold-start/test variance; không được quảng cáo là E2E nhanh hơn.
- Tổng tài nguyên runner giảm khoảng 11% trong run đầu, nhưng time-to-green không đổi vì E2E vẫn là critical path.
- Pin pnpm tăng tính rõ ràng/reproducibility nhưng không tăng tốc; `pnpm/action-setup` vẫn bootstrap v11 rồi chuyển sang v10.15.0 và phát cảnh báo layout.
- Next cache hiện chỉ khoảng 63 KB nên chưa tạo lợi ích đáng kể. Giữ cache để tích lũy khi build graph lớn hơn, nhưng tiếp tục đo hit-rate và kích thước.

Một run không đủ để kết luận p50/p95. Cần 10–20 run sau merge để đánh giá ổn định, cache-hit rate, failure rate và cancellation rate.

## Nên làm sau

1. Kiểm kê branch protection/ruleset để xác nhận `CI gate` là required check và production deploy không vượt CI.
2. Đo 10–20 run để có p50/p95 và phân biệt E2E variance với regression.
3. Cô lập fake state theo worker trước khi xem xét parallel hoặc shard Playwright.
4. Xem xét scheduled/provider acceptance workflow có environment protection, quota và cost budget rõ.
5. Chuyển `[inbucket]` sang local SMTP khi có schema chính thức tương thích với Supabase CLI đã pin; không đoán config.
6. Đánh giá dependency review/code scanning theo threat model và GitHub plan.
7. Xem xét bỏ hoặc thay pnpm action bootstrap chỉ khi có phương án Corepack được kiểm chứng trên runner/Node version mục tiêu.

## Chưa phù hợp

- Không shard hoặc tăng Playwright workers khi state còn dùng chung.
- Không cache browser binaries; OS dependencies vẫn cần cài và restore archive chưa có bằng chứng nhanh hơn download.
- Không bỏ database, mobile Chromium, production build hoặc RLS tests để giảm thời gian.
- Không path-filter required jobs trước khi có ruleset ổn định và change-impact map được kiểm chứng.
- Không gộp toàn bộ Node checks thành một job chỉ để giảm setup; sẽ mất song song và time-to-first-failure.
- Không chạy provider thật trên mọi pull request.
- Không đặt coverage threshold tùy ý khi chưa có baseline coverage và risk-based target.

## Tái hiện local

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

Khi CI thất bại, đọc job log, xác định step đầu tiên sai, dùng artifact Playwright khi có và sửa nguyên nhân gốc. Không rerun mù để biến flaky failure thành màu xanh.