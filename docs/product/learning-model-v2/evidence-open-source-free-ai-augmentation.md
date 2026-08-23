# Vidlish — evidence-based learning, open-source resources and free-AI augmentation

**Status:** decision input; does not change learner-visible runtime behavior  
**Reviewed:** 2026-08-23  
**Scope:** English-learning evidence, curriculum/data, open-source components, Gemini free-tier capabilities, privacy/licensing, and a rollout boundary compatible with the current product gates.

This document supplements, and does not override:

1. `docs/product/VIDLISH_PRODUCT_BUSINESS_MASTER_PLAN.md`;
2. `docs/product/learning-model-v2/golden-session-validation.md`;
3. `.specify/memory/constitution.md`;
4. active feature specifications and code/tests.

The purpose is not to make Vidlish contain more features. The purpose is to make every future feature answer a harder question: **what observable language capability should change, what evidence would demonstrate that change, and what is the cheapest/safest technology that can support it?**

---

## 1. Executive decision

Vidlish must not become a Duolingo-style completion game, nor an AI chat wrapper.

The durable learning primitive remains:

```text
comprehensible meaningful input
→ check meaning without leaking the answer
→ notice useful form / sound / chunk
→ retrieve before reveal
→ produce language
→ bounded corrective feedback
→ retry where policy requires it
→ changed-context transfer
→ delayed spaced retrieval
→ progressively less support
→ cold/interleaved evidence later
```

The strongest product distinction is not streaks, XP, lesson count, or the number of generated exercises. It is a **capability evidence ledger** that can distinguish:

- listening comprehension from reading comprehension;
- receptive recognition from productive recall;
- spoken production from written production;
- supported success from independent success;
- immediate transfer from delayed transfer;
- exposure/completion from actual demonstrated capability.

AI is allowed to propose, author, explain, converse and give bounded feedback. AI is **not** allowed to manufacture canonical source facts or learner mastery.

---

## 2. What the research supports strongly enough to design around

### 2.1 Spacing and retrieval are not optional decoration

Distributed practice and retrieval improve delayed retention. A learner who recognizes an answer immediately after seeing it has not demonstrated the same capability as a learner who retrieves it later without support.

Product consequence:

- attempts occur before reveal;
- review is distributed over time;
- delayed success is a separate evidence event;
- `ts-fsrs` schedules *when* evidence should be probed again, not *what the learner has mastered*.

Primary synthesis/examples:

- Cepeda et al. (2006), distributed practice: https://pubmed.ncbi.nlm.nih.gov/16719566/
- Roediger & Karpicke (2006), test-enhanced learning: https://pubmed.ncbi.nlm.nih.gov/16507066/
- Kim & Webb (2022), spacing in L2 vocabulary: https://doi.org/10.1017/S0272263121000782
- Agarwal et al., retrieval-practice systematic review: https://doi.org/10.1007/s10648-021-09595-9
- FSRS / `ts-fsrs`: https://github.com/open-spaced-repetition/ts-fsrs

### 2.2 Meaning-focused exposure alone is insufficient

Incidental vocabulary learning occurs through reading/listening/viewing, but average gains are modest and depend on repeated encounters, coverage and task conditions. “Watch more English” is therefore not a complete beginner curriculum.

Product consequence:

- input remains central, but important targets must return in retrieval/production;
- a video watched or sentence heard is exposure, not mastery evidence;
- authentic media is introduced only when it is sufficiently comprehensible.

Primary synthesis:

- Webb, Uchihara & Yanagisawa (2023), incidental vocabulary through meaning-focused input: https://doi.org/10.1017/S0272263122000527
- van Zeeland & Schmitt (2013), lexical coverage in listening: https://doi.org/10.1093/applin/ams074
- Webb (2021), lexical coverage review: https://files.eric.ed.gov/fulltext/EJ1316858.pdf

### 2.3 Input-led does not mean input-only

Comprehension-based and production-based instruction both contribute to L2 development, with different advantages depending on outcome and timing. Explicit instruction and corrective feedback can also help.

Product consequence:

- a zero beginner first receives bounded understandable input;
- production enters as soon as the task is genuinely attemptable;
- receptive and productive evidence are never collapsed into one `known` boolean.

