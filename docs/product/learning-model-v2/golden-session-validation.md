# Golden Session Validation Protocol

**Status:** deferred external-user market-validation contract — technically runnable, five-person learner evidence pending  
**Current branch:** `main`  
**Related:** `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`, `docs/product/learning-model-v2/golden-session-usability-runbook.md`, specs 004–005

---

## 1. Purpose

This protocol defines a narrow source-grounded Vidlish experience for a future external-user validation phase.

The active Vidlish program is currently **personal-first**: the product owner is the first learner, and personal learning work is not blocked on this five-person study. The Product & Business Master Plan is the higher authority for that decision.

This file is intentionally retained unchanged in its persona, source, task journey and thresholds so that if market validation is reactivated later, the original five-person experiment remains interpretable rather than being rewritten to match whatever the product has become.

The purpose is not to prove durable language acquisition from one five-minute lesson. It is to test whether a B1 external learner can get a clear first-session learning gain from the source-grounded loop and understand why they would return.

The tested promise is:

> A Vietnamese B1 learner who normally depends on English captions can use Vidlish to understand one real source moment, retrieve one useful expression, use it in a changed context, and know what will be reviewed next.

Do not change the persona, source, target item, or thresholds merely to make a future market-validation run easier to pass.

---

## 2. Exact learner persona

- Vietnamese adult;
- approximate B1;
- regularly watches English technology videos;
- often enables English or Vietnamese captions;
- understands the topic broadly but misses short spoken phrases;
- wants better listening plus practical work-related conversation;
- has five minutes available;
- prefers balanced support;
- is not being assessed for certification.

This is a narrow validation persona, not a claim that the product only serves developers, B1 learners, or video-first learners.

---

## 3. Exact source

Existing grounded fixture:

- Video ID: `M7lc1UVf-VE`
- Title: `YouTube Developers Live: Embedded Web Player Customization`
- Channel: `Google for Developers`
- Learning window: approximately `00:16–00:24`
- Canonical evidence:
  - `I'm a member of the Developer Relations team.`
  - `different ways of customizing the YouTube-embedded player.`

Target language item:

- `a member of`
- contextual meaning: belonging to a group or organization;
- communicative function: introducing affiliation or team membership.

The source is suitable for this internal validation because it is represented by a canonical fixture, the speaker is clear, and the target function fits the chosen learner persona.

---

## 4. Learner-visible outcome

At the beginning, show two concrete outcomes:

1. Identify the topic of the short opening without seeing the transcript first.
2. Use `a member of` to introduce affiliation in a new work context.

Do not show system terms such as `retrieval`, `transfer`, `evidence`, `capability`, or `mastery` to the learner.

Suggested copy:

> Sau khoảng 5 phút, bạn sẽ nghe rõ mục đích của đoạn mở đầu và dùng được `a member of` để giới thiệu mình thuộc một nhóm.

---

## 5. Required session journey

### Step 1 — Before check

Play only the bounded source window with captions hidden.

Ask:

- what is the speaker going to discuss?
- what phrase did the learner hear about the speaker's team or role?

The second answer may be optional/free recall for manual observation and does not need to be persisted as unrestricted text.

Record through the approved study boundary:

- first-listen gist result;
- whether the learner recognized `a member of`;
- replay count before support;
- learner confidence as self-report only where the protocol asks for it.

### Step 2 — Progressive support

Support opens in this order and only after learner action:

1. replay;
2. concise context hint;
3. keyword hint;
4. English caption;
5. chunk boundary;
6. Vietnamese meaning.

The UI must make the next support option understandable without exposing all later support at once.

Record:

- maximum support level opened;
- time spent before support requests where available;
- whether the learner opened support intentionally or because the flow was unclear.

### Step 3 — Notice

Present only the selected target:

- source phrase;
- contextual Vietnamese meaning;
- communicative function;
- neutral register;
- brief, evidence-bounded listening note.

Do not add unrelated vocabulary or a grammar lecture.

### Step 4 — Productive retrieval

Hide the full model and ask the learner to reconstruct/use the target from a Vietnamese cue.

Requirements:

- learner attempts before answer reveal;
- first failure opens a partial hint, not the full answer;
- full answer appears only after the configured attempt boundary;
- correct response proceeds without unnecessary repetition.

### Step 5 — Changed-context use

Scenario:

> Bạn vừa tham gia một dự án mới. Hãy giới thiệu bạn thuộc nhóm nào bằng tiếng Anh.

The learner response is checked with bounded criteria rather than an unconstrained model claim:

- communicates membership/affiliation;
- contains an appropriate group or team;
- is understandable enough for the task;
- is not required to copy the source organization.

Any example shown after the attempt must be labelled as a new example, not a quote from the video.

### Step 6 — Retry after correction

If a correction is shown, require the learner to attempt the complete changed-context response again.

Limit to one or two high-impact corrections.

Reading the correction is not completion.

### Step 7 — After check

Replay the original source window with captions hidden again.

Ask the same gist question and a fresh recognition/retrieval prompt.

Record:

- after-listen gist result;
- recognition of the target;
- support still required;
- changed-context completion/attempt evidence;
- learner statement about whether the original audio sounds clearer only as self-report, not as mastery proof.

