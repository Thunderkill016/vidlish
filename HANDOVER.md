# Bàn giao Vidlish — operational state hiện tại

Cập nhật: **2026-08-22**, sau khi product owner chuyển chương trình sang **personal-first learning** và technical evidence path đã được harden qua Features 006–009.

File này giữ operational state và các bẫy kỹ thuật đã được kiểm chứng. Nó không đứng trên Product Master Plan, constitution hay active feature spec.

## 0. Thứ tự nguồn sự thật

Trước khi đổi product behavior, đọc theo thứ tự:

1. `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`
2. `.specify/memory/constitution.md`
3. active `specs/<feature>/spec.md`, `plan.md`, `tasks.md` + PR acceptance criteria
4. code + tests trên branch đang thay đổi
5. `AGENTS.md` và `HANDOVER.md` cho program state / operational traps
6. `docs/product/learning-model-v2/golden-session-validation.md` khi task liên quan **deferred external-user Golden Session study**
7. `docs/archive/bmad/` chỉ để tra lịch sử

**BMAD không còn là methodology đang hoạt động.**

Luôn kiểm tra `main`, PR và GitHub Actions thật thay vì tin số PR/CI từ trí nhớ.

---

## 1. Sản phẩm hiện là gì

Vidlish được build trước hết để **product owner tự học tiếng Anh thật**.

Mission:

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

### Active loop

```text
owner học thật trong Vidlish
→ server ghi durable evidence
→ /progress chỉ hiển thị claim evidence support được
→ learner làm next evidence-bearing action
→ friction / missing evidence trở thành bounded feature tiếp theo
```

Không cần tuyển 5 người khác để tiếp tục build cho personal use.

### Video là nguồn, không phải trung tâm

- `/start` là entry chính khi authentic English còn quá khó.
- YouTube/canonical transcript là nguồn nâng cao khi learner đã đủ khả năng dùng authentic media.
- Không để dashboard/roadmap biến “tạo video lesson” thành default learning action.

---

## 2. Trạng thái kỹ thuật đã kiểm chứng

Learning Model v2 đã nằm trên `main` từ PR #44. Không còn integration branch riêng.

Đã có trong runtime:

- learner-first shell;
- `/start` beginner path;
- server-bound beginner evidence challenge;
- durable source-lesson sessions;
- owner-bound attempts/evidence;
- support/replay evidence;
- source changed-context transfer;
- source delayed review + FSRS schedule;
- capability-oriented progress;
- source-grounded YouTube authoring;
- Supabase RLS/RPC + pgTAP;
- Chromium + durable Supabase journeys.

Production-shaped v2 authoring đã publish được `lesson_versions`. Đây là reachability evidence, không phải teaching/retention evidence.

### Gap học tập quan trọng nhất hiện tại

Beginner path hiện có:

- narrow independent word evidence;
- within-session sentence reuse;
- calibration chống self-report false positives;
- server-authoritative challenge binding.

Nhưng beginner path **chưa có durable changed-context + cross-session delayed-review chain riêng** tương đương source-lesson review state.

Vì vậy:

- không gọi một beginner word “retained/mastered” chỉ vì learner nói/gõ đúng một lần;
- `/progress` chỉ được claim independent evidence ở beginner stage;
- next personal-learning slice hợp lệ là nối beginner evidence qua changed context và delayed review thật.

---

## 3. External five-person Gate 5: giữ lại nhưng deferred

Feature 004–005 tạo five-person Golden Session evaluator + study harness. Feature 007–009 harden capture/readiness/test proof.

**External Gate 5 vẫn chưa PASS.** Chưa có 5 genuine participant records.

Nhưng nó **không còn là active blocker** cho personal-first development.

Chỉ re-activate khi owner muốn validate Vidlish cho người khác hoặc thương mại hóa.

Khi đó dùng nguyên protocol/threshold đã predeclare tại:

```text
docs/product/learning-model-v2/golden-session-validation.md
docs/product/learning-model-v2/golden-session-usability-runbook.md
```

và harness:

```bash
pnpm study:golden
```