Sources:

- Shintani, Li & Ellis (2013): https://doi.org/10.1111/lang.12001
- Goo et al. (2024), explicit instruction meta-analysis: https://eric.ed.gov/?id=EJ1416113
- Norris & Ortega (2000): https://doi.org/10.1111/0023-8333.00136

### 2.4 Corrective feedback needs learner action after correction

Oral corrective-feedback meta-analyses report durable positive effects. Prompts that induce self-repair can be especially useful. Reading a correction does not demonstrate the learner can now produce the correct form.

Product consequence:

```text
attempt → bounded diagnosis/correction → learner retry → new evidence
```

Do not auto-complete an item because feedback was shown.

Sources:

- Li (2010): https://doi.org/10.1111/j.1467-9922.2010.00561.x
- Lyster & Saito (2010): https://doi.org/10.1017/S0272263109990520

### 2.5 Captions are scaffolds, not listening mastery

Captioned viewing generally benefits L2 listening/vocabulary. That does not justify equating success with captions to unaided listening.

Product consequence:

- first-listen/cold evidence may hide captions;
- captions can be progressively revealed;
- evidence records whether captions, replay, translation or hints were used;
- later review should probe the same capability with less support and changed material.

Sources:

- Montero Perez et al., captioned video meta-analysis: https://doi.org/10.1016/j.system.2013.01.005
- updated captioned-viewing meta-analytic literature should be rechecked when the feature is specified; do not freeze a single effect size into product policy.

### 2.6 Vocabulary is more than isolated words

Multiword sequences have a processing advantage and are central to fluent language use. A curriculum of single headwords alone cannot model real communication.

Product consequence: future target contracts must support at least:

- `lexeme`;
- `multiword_chunk`;
- `construction`;
- `communicative_function`;
- validated `phonological_contrast`.

Source:

- multiword-sequence processing meta-analysis, Studies in Second Language Acquisition: https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/processing-advantage-of-multiword-sequences-a-metaanalysis/64D9BFF2B458422C8CCE202A520F914A

### 2.7 Pronunciation instruction should target intelligibility, not accent erasure

Phonetic training can improve perception and production; perception training is especially useful. CEFR phonological control emphasizes intelligibility rather than native-likeness.

Product consequence:

- train perception of contrasts as well as production;
- do not publish an “accent score” merely because an ASR model returned confidence;
- pronunciation/scoring must be validated on Vietnamese-accented English first;
- report bounded observations such as repeated recognition failures only when the measurement supports them.

Sources:

- CEFR Companion Volume: https://www.coe.int/en/web/common-european-framework-reference-languages
- L2-ARCTIC corpus description: https://psi.engr.tamu.edu/l2-arctic-corpus/

`L2-ARCTIC` is useful for research/validation because it includes Vietnamese L1 speakers and phoneme annotations, but its CC BY-NC licence makes it **research-only for Vidlish commercial use unless separate permission is obtained**.

### 2.8 Reading should eventually become sustained reading, not endless cards

Extensive reading shows positive effects across reading comprehension, vocabulary, fluency and broader proficiency, though long-term evidence varies.

Product consequence:

- later-stage Vidlish should include level-matched sustained reading;
- keep accountability light: gist, retrieval, selected language use and delayed reuse;
- do not turn every paragraph into a dense quiz.

### 2.9 Writing feedback needs separate surface and meaning-level treatment

Written corrective feedback can improve accuracy. Feedback on surface form and feedback on deeper meaning/organization target different outcomes.

Product consequence:

- writing evaluation should distinguish spelling/grammar/form from clarity/content/organization;
- AI correction is followed by learner rewrite, not a passive “fixed version”;
- model exemplars can be shown after an attempt, not before it.

---

## 3. The learner capability model Vidlish should converge toward

A target is not `known: true/false`. For each target, record only dimensions actually observed:

```text
receptive.listening
receptive.reading
productive.spoken
productive.written
transfer.immediate
transfer.delayed
support.caption
support.replay
support.translation
support.hint
support.modelExample
```

Each evidence event should include, where applicable:

- target/version;
- activity/task version;
- source/provenance;
- context identity;
- learner action;
- correctness/bounded evaluator result;
- support actually opened before the action;
- timestamp and delay from prior encounter;
- whether the context/input changed;
- whether the evidence was independent or assisted.

A scheduler may consume this evidence to decide when to probe again. It must not convert scheduling state into a universal proficiency claim.

---

## 4. Curriculum: what should be taught next

The current CEFR-J artifact is valuable as a level prior, but CEFR level is not a teaching order. Frequency is also not a complete curriculum.

The next-target score should eventually combine explicit, inspectable factors:

```text
frequency prior
+ communicative usefulness
+ prerequisite readiness
+ learner capability gap
+ likelihood of reuse/recurrence
+ learnability
+ learner goal/context
- overload / novelty risk
```

### 4.1 Existing asset: CEFR-J

Keep the current vendored CEFR-J A1/A2 headwords as one curriculum signal. Preserve its citation/licensing record.

### 4.2 Add spoken/general frequency priors

Candidates:

- **NGSL 1.2** — high-frequency general English, CC BY-SA 4.0: https://www.newgeneralservicelist.com/new-general-service-list
- **NGSL-Spoken** — spoken-language frequency prior: https://www.newgeneralservicelist.com/ngsl-spoken

Do not replace CEFR-J with NGSL. Join them as separate versioned signals. Share-alike obligations must be documented for any derived vendored artifact.

### 4.3 Existing asset: Tatoeba subset

Continue corpus-before-generation for beginner sentences where the checked Tatoeba subset supplies a suitable sentence. Keep sentence IDs and attribution.

Generation remains necessary where retrieval cannot provide a pedagogically appropriate and comprehensible sentence. Generated input must pass the same deterministic comprehensibility and safety gates before display.

### 4.4 Lexical metadata

Useful, licence-audited sources:

- **Open English WordNet** — senses/semantic relations, CC BY 4.0: https://github.com/globalwordnet/english-wordnet
- **CMU Pronouncing Dictionary** — ARPAbet pronunciation data; permissive use with requested attribution: https://github.com/cmusphinx/cmudict
- **Kaikki/Wiktionary extracts** — much richer metadata but CC BY-SA/GFDL obligations; use only behind an explicit licence manifest: https://kaikki.org/dictionary/English/

Avoid making external dictionary availability a runtime authority. Pin/version the bounded data actually required by the curriculum and record provenance.

### 4.5 Corpus safety rule

“Openly downloadable” does not mean safe to redistribute commercially.

Every vendored or generated corpus artifact must have:

```text
source
source_version_or_date
licence
attribution_requirement
commercial_use_allowed
share_alike_obligation
redistribution_constraint
derivation_script
content_hash
```

Do not vendor heterogeneous corpora such as arbitrary subtitle collections merely because a downloader exists. Validate licence at the exact subset level.

---

## 5. Open-source components: use them where they fit, not because they are free

### 5.1 Spaced scheduling — `ts-fsrs`

Already installed. Keep it.

Role: compute review timing from review history.  
Not its role: determine language mastery.

Repo: https://github.com/open-spaced-repetition/ts-fsrs

### 5.2 ASR — `whisper.cpp`

MIT core, includes WebAssembly/browser paths.

Use cases:

- optional privacy-first short-utterance transcription on capable devices;
- development experiments;
- offline reproducible speech tests.

Constraints:

- model download is large for mobile;
- inference may be too slow for low-end devices;
- browser memory/battery costs matter;
- audit optional/example dependencies separately instead of assuming the whole ecosystem is MIT.

Repo: https://github.com/ggml-org/whisper.cpp

### 5.3 ASR worker/benchmark — `faster-whisper`

MIT, CTranslate2-based and useful for server/offline workers and reproducible ASR benchmarks.

Do **not** assume it belongs inside a Vercel Function: Python/runtime/model size and cold-start characteristics make that an architecture decision, not an npm dependency.

Repo: https://github.com/SYSTRAN/faster-whisper

### 5.4 Browser ML — Transformers.js

Apache-2.0 library for running compatible models with WebGPU/WASM in the browser.

