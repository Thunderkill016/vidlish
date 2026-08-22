# Bàn giao Vidlish — operational state hiện tại

Cập nhật: **2026-08-22**, sau khi beginner evidence authority và Gate 5 operator evidence path được harden qua PR #130, #132 và #133.

File này giữ **operational handover và những bẫy đã trả giá để học được**. Nó không đứng trên product authority hay active feature specs.

## 0. Thứ tự nguồn sự thật

Trước khi đổi product behavior, đọc theo thứ tự:

1. `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`
2. `docs/product/learning-model-v2/golden-session-validation.md`
3. `.specify/memory/constitution.md`
4. active `specs/<feature>/spec.md`, `plan.md`, `tasks.md` và acceptance criteria của PR/issue hiện tại
5. code + tests trên branch đang thay đổi
6. `AGENTS.md` cho mission, program state và execution protocol
7. `HANDOVER.md` này cho operational traps và recent verified state
8. `docs/archive/bmad/` chỉ để tra lịch sử

**BMAD không còn là methodology đang hoạt động.** Artifact BMAD đã archive và không được dùng để ghi đè product docs, constitution, active specs hay code/tests hiện tại.

Luôn kiểm tra `main`, PR và GitHub Actions thật thay vì tin số PR/CI từ trí nhớ.

---

## 1. Sản phẩm hiện là gì

Vidlish không còn được tổ chức quanh lời hứa “dán YouTube URL → AI tạo lesson”.

Mission hiện tại là đưa một người Việt từ **không biết tiếng Anh** đến sử dụng được tiếng Anh — listening, speaking, reading, writing — bằng một learning loop có evidence:

```text
comprehensible input
→ notice
→ retrieval / production
→ changed-context use
→ delayed review
→ progressively less support
```

Giá trị bền vững:

```text
comprehensible input at the learner's level
+ personal capability evidence
+ varied delayed review
+ progressively less support
```

### Video là nguồn, không phải trung tâm

- Người bắt đầu từ zero dùng beginner input ngắn, có bounded support và comprehensibility gate.
- YouTube/canonical transcript là một nguồn input nâng cao khi learner đã đủ khả năng sử dụng authentic media.
- Không lên roadmap như thể “đến được video path” là đích cuối.

---

## 2. Trạng thái chương trình đã kiểm chứng

Learning Model v2 đã nằm trên `main` từ PR #44. Không còn integration branch riêng.

Đã có trong code/runtime:

- learner-first shell;
- `/start` beginner path cho zero/very-low evidence;
- durable learning sessions;
- owner-bound privacy-safe attempts/evidence;
- server-confirmed support/replay evidence;
- changed-context transfer;
- delayed review + application-layer scheduling;
- capability-oriented progress views;
- source-grounded YouTube generation path;
- Supabase RLS/RPC + pgTAP;
- Chromium product journeys;
- durable Supabase Golden Session journey.

Production đã chứng minh v2 authoring có thể tạo/publish `lesson_versions`. Điều đó chứng minh **reachability**, không chứng minh reliability hay teaching value.

### Hard gate hiện tại: Gate 5

Gate 5 = analytics + moderated usability với **5 target users**.

Feature 004 tạo evaluator + predeclared thresholds + runbook. Feature 005/PR #128 làm study runnable local mà không cần DevTools, production Supabase hay paid provider.

PR #128 exact head:

```text
51c4ff44bb85fca8cee4f8b39a7e90297fe43d69
```

CI #474 / run `32571811299` trên exact head đó đã pass:

- typecheck + lint;
- unit tests;
- production build;
- Supabase migration + RLS/pgTAP;
- Chromium product journeys;
- durable Supabase learning journey;
- owner-crossing measurement rejection;
- aggregate CI gate.

PR #128 được squash-merge vào `main` thành:

```text
fdbee37bd3b1eca473b3c25f65eece772251d987
```