Không fabricate participant records và không dùng CI fixture thay learner evidence.

### Operator hardening đã merge

Feature 007 / PR #132:

- đổi moderator observation sau khi build participant JSON làm stale JSON bị invalidate;
- final exact-head CI #488 xanh;
- merge `c45ac2a8c6baafd16bb19ac7b240560ea92a5da1`.

Feature 008 / PR #133:

- study port phải free trước DB reset và được check lại trước spawn;
- chỉ báo ready sau khi fresh child trả HTTP ở `/sign-in`;
- child exit/timeout fail closed; timeout child bị terminate;
- merge `9946df6b799346a9e1470a1c100515c1298fb684`.

Feature 009 / PR #135:

- post-merge audit phát hiện `scripts/golden-study-harness.test.mjs` từng nằm ngoài Vitest discovery;
- `vitest.config.ts` đã include chính xác file này;
- CI #495 unit log chứng minh `scripts/golden-study-harness.test.mjs (9 tests)` pass;
- toàn CI #495 xanh;
- merge `1b34f9faae82a92d8bf377be334f80a6d2b119f0`.

Bài học: **test file tồn tại không có nghĩa CI đã chạy nó**. Khi proof phụ thuộc một test cụ thể, kiểm exact CI log/discovery thay vì chỉ nhìn aggregate green.

---

## 4. Beginner evidence authority sau Feature 006

PR #130 sửa browser-controlled evidence truth.

Boundary hiện tại:

- `/api/beginner/session` phát opaque challenge ID cho target server đã chọn;
- challenge row giữ owner, kind, target word, authoritative sentence nếu cần, expiry và consumed state;
- `/api/beginner/attempt` nhận learner action, không nhận canonical target/answer key từ browser;
- route resolve challenge theo owner rồi score với server-owned fact;
- DB consume challenge atomically với evidence write;
- wrong-owner, expired, random hoặc consumed challenge fail closed;
- calibration POST phải khớp exact deterministic item set server hiện tại;
- browser không có `EXECUTE` trên arbitrary evidence/calibration/owner-read primitives;
- challenge table không mở browser mutation policy;
- direct table write vẫn bị khóa.

Verification:

- final exact head `dc044508a9010ad0153f4e9400694478f68916c2` pass CI #483;
- PR #130 merge `21a6b5f070c0544e0f7049b1c65871be70c8f5de`.

### `SECURITY DEFINER` trap

Không đủ để test browser không `INSERT` table nếu browser vẫn có thể `EXECUTE` một `SECURITY DEFINER` function ghi table đó.

Khi thêm/đổi RPC evidence:

- audit `has_function_privilege` cho `anon`, `authenticated`, `service_role`;
- kiểm arbitrary-owner read/write;
- nếu app dùng admin client, đừng dựa vào user `auth.uid()` trong service-only primitive;
- canonical target/answer/evaluation fact phải đến từ server-owned state hoặc immutable blueprint;
- single-use claim phải atomic consume + write;
- route ownership check không thay structural FK/RLS/function privilege proof.

---

## 5. Learning invariants không được phá

- Comprehensibility là gate; one-new-target beginner rule hiện tại là auditable policy, không phải định luật khoa học.
- Receptive và productive evidence là hai loại khác nhau.
- Supported success và independent success không được gộp.
- Completion != mastery.
- Scheduler state chỉ quyết định timing, không chứng minh capability.
- Reading correction không phải completion nếu policy yêu cầu retry.
- Changed-context transfer phải đổi context/input.
- Immediate và delayed transfer claim/store riêng.
- Stronger checkpoint phải giữ đủ prerequisite yếu hơn; timestamp mâu thuẫn phải fail closed.
- UI-local state không được làm durable authority.
- Solved và revealed là hai trạng thái khác nhau.
- Writing/speaking có thể lưu learner writing/audio khi đó là chức năng cần thiết; task khác không được piggyback raw content.

---

## 6. Source-grounded path

Với bài học dựa trên video:

**Mọi source quote phải là lời thoại thật từ canonical permitted transcript segments.**

Boundary:

```text
YouTube metadata
→ durable lesson job
→ transcript acquisition
→ canonical transcript persistence
→ original-English eligibility
→ permitted segment allowlist
→ bounded diagnosis / authoring
→ deterministic gate + grounding
→ quality pass
→ v2 lesson_version publish
→ guided session
```

Model/provider chỉ đề xuất bounded output/IDs. Server hydrate canonical text/timestamp và reject evidence ngoài allowlist.

Không phục hồi v1 authoring như shortcut.

---

## 7. Production/provider traps đã biết

### Gemini wire schema

Full JSON schema quá phức tạp từng bị Gemini từ chối (`too many states for serving`). Adapter phải strip unsupported/high-state wire constraints; server Zod/domain validation vẫn là authority.

### Model IDs

Không bắt model sao chép canonical ID dài. Dùng short label trong prompt rồi server map về canonical IDs.

### Thinking/sampling

Không đổi Gemini thinking/sampling theo cảm giác. Đọc current adapter + provider docs trước.

### Supabase Data API row cap

Với owner-wide sets có thể vượt cap:

- filter business rule trong Postgres;
- deterministic order;
- `count: "exact"` + `range()`;
- advance offset theo số row server trả;
- fail closed nếu exact count nói còn row nhưng page tiếp theo rỗng.

### Workflow terminalization

Workflow không được kết thúc mà durable job vẫn active. Retry exhaustion phải terminalize và trả active slot.

### PostgreSQL timestamps

`timestamptz` có thể serialize `+00:00`, không chỉ `Z`.

### YouTube segment playback

Iframe segment player phải có bounded stop/timer; không dựa polling `currentTime` như authority duy nhất.

### pgTAP / PLpgSQL

Đã từng gặp:

- fixture vi phạm unique/active invariant;
- output variable trùng column làm SQL ambiguous;
- `CHECK (expr = value)` fail-open khi `expr` NULL.

Đừng coi regex trên migration text là DB proof.

---

## 8. Verification

Canonical checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
supabase test db
pnpm test:e2e
```

PGlite helper:

```bash
pnpm db:local
pnpm db:local supabase/fixtures/a.sql b.sql
```

PGlite bắt schema/SQL errors nhanh nhưng không thay pgTAP/RLS proof.

Full required CI trên **exact final PR head** mới là merge evidence.

Không weaken test, force click hoặc nới RLS chỉ để xanh.

---

## 9. Việc tiếp theo — personal-first

Không còn task “recruit 5 target users” trong active product loop.

Next learning-system work:

1. owner dùng `/start` như learner thật;
2. `/progress` phải cho thấy independent evidence hiện có mà không phóng đại;
3. nối beginner independent evidence vào **changed-context cross-session delayed review**;
4. dùng delayed evidence để xem thứ đã học có sống qua thời gian hay không;
5. sửa các friction learner thật gặp: input quá khó/dễ, audio, support, correction, review timing, speaking/writing gap;
6. chỉ giảm support khi evidence cho thấy learner làm được với ít trợ giúp hơn.

External market validation chỉ quay lại khi owner explicitly muốn validate cho người khác/business.

Không thêm gamification, payment, social, multi-language hay model-routing complexity chỉ để có thứ để code.

---

## 10. Quy tắc làm việc

- Work from `main`.
- Dùng Spec Kit cho material bounded slices.
- Trace UI/API → application → port → adapter → DB → tests trước persistence/evidence changes.
- Server authority trước, UI projection sau.
- Implement smallest slice tạo hoặc bảo vệ durable evidence.
- Focused tests trước, full exact-head CI sau.
- Review privacy, grounding, ownership, NULL semantics, race/provider/test gaps và misleading learning claims.
- Không merge nếu required CI trên exact reviewed head chưa xanh.
- Không coi merge/build/CI là learner evidence.
- Không ghi production hoặc tiêu paid provider quota nếu task chưa authorize.
- Personal-first không có nghĩa hardcode owner ID hay bỏ auth/security.
- Báo rõ cái gì verified và cái gì chỉ inferred.