Useful for client-side experiments where privacy and quota avoidance justify device cost.

Repo: https://github.com/huggingface/transformers.js

### 5.5 TTS — local Kokoro-class path

Kokoro browser demos show that local TTS is technically viable through Transformers.js. Treat the **library code licence and exact model-weight licence as separate things**; production adoption requires a model manifest proving the actual weights may be redistributed/used commercially.

Candidate implementations:

- https://github.com/xenova/kokoro-web
- https://github.com/hexgrad/kokoro

### 5.6 Forced alignment — Montreal Forced Aligner

MIT and mature for offline forced-alignment experiments.

Use it to measure/align controlled evaluation data. Do not turn alignment probability into a pronunciation-quality score.

Repo: https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner

### 5.7 Deterministic writing signal — LanguageTool

LanguageTool can provide spelling/grammar signals independent of an LLM, but the core is LGPL and resources/dependencies require their own audit.

Use only as one bounded signal. It cannot judge whether a learner communicated the intended meaning.

Repo: https://github.com/languagetool-org/languagetool

---

## 6. Gemini free-tier capability map — 2026-08-23 snapshot

Google changes model availability, limits and pricing. The application must not encode “free forever” into product semantics. Revalidate the official model catalogue and pricing immediately before enabling a new capability.

Official sources:

- models: https://ai.google.dev/gemini-api/docs/models
- latest models/migration: https://ai.google.dev/gemini-api/docs/latest-model
- pricing: https://ai.google.dev/gemini-api/docs/pricing
- structured output: https://ai.google.dev/gemini-api/docs/structured-output
- deprecations/changelog: https://ai.google.dev/gemini-api/docs/changelog

Current relevant families include:

| Capability | Candidate(s) | Intended Vidlish role |
|---|---|---|
| strongest Flash authoring/reference | `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash` | bounded lesson diagnosis/authoring benchmark; complex feedback |
| high-throughput structured work | `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite` | classification, extraction, lightweight explanations/hints, support generation |
| preview/reference Flash | `gemini-3-flash-preview` | benchmark only while preview; never silently make a preview dependency |
| realtime speech | `gemini-3.1-flash-live-preview` | conversational speaking practice after privacy/product validation |
| realtime translation | `gemini-3.5-live-translate-preview` | optional support/diagnostic tool, not core learning authority |
| speech synthesis | `gemini-3.1-flash-tts-preview` | generated listening material where its current tier/terms fit |
| semantic retrieval | current Gemini embedding models, including `gemini-embedding-001` and the current multimodal embedding offering where available | similarity/search/candidate retrieval; never mastery |
| legacy/free references still exposed by Google | use only if current model page says supported and non-deprecated | migration/benchmark fallback, not a reason to keep old dependencies |

Important correction from earlier project discussion: the current Google pricing page lists **Gemini 3.7 Flash Standard as free-tier input/output at this snapshot**, so the present `server.ts` default is not invalid merely because it is 3.7. The decision should still be benchmarked by **accepted lesson rate, latency, repair rate and total cost/quota**, not model number.

### 6.1 “Use every free model” means capability coverage, not round-robin chaos

Do not send the same request through every free model.

Design a provider capability catalogue such as:

```ts
type AiCapability =
  | "lesson_authoring"
  | "lightweight_structured"
  | "bounded_feedback"
  | "realtime_speaking"
  | "speech_synthesis"
  | "embedding";
```

For each model/version, record:

```text
capabilities
stability: stable | preview
free_tier_observed_at
input modalities
output modalities
structured_output support
live support
privacy tier
quota class
deprecation date if known
benchmark status
```

Then choose models by capability and validated quality.

### 6.2 Preserve the current production gate

The current product authority says production uses one enabled authoring provider/model/key at a time and Gate 7 benchmarks at most three temporary authoring candidates.

Therefore this research does **not** authorize automatic multi-model production authoring fallback today.

Safe sequence:

1. add a capability catalogue and tests with no behavior change;
2. benchmark/shadow only where product gates permit;
3. at Gate 7 compare at most three authoring candidates on the same golden inputs;
4. select one authoring model by cost/quota per **accepted** lesson, not token price;
5. separate speech/TTS/embedding capabilities into their own future specs because they have different privacy and correctness risks.