**Gate 5 vẫn chưa PASS.** Không có quyền biến fixture/browser CI thành “5 learner evidence”. Cần 5 phiên người thật đúng protocol.

Runbook:

```text
docs/product/learning-model-v2/golden-session-usability-runbook.md
```

Local operator harness:

```bash
pnpm study:golden
```

Nguyên tắc của harness:

- một real participant mỗi clean DB/browser cycle;
- local Supabase + durable fixture;
- paid/provider credentials bị strip khỏi child runtime;
- capture page tự lấy Golden session pointer, không cho moderator gõ UUID;
- measurement endpoint vẫn owner-scoped server authority;
- moderator observations bounded và mặc định unset;
- không suy diễn positive observation từ telemetry;
- participant JSON không được tự persist lên server;
- reset chỉ xóa Golden browser-state key;
- phải có 5 genuine records rồi mới evaluate Gate 5.

Không tuyển được 5 người thật không phải lý do để tạo synthetic records.

### Gate 5 operator evidence hardening sau Features 007–008

Feature 007/PR #132 sửa defect ở capture UI: sau khi moderator build participant JSON, đổi một observation trước đây không làm record cũ biến mất. UI có thể hiển thị observation mới trong khi JSON copy ra vẫn chứa observation cũ. Boundary hiện tại:

- mọi moderator observation change làm built participant JSON + copy state bị invalidate;
- rebuild dùng observation hiện tại;
- scoped Golden browser-state reset vẫn giữ record đã build để moderator copy trước khi dừng cycle;
- không persist participant record mới lên browser/server;
- không đổi participant schema, evaluator hoặc Gate 5 thresholds.

Verification Feature 007:

- final exact head `40c58b2589e96b2e9c1e1c1075700e16e869a058` pass full CI #488 / run `32576493806`;
- PR #132 squash-merge vào `main` thành `c45ac2a8c6baafd16bb19ac7b240560ea92a5da1`.

Feature 008/PR #133 sửa defect ở `pnpm study:golden`: harness trước đây có thể in “ready” trước khi `next dev` thực sự chạy và không chứng minh port 3200 thuộc fresh participant cycle. Boundary hiện tại:

- check loopback study port trước khi reset participant DB; port đang bị process cũ chiếm thì fail closed trước khi mutate cycle;
- sau khi clean fixture được load, check port lần nữa ngay trước spawn để thu hẹp startup race;
- chỉ in operator URLs sau khi chính child app trả successful HTTP response ở `/sign-in`;
- child exit/error trước readiness thì fail closed;
- readiness timeout bị bounded và timed-out child bị terminate;
- signal forwarding, local Supabase isolation và no-paid-provider boundary được giữ nguyên.

Verification Feature 008:

- implementation head `47ae2920a92a68a6a542c8815d7322ad168d7192` pass full CI #490 / run `32577783623`;
- final exact head `ddebb888278d6f751647a909334d94f9327a32be` pass full CI #491 / run `32577961401`;
- PR #133 squash-merge vào `main` thành `9946df6b799346a9e1470a1c100515c1298fb684` bằng `expected_head_sha`.

Features 007–008 là **operator/evidence-integrity hardening**, không phải 5-person learner evidence. Chúng không thay đổi và không pass Gate 5.

### Beginner evidence authority sau Feature 006

PR #130 sửa một defect thật: trước đó browser có thể gửi chính `word` và dictation answer-key `sentence` cho attempt route, trong khi một số `SECURITY DEFINER` RPC ghi/đọc evidence còn executable bởi `authenticated`. Điều đó làm server-side scoring trông có authority nhưng canonical fact vẫn do client lựa chọn.

Boundary hiện tại:

- `/api/beginner/session` phát opaque challenge ID cho item server đã chọn;
- challenge row giữ owner, kind, target word, authoritative sentence khi cần dictation, expiry và consumed state;
- `/api/beginner/attempt` chỉ nhận challenge ID + learner action; browser không gửi canonical target hay answer key;
- route đọc challenge theo owner rồi score `heard` với sentence server lưu;
- DB RPC derive item key từ challenge và consume challenge atomically với evidence upsert;
- challenge sai owner, hết hạn, ngẫu nhiên hoặc đã consume đều fail closed;
- calibration POST phải khớp **đúng tập item deterministic hiện tại của server**; missing/extra/duplicate/substituted item bị reject;
- browser không có `EXECUTE` trên legacy arbitrary-word evidence RPC, calibration persistence RPC, arbitrary-owner `learner_known_words(uuid)`, hay challenge mutation RPC;
- challenge table không mở browser policy; runtime persistence dùng server/service-role boundary;
- direct learning-table writes của browser vẫn bị khóa; owner relationships của lesson/review paths còn được giữ bằng composite foreign keys, không chỉ route checks.

Verification của Feature 006:

- implementation head `3952f461fda3a42e60fe94dce97ae6396219c58a` pass full CI #482 / run `32574866979`;
- final exact head `dc044508a9010ad0153f4e9400694478f68916c2` pass full CI #483 / run `32575040768`;
- PR #130 squash-merge vào `main` thành `21a6b5f070c0544e0f7049b1c65871be70c8f5de`.

Sau merge, audit lại lesson session/attempt, support events, delayed review, lesson progress và product-observation RPC không tìm thấy cùng class browser-executable evidence bypass: các mutation path đó đang service-role-only và có ownership binding phù hợp. Đây là kết quả audit hiện tại, không phải lời khẳng định không bao giờ có bug mới.

Feature 006 là security/evidence-integrity proof, **không phải learner evidence**. Nó không thay đổi hay pass Gate 5.

---

## 3. Learning invariants không được phá

- Comprehensibility là gate; policy `i+1` hiện tại là policy auditable, không phải định luật khoa học bất biến.
- Receptive và productive evidence là các loại evidence khác nhau.
- Supported success và independent success không được gộp.
- Completion != mastery.
- Scheduler state quyết định khi nào item quay lại, không tự chứng minh independent capability.
- Reading correction không phải completion nếu policy yêu cầu retry.
- Changed-context transfer phải thay context/input, không chỉ lặp lại source sentence.
- Immediate transfer và delayed transfer được claim/store riêng.
- UI-local state không được trở thành authority cho durable learning evidence.
- Solved và revealed là hai trạng thái khác nhau.
- Evidence/provenance styling chỉ dùng khi thực sự mang nghĩa evidence.

Product owner đã cho phép lưu learner writing và recording learner speech khi đó là chức năng cần thiết cho writing/speaking. Không biến quyền đó thành lý do cho listening attempt mang free text/audio không liên quan.

---

## 4. Source-grounded path: grounding promise

Với bài học dựa trên video:

**Mọi source quote phải là lời thoại thật từ canonical permitted transcript segments.**

Boundary:

- model/provider đề xuất IDs/labels;
- server ánh xạ/hydrate exact text + timestamps;
- evidence ngoài allowlist bị reject;
- quality/grounding gate nằm trước publish;
- không thêm đường cho model tự viết quote rồi coi là grounded.

Pipeline production-shaped hiện tại:

```text
YouTube metadata
→ durable lesson job
→ native transcript acquisition
→ canonical transcript persistence
→ original-English eligibility
→ permitted segment allowlist
→ bounded diagnosis / authoring
→ deterministic gate + grounding
→ quality pass
→ v2 lesson_version publish
→ guided learning session
```

v1 authoring flow đã bị loại khỏi current workflow. Không phục hồi v1 như một shortcut để làm test xanh.

---

## 5. Kiến trúc

Dependency direction:

```text
app / route handlers
→ application
→ ports
← adapters
```

Key areas:

- `src/shared/contracts/`: runtime/domain contracts;
- `src/modules/learning/application/`: authoritative learning behavior;
- `src/modules/learning/ports/`: repository/provider boundaries;
- `src/adapters/fake/`: deterministic local/test adapters;
- `src/adapters/supabase/`: durable persistence;
- `src/platform/`: composition/config;
- `src/workflows/`: Vercel Workflow durable orchestration;
- `supabase/migrations/`: DB invariants/RPC/RLS;
- `supabase/tests/`: pgTAP;
- `tests/e2e/`: user/browser evidence.

Inngest đã bị loại từ kiến trúc cũ. Không tạo Inngest app, event key hay endpoint cũ.

---

## 6. Production/provider safety

Ordinary local/CI work dùng fixture/fake/local Supabase.

Không gọi production Supabase, Gemini, Supadata hoặc paid provider khác nếu task không cho phép rõ ràng việc đó.

Không bao giờ đưa service/provider keys vào:

- client bundle;
- logs;
- screenshot;
- prompts;
- tests;
- repository files.

Production chỉ dùng một enabled provider/model/key theo current configuration. Benchmark model tạm thời không tự đổi production routing.

---

## 7. Những bẫy production đã từng làm hỏng hệ thống

### 7.1 Gemini wire schema quá phức tạp

Gemini từng từ chối full JSON schema với lỗi dạng:

```text
400 The specified schema produces a constraint that has too many states for serving
```

Wire schema phải strip đúng các unsupported/high-state keywords đã được adapter hiện tại xử lý. Server-side Zod/domain validation vẫn là authority. Không “fix” bằng cách xóa field nghiệp vụ hay nới contract.

### 7.2 Không bắt model sao chép ID dài

Model từng làm rơi prefix của segment ID dù phần hex còn đúng. Dùng short labels trong prompt và server map về canonical IDs trước validation.

### 7.3 Thinking/sampling

Provider config đã từng hỏng vì truyền thinking level sai kiểu hoặc tự chỉnh sampling không phù hợp Gemini 3.x.

Không đổi thinking/sampling theo cảm giác. Đọc adapter + current provider docs trước khi thay.

### 7.4 Supabase Data API row cap

`api.max_rows` có thể giới hạn response dù query thành công.

Với tập có thể vượt limit:

- lọc nghiệp vụ trong Postgres;
- deterministic order;
- `count: "exact"` + `range()`;
- tiến offset theo số row server thật trả;
- fail closed nếu exact count nói còn row nhưng page kế tiếp rỗng.

Không tải owner-wide rồi `.filter()` trong Node để giả làm business query.

### 7.5 Workflow phải terminalize hữu hạn

Không được để workflow kết thúc mà job vẫn ở active state.

- retry exhaustion phải terminalize;
- active slot phải được trả;
- workflow boundary fail closed nếu final state vẫn active;
- watchdog là last-resort safety net, không phải primary completion mechanism.

### 7.6 Supabase timestamp có offset

`timestamptz` có thể serialize dạng `+00:00`, không chỉ `Z`. Contract đọc DB phải chấp nhận offset-aware datetime.

### 7.7 YouTube segment playback phải tự dừng

Iframe player dùng `enablejsapi=1` và timer ở segment end. Không dựa vào polling `currentTime` làm authority duy nhất; message chậm không được để clip chạy quá đoạn learner cần nghe. Timer phải clear khi phát đoạn mới và khi unmount.

### 7.8 CI xanh có thể xanh sai lý do

Fixture tests đã từng xanh trong lúc provider thật thất bại. In-memory/unit tests cũng không chứng minh SQL thực thi được.

- DB change cần pgTAP.
- learning-flow change cần Chromium.
- persistence change cần durable Supabase journey.
- provider change chỉ có real-provider evidence khi task cho phép dùng key/quota.
- không weaken test, force click hoặc nới RLS chỉ để CI xanh.

### 7.9 pgTAP/PLpgSQL traps đã gặp

Ba lớp lỗi từng chỉ lộ khi SQL thực sự chạy:

- fixture dựng trạng thái vi phạm unique/active-job invariant;
- output parameter trùng tên column làm `on conflict` ambiguous;
- `CHECK (expr = value)` fail open khi `expr` là NULL.