### Step 8 — Honest finish

Suggested copy:

> Bạn đã hoàn thành lần luyện đầu. Vidlish sẽ đưa cách diễn đạt này trở lại trong một tình huống khác để kiểm tra xem bạn còn nhớ và dùng được không.

Do not display `mastered`, `fluent`, or a percentage implying durable ability.

---

## 6. Required measurable meanings

Names may evolve, but the system/protocol must be able to distinguish the meanings needed if this deferred five-person study is run, including:

- session viewed/started;
- first source play;
- first gist attempt/outcome;
- support requested and support level;
- retrieval attempt/outcome and attempt number;
- correction/retry;
- changed-context transfer attempted;
- after-listen check;
- session completed or abandoned;
- elapsed time where the measurement contract supports it;
- player/transcript/runtime error.

The automated five-person evaluator does **not** infer moderator-only observations from telemetry.

Privacy boundary for study/evaluation data:

- no email or direct identity in participant records;
- no source transcript text copied into analytics/study records merely for convenience;
- no raw open learner response or raw audio in the bounded evaluator payload;
- use pseudonymous participant codes, IDs, bounded enums, counts, timings, and outcome categories.

Product-level permission to store learner writing/speech for personal learning functionality does not broaden this specific external-study contract.

---

## 7. Deferred five-person usability protocol

When external market validation is explicitly reactivated, recruit five people matching the persona as closely as practical. Avoid explaining the intended flow before they use it.

### Moderator introduction

> Đây là một bản thử nghiệm học tiếng Anh từ video. Hãy sử dụng như bình thường và nói thành tiếng khi bạn thấy khó hiểu hoặc không biết phải làm gì. Bọn mình đang kiểm tra sản phẩm, không kiểm tra trình độ của bạn.

### Observe without helping unless blocked

Record bounded observations required by the evaluator/runbook, including:

- whether the learner understands the initial promise;
- whether the learner can complete without moderator instruction;
- whether they can restate the lesson goal in their own words;
- whether support controls are discoverable;
- whether they understand why an answer remains hidden;
- whether feedback is actionable;
- whether retry/changed-context use is understandable;
- before/after target recognition level;
- whether any product mechanic blocks progress;
- severe grounding, answer-exposure, or misleading-mastery defects;
- technical problems on mobile/desktop.

Free-form qualitative notes may be kept outside the automated evaluator with unnecessary PII avoided.

### Post-session questions

Behavior-focused prompts may include:

1. Đoạn nào khiến bạn thấy mình nghe rõ hơn so với lúc đầu?
2. Không nhìn lại bài, bạn còn nhớ cách nói mình thuộc một nhóm không?
3. Bước nào khó hiểu hoặc thừa nhất?
4. Bạn có muốn dùng Vidlish với video của chính mình không? Bạn sẽ dùng video nào?
5. Ngày mai Vidlish nhắc ôn lại đoạn này, bạn có quay lại không? Vì sao?
6. Điều gì phải tốt hơn để bạn sẵn sàng trả tiền?

Do not treat positive verbal intent as payment evidence.

Operational details live in:

```text
docs/product/learning-model-v2/golden-session-usability-runbook.md
```

---

## 8. Predeclared external Gate 5 acceptance thresholds

These are internal hypotheses to force a future market decision, not industry benchmarks or claims of language-learning effectiveness.

For the five-person usability pass:

- at least 4/5 complete without moderator instruction;
- at least 4/5 can state the lesson goal in their own words;
- at least 4/5 successfully attempt changed-context use;
- no participant is blocked by player, support, feedback, retry, transfer, navigation, or another flow mechanic covered by the current bounded block categories;
- no severe grounding, answer-exposure, or misleading-mastery defect;
- median session time stays within approximately 4–8 minutes;
- at least 3/5 show improved target recognition on the final hidden-caption replay.

The current evaluator is fail-closed where its contract requires durable measurement and moderator observation. Missing evidence is not converted into a pass.

For a later 20–50 learner cohort, define thresholds before launch for:

- first-session completion;
- before/after recognition gain;
- second session within seven days;
- delayed-review return;
- serious lesson defect rate;
- week-two active use.

Do not use generation count or signup count as primary learning success evidence.

---

## 9. What this protocol does not prove

A successful five-person study would not prove:

- long-term retention;
- transfer to real conversation broadly;
- the zero-beginner path is validated;
- willingness to pay;
- scalable unit economics;
- legal clearance for arbitrary YouTube content;
- authoring-model reliability across broad source distributions;
- support for Shorts, long videos, multilingual sources, or noisy entertainment content.

It also says nothing about whether the owner may continue improving Vidlish for personal use before this study runs. The Master Plan explicitly allows that.

---

## 10. Technical readiness and deferred study state

The technical readiness conditions for this protocol are implemented through specs 003–005 plus later operator hardening.

The internal study can be run with:

```bash
pnpm study:golden
```

The harness/evaluator remain maintained because they are useful if external validation returns.

Current market-study state:

> Five genuine participant records have not been collected, so the external five-person Gate 5 remains unpassed and deferred.

Current product-development state:

> Personal-first owner learning is active and does not wait for those five records.

Do not fabricate participant records, substitute fixture journeys, or declare the external market gate passed from CI.