---

## 7. Free-tier privacy is a hard product constraint

The current Gemini Developer API pricing/terms distinguish free and paid data handling. Google’s pricing page states free-tier content can be used to improve Google products, while paid-tier content is not used for that purpose under the listed pricing table.

That makes a naive “everything through free Gemini” architecture unacceptable for learner speech/writing.

### 7.1 Data policy by task

**Safe-ish free-tier candidates after normal security review:**

- public/canonical transcript snippets already permitted for authoring;
- generated curriculum material with no private learner content;
- bounded non-identifying metadata;
- synthetic/offline benchmark fixtures.

**Do not silently send through free tier:**

- raw learner voice recordings;
- personal free-form writing;
- names/contact information;
- full private learner history;
- anything not required by the task.

For learner speech/writing paths choose deliberately among:

1. local/on-device processing;
2. an explicitly disclosed/consented free-tier experiment with minimized data, if product/legal policy allows it;
3. a paid/private provider path with the required data-handling terms.

Never hide this tradeoff behind “AI powered”.

---

## 8. Recommended task architecture for Vidlish

```text
                 ┌──────────────────────────┐
                 │ learner capability ledger│
                 │ server-owned evidence    │
                 └─────────────┬────────────┘
                               │
                       select next probe
                               │
        ┌──────────────────────▼─────────────────────┐
        │ deterministic curriculum / policy engine   │
        │ provenance + prereqs + frequency + support │
        └───────────────┬────────────────────────────┘
                        │ bounded brief
           ┌────────────▼────────────┐
           │ AI / corpus proposal    │
           │ Gemini or OSS retrieval │
           └────────────┬────────────┘
                        │ candidate only
           ┌────────────▼────────────┐
           │ deterministic gates     │
           │ schema/grounding/input  │
           │ privacy/licence/budget  │
           └────────────┬────────────┘
                        │ accepted activity
           ┌────────────▼────────────┐
           │ learner action + retry  │
           └────────────┬────────────┘
                        │ observed event
                 ┌──────▼──────┐
                 │ evidence DB │
                 └──────┬──────┘
                        │
                     FSRS due
```

No arrow lets the LLM write “mastered”.

---

## 9. Session recipe by capability rather than gamification

A short serious session should normally do less content, with stronger evidence:

1. choose one to three high-value targets;
2. present meaningful input that passes the current comprehensibility policy;
3. ask for a meaning/listening action before revealing the answer;
4. reveal bounded Vietnamese/caption/replay support only as needed;
5. notice the target form/sound/chunk;
6. require retrieval;
7. require spoken or written production when attemptable;
8. give bounded feedback;
9. require retry after a material correction;
10. require changed-context use;
11. schedule a varied delayed probe;
12. later probe cold with less support;
13. update only the evidence dimensions actually observed.

XP/streaks may exist as engagement UI only if they never masquerade as capability.

---

## 10. What to measure instead of “lessons completed”

Learning metrics:

- delayed retention at declared windows (for example 1/7/30 days where appropriate);
- unsupported retrieval success;
- immediate and delayed changed-context transfer;
- support required per successful attempt over time;
- listening success before/after captions, stored separately;
- receptive vs productive evidence separately;
- spoken intelligibility/recognition measurements only after Vietnamese-accent validation;
- writing surface accuracy and meaning/organization separately;
- cold interleaved performance on material not copied from the teaching prompt.

Product/system metrics:

- first-session completion without moderator rescue;
- second-session and due-review return;
- time to first observable capability change;
- authoring acceptance/rejection reason;
- repair rate;
- latency;
- provider quota/cost per accepted learning experience;
- device-local ASR/TTS failure/fallback rate;
- privacy/consent path chosen for speech/writing.

Engagement metrics such as streak, session count and time-in-app are secondary and may not be reported as mastery.

---

## 11. Open-source/data adoption matrix

