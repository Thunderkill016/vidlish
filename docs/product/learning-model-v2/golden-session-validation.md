# Golden Session Validation Protocol

**Status:** P0 product-validation contract  
**Source branch:** `design/learning-model-v2`  
**Related:** `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`, issue #47

---

## 1. Purpose

This protocol defines the smallest Vidlish experience that must work before more authoring architecture, provider integration, multilingual expansion, billing, or production rollout.

The purpose is not to prove durable language acquisition from one five-minute lesson. It is to verify that the product can create a clear, understandable first-session learning gain and a reason to return.

The tested promise is:

> A Vietnamese B1 learner who normally depends on English captions can use Vidlish to understand one real source moment, retrieve one useful expression, use it in a changed context, and know what will be reviewed next.

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

This is a narrow validation persona, not a claim that the product only serves developers.

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

The source is suitable for the first internal validation because it is already represented by a canonical fixture, the speaker is clear, and the target function fits the chosen learner persona.

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

Record locally/in the moderated protocol:

- first-listen gist result;
- whether the learner recognized `a member of`;
- replay count before support;
- learner's own confidence as self-report only.

### Step 2 — Progressive support

Support must open in this order and only after a learner action:

1. replay;
2. concise context hint;
3. keyword hint;
4. English caption;
5. chunk boundary;
6. Vietnamese meaning.

The UI must make the next support option understandable without exposing all later support at once.

Record:

- maximum support level opened;
- time spent before each support request;
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
- full answer is bounded and appears only after the configured attempt boundary;
- a correct response proceeds without unnecessary repetition.

### Step 5 — Changed-context use

Scenario:

> Bạn vừa tham gia một dự án mới. Hãy giới thiệu bạn thuộc nhóm nào bằng tiếng Anh.

The learner's response should be checked with criteria, not fake-graded by an LLM:

- communicates membership/affiliation;
- contains an appropriate group or team;
- is understandable enough for the task;
- is not required to copy the source organization.

Example appears only after attempt and must be labelled as a new example, not a quote from the video.

### Step 6 — Retry after correction

If a correction is shown, require the learner to attempt the complete changed-context response again.

Limit to one or two high-impact corrections.

The flow must not treat reading the correction as completion.

### Step 7 — After check

Replay the original source window with captions hidden again.

Ask the same gist question and a fresh recognition/retrieval prompt.

Record:

- after-listen gist result;
- recognition of the target;
- support still required;
- changed-context completion;
- learner's own statement of whether the original audio now sounds clearer.

### Step 8 — Honest finish

Suggested copy:

> Bạn đã hoàn thành lần luyện đầu. Vidlish sẽ đưa cách diễn đạt này trở lại trong một tình huống khác để kiểm tra xem bạn còn nhớ và dùng được không.

Do not display `mastered`, `fluent`, or a percentage implying durable ability.

---

## 6. Required product events

Names may change during implementation, but the following meanings must be measurable:

- session viewed;
- first source play completed;
- first gist attempted;
- first gist outcome;
- support requested with support level;
- target notice viewed;
- retrieval attempted;
- retrieval outcome and attempt number;
- correction shown;
- mandatory retry attempted;
- changed-context transfer attempted;
- transfer criteria self-check completed;
- after-listen check attempted;
- session completed;
- session abandoned with last activity and elapsed time;
- player/transcript/runtime error.

Privacy boundary:

- do not place raw open responses, raw audio, recognized speech, source transcript text, email, or other personal information in analytics events;
- use IDs, bounded enums, counts, timings, and outcome categories.

---

## 7. Internal five-person usability protocol

Recruit five people matching as much of the persona as possible. Avoid explaining the intended flow before they use it.

### Moderator introduction

> Đây là một bản thử nghiệm học tiếng Anh từ video. Hãy sử dụng như bình thường và nói thành tiếng khi bạn thấy khó hiểu hoặc không biết phải làm gì. Bọn mình đang kiểm tra sản phẩm, không kiểm tra trình độ của bạn.

### Observe without helping unless blocked

Record:

- whether the learner understands the initial promise;
- whether they know to listen before looking for text;
- whether support controls are discoverable;
- whether they understand why an answer remains hidden;
- whether feedback is actionable;
- whether mandatory retry feels useful or punitive;
- whether changed-context use is understandable;
- whether the final message is credible;
- exact abandonment/confusion points;
- technical problems on mobile and desktop.

### Post-session questions

Ask behavior-focused questions:

1. Đoạn nào khiến bạn thấy mình nghe rõ hơn so với lúc đầu?
2. Không nhìn lại bài, bạn còn nhớ cách nói mình thuộc một nhóm không?
3. Bước nào khó hiểu hoặc thừa nhất?
4. Bạn có muốn dùng Vidlish với video của chính mình không? Bạn sẽ dùng video nào?
5. Ngày mai Vidlish nhắc ôn lại đoạn này, bạn có quay lại không? Vì sao?
6. Điều gì phải tốt hơn để bạn sẵn sàng trả tiền?

Do not treat positive verbal intent as payment evidence.

---

## 8. Initial acceptance thresholds

These are internal hypotheses to force a decision, not industry benchmarks or claims of learning effectiveness.

For the five-person usability pass:

- at least 4/5 complete without moderator instruction;
- at least 4/5 can state the lesson goal in their own words;
- at least 4/5 successfully attempt changed-context use;
- no participant is blocked by player, support, feedback, or retry mechanics;
- no severe grounding, answer-exposure, or misleading-mastery defect;
- median session time stays within approximately 4–8 minutes;
- at least 3/5 show improved target recognition on the final hidden-caption replay.

Failure means fix the journey before adding provider complexity.

For the later 20–50 learner cohort, define thresholds before launch for:

- first-lesson completion;
- before/after recognition gain;
- second lesson within seven days;
- delayed-review return;
- serious lesson defect rate;
- week-two active use.

Do not use generation count or signup count as primary success evidence.

---

## 9. What this protocol does not prove

A successful internal session does not prove:

- long-term retention;
- transfer to real conversation;
- willingness to pay;
- scalable unit economics;
- legal clearance for arbitrary YouTube content;
- model-generated lesson quality;
- support for Shorts, long videos, multilingual sources, or noisy entertainment content.

Those require separate gates in the Product & Business Master Plan.

---

## 10. Implementation gate

The golden session is ready for the five-person test only when:

- runtime consumes the progressive-support policy;
- answer/reveal boundaries are enforced server/shared-side;
- correction requires retry;
- transfer declares a real changed dimension;
- after-listen check exists;
- completion language is honest;
- privacy-safe events are inspectable;
- desktop and mobile Chromium journeys pass;
- no provider call or production database is required for the internal test.

This is the next learning-product deliverable.