Đừng coi regex-on-migration-text là database proof.

### 7.10 `SECURITY DEFINER` + `EXECUTE` mới là quyền ghi thật

Không đủ để nói “browser không INSERT được table” nếu browser vẫn có thể gọi một `SECURITY DEFINER` function ghi table đó. Feature 006 tồn tại vì test cũ từng chứng minh direct table INSERT bị cấm nhưng bỏ sót function privilege.

Khi thêm/đổi RPC liên quan evidence:

- audit `has_function_privilege` cho `anon`, `authenticated`, `service_role`;
- kiểm tra function nhận owner ID có thể trở thành arbitrary-owner read/write hay không;
- nếu application dùng admin/secret client, đừng dựa vào user `auth.uid()` ở service-only persistence primitive;
- canonical target/answer/evaluation fact phải đến từ server-owned state hoặc immutable blueprint, không từ field browser có thể tự chọn;
- single-use claims cần atomic consume + write, không phải “GET rồi UPDATE” tách rời dễ race/replay;
- route ownership check không thay structural FK/RLS/function privilege proof.

---

## 8. Local SQL / verification

Canonical checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
supabase test db
pnpm test:e2e
```

Có thể dùng PGlite helper để bắt lỗi migration/fixture syntax/schema nhanh trước CI:

```bash
pnpm db:local
pnpm db:local supabase/fixtures/a.sql b.sql
```

Nó không thay pgTAP/RLS proof.

Full required CI trên exact PR head mới là merge evidence.

---

## 9. Measurement cũ: dùng như historical evidence, không dùng làm current roadmap

Những phép đo provider/pipeline cũ vẫn có ích để tránh đo lại vô ích, nhưng không được coi là current product priority.

Ví dụ historical measurement từng ghi nhận cho một video 3m34s / 61 segments:

| Bước | Thời gian | Tỉ trọng |
|---|---:|---:|
| Gemini authoring | ~13,6s | 68% |
| Supadata + normalization | ~5,9s | 30% |
| YouTube metadata | ~0,4s | 2% |
| language detection | ~0,03s | 0,1% |

Chỉ đo lại nếu có hypothesis mới hoặc provider/runtime đã thay đổi đủ để phép đo cũ mất ý nghĩa.

---

## 10. Việc tiếp theo theo gate, không theo feature hype

Hiện tại không có technical feature nào được phép tự tuyên bố Gate 5 hoàn tất.

Next product evidence:

1. recruit 5 target users theo runbook;
2. một participant mỗi clean harness cycle;
3. capture bounded moderator observation + owner-scoped durable measurement;
4. giữ 5 genuine participant JSON records;
5. evaluate đúng predeclared thresholds;
6. chỉ khi Gate 5 có evidence mới quyết định Gate 6 / 20–50 learner cohort.

Trong lúc chưa có người thật, chỉ nên làm technical work nếu nó:

- sửa defect quan sát được;
- làm protocol hiện tại thực sự runnable/safer;
- bảo vệ evidence/ownership/privacy;
- hoặc sửa governance/source-of-truth đang kéo development sai hướng.

Không thêm gamification, payment, social, multi-language hay model-routing complexity chỉ để có thứ để code.

---

## 11. Quy tắc làm việc

- Work from `main`.
- Dùng Spec Kit cho material bounded slices.
- Trace UI/API → application → port → adapter → DB → tests trước khi sửa persistence/evidence.
- Server authority trước, UI projection sau.
- Implement smallest slice tạo durable evidence.
- Focused checks trước, full exact-head CI sau.
- Review diff theo hướng privacy, grounding, ownership, NULL semantics, race/provider/test gaps.
- Không merge nếu required CI trên exact reviewed head chưa xanh.
- Không coi merge/build/CI là learner evidence.
- Không ghi production hoặc tiêu provider quota nếu task chưa authorize.
- Báo rõ cái gì verified và cái gì chỉ inferred.