| Resource | Use | Licence/constraint | Decision |
|---|---|---|---|
| CEFR-J A1/A2 | level prior | existing repo attribution/commercial terms | keep |
| Tatoeba curated subset | human-written beginner sentences | sentence attribution; audio licence varies | keep text subset; strict audio filter |
| NGSL / NGSL-Spoken | frequency prior | CC BY-SA 4.0 | add only with explicit derived-artifact licence manifest |
| Open English WordNet | senses/semantic relations | CC BY 4.0 | good candidate |
| CMUdict | pronunciations | permissive data terms; attribute | good candidate |
| Kaikki/Wiktionary | rich lexical metadata | CC BY-SA/GFDL | optional; isolate share-alike obligations |
| Common Voice | ASR benchmark/source | current dataset-specific terms; do not blindly mirror | benchmark only until exact subset reviewed |
| L2-ARCTIC | Vietnamese-accent research | CC BY-NC 4.0 | research/validation only |
| `ts-fsrs` | review scheduling | MIT | already adopted |
| `whisper.cpp` | local/browser ASR | MIT core; audit optional deps/models | experiment |
| `faster-whisper` | worker/offline ASR | MIT | benchmark/worker candidate |
| Transformers.js | browser inference | Apache-2.0 | platform candidate |
| Kokoro ecosystem | local TTS | verify exact code + weights | experiment after licence manifest |
| Montreal Forced Aligner | offline alignment | MIT | validation tooling |
| LanguageTool | deterministic writing signal | LGPL + resource/dependency caveats | optional adapter, not authority |

---

## 12. Things deliberately rejected

Do not:

- clone Duolingo’s streak/XP loop and call engagement learning;
- make YouTube the beginner curriculum;
- generate huge vocabulary/grammar dumps;
- let a model decide mastery;
- use FSRS state as mastery;
- score pronunciation from ASR confidence without Vietnamese validation;
- remove Vietnamese support at an arbitrary word count and call it scientific;
- expose answers/transcripts before the first evidence boundary;
- count a correction view as successful learning;
- repeat the same source sentence and call it transfer;
- add every model as an automatic production fallback before the current gates authorize it;
- send private learner speech/writing to a free AI tier without an explicit data policy;
- vendor a corpus/model because a GitHub repository happens to exist;
- optimize token cost before measuring accepted-learning-experience rate.

---

## 13. Concrete implementation slices after this research

These are **ordered boundaries**, not authorization to skip Gate 5.

### Slice A — capability contract, no curriculum widening

- introduce explicit receptive/productive evidence dimensions;
- project only historical evidence that genuinely exists;
- do not invent receptive knowledge from productive history or vice versa;
- keep current one-new-target comprehensibility gate unchanged.

### Slice B — curriculum signals and licence manifest

- add a versioned resource manifest;
- join CEFR-J with a licence-approved spoken/general frequency prior;
- introduce target kinds without requiring every kind immediately;
- preserve deterministic next-target explainability.

### Slice C — one real receptive evidence source

- add answer-hidden listening/meaning evidence;
- persist support/replay/caption state server-side;
- test ownership and reveal boundaries;
- compare capability-aware selection against current policy only after evidence exists.

### Slice D — AI capability catalogue, behavior unchanged

- represent model capabilities/stability/privacy/deprecation independently of environment variables;
- make the current single production authoring model an explicit policy selection;
- add tests proving no implicit paid/model fallback;
- record provider/model identity in generation evidence.

### Slice E — Gate 7 authoring benchmark

Only after the current learner gates permit it:

- choose at most three candidates;
- same source set, same deterministic gates;
- compare accepted rate, schema/grounding/pedagogy failures, latency, repair rate, quota/cost;
- select one production authoring model.

### Slice F — speaking/listening runtime

Separate feature spec because privacy and correctness are different:

- capability-detect local ASR/TTS;
- benchmark Vietnamese-accent ASR;
- add Live/TTS only with explicit data policy;
- avoid learner-facing pronunciation scores until validation thresholds are met.

### Slice G — writing

- learner attempts first;
- deterministic grammar/spelling signals where useful;
- Gemini feedback separates surface and meaning-level concerns;
- learner must rewrite/retry;
- store only purpose-bound writing under learner ownership.

---

## 14. Acceptance standard for future “AI learning” features

A feature is not accepted merely because the model response looks smart.

Its spec must state:

1. the language capability being trained;
2. what learner action produces evidence;
3. what support may be opened and how it changes the claim;
4. what deterministic facts remain server-owned;
5. what delayed/changed-context probe will test transfer;
6. which learner data leaves the device and under what tier/terms;
7. licence/provenance for every bundled dataset/model;
8. failure/fallback behavior;
9. browser/database/privacy tests;
10. the learner-study metric that could falsify the feature’s value.

If those are missing, the feature is an AI demo, not part of the Vidlish learning system.

---

## 15. Immediate repository observations

- `ts-fsrs` is already installed; do not add a second scheduler.
- CEFR-J and a curated Tatoeba beginner subset are already vendored with provenance notes; build on them rather than replacing them blindly.
- `.env.example` and server default model values have diverged historically; model policy should have one documented source of truth.
- As of this review, Google’s official pricing page shows `gemini-3.7-flash` Standard free-tier input/output, so 3.7 is not rejected on that basis.
- The larger blocker for “free-first everything” is data handling: free-tier content is listed as being used to improve Google products, whereas the paid tier is listed differently. Speech/writing features therefore need an explicit privacy decision before implementation.
- Existing open PRs that alter early curriculum/session behavior must not be treated as scientific authority merely because tests passed. Their assumptions should be reconciled against the evidence model and current `main` before reuse.

---

## 16. Source index for future specs

### Standards / SLA / learning

- Council of Europe CEFR: https://www.coe.int/en/web/common-european-framework-reference-languages
- CEFR descriptors: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors
- Roediger & Karpicke retrieval: https://pubmed.ncbi.nlm.nih.gov/16507066/
- Cepeda et al. spacing: https://pubmed.ncbi.nlm.nih.gov/16719566/
- Kim & Webb spacing: https://doi.org/10.1017/S0272263121000782
- Shintani, Li & Ellis: https://doi.org/10.1111/lang.12001
- Li corrective feedback: https://doi.org/10.1111/j.1467-9922.2010.00561.x
- Lyster & Saito corrective feedback: https://doi.org/10.1017/S0272263109990520
- van Zeeland & Schmitt lexical coverage: https://doi.org/10.1093/applin/ams074
- Webb lexical coverage review: https://files.eric.ed.gov/fulltext/EJ1316858.pdf
- L2-ARCTIC: https://psi.engr.tamu.edu/l2-arctic-corpus/

### Curriculum / lexical data

- CEFR-J source project: https://github.com/openlanguageprofiles/olp-en-cefrj
- NGSL: https://www.newgeneralservicelist.com/new-general-service-list
- NGSL-Spoken: https://www.newgeneralservicelist.com/ngsl-spoken
- Tatoeba downloads/licensing: https://tatoeba.org/en/downloads
- Open English WordNet: https://github.com/globalwordnet/english-wordnet
- CMUdict: https://github.com/cmusphinx/cmudict
- Kaikki English: https://kaikki.org/dictionary/English/
- Mozilla Common Voice / Data Collective: https://datacollective.mozillafoundation.org/

### Open-source runtime / evaluation

- FSRS TypeScript: https://github.com/open-spaced-repetition/ts-fsrs
- whisper.cpp: https://github.com/ggml-org/whisper.cpp
- faster-whisper: https://github.com/SYSTRAN/faster-whisper
- Transformers.js: https://github.com/huggingface/transformers.js
- Montreal Forced Aligner: https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner
- LanguageTool: https://github.com/languagetool-org/languagetool
- Kokoro web example: https://github.com/xenova/kokoro-web

### Gemini

- model catalogue: https://ai.google.dev/gemini-api/docs/models
- latest-model guidance: https://ai.google.dev/gemini-api/docs/latest-model
- pricing/data-tier table: https://ai.google.dev/gemini-api/docs/pricing
- structured output: https://ai.google.dev/gemini-api/docs/structured-output
- changelog/deprecation: https://ai.google.dev/gemini-api/docs/changelog

This source index is intentionally not a promise that every resource will be shipped. Every implementation slice must re-check the exact source/version/licence/model terms current at the time it is enabled.