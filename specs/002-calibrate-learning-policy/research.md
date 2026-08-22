# Research: Evidence-calibrated learning policy

**Feature:** `002-calibrate-learning-policy`  
**Reviewed:** 2026-08-22  
**Purpose:** distinguish durable learning evidence principles from Vidlish-specific heuristics and hypotheses.

This is a decision-oriented research synthesis, not a claim to exhaust the SLA literature. Preference is given to meta-analyses/systematic reviews, standards, primary datasets, and primary project documentation. Individual studies are used when they answer a narrow implementation question that meta-analyses do not.

## 1. Receptive and productive knowledge must not collapse into one `known` state

Vocabulary and form knowledge are routinely measured differently for receptive and productive outcomes. A technology-assisted vocabulary meta-analysis explicitly distinguishes recognition/meaning when heard or read from accurate use in communicative/non-communicative contexts, and notes that one assessment cannot satisfactorily measure every aspect of word knowledge.

A meta-analysis directly comparing comprehension-based and production-based grammar instruction found large effects for both. Comprehension-based instruction had an early advantage for receptive outcomes, while production-based instruction was more effective for delayed productive outcomes. A separate meta-analysis of receptive vs productive vocabulary instruction likewise found outcome-measure alignment: productive instruction favored productive gains and receptive instruction favored receptive gains.

**Decision for Vidlish**

- Unsupported productive recall remains strong evidence that a learner can produce a form.
- It must not be treated as the only legitimate evidence that a learner can comprehend that form in listening or reading.
- Future learner state should represent capability dimensions rather than a universal `known: boolean`.
- Current runtime may continue using the stronger productive set as a conservative input-selection signal until a receptive evidence path is implemented and tested.

**Sources**

- Shintani, Li & Ellis, *Comprehension-Based Versus Production-Based Grammar Instruction: A Meta-Analysis of Comparative Studies*, Language Learning 63(2), 2013. https://doi.org/10.1111/lang.12001
- Shintani, *The Effectiveness of Processing Instruction and Production-based Instruction on L2 Grammar Acquisition: A Meta-Analysis*, Applied Linguistics, 2015. https://doi.org/10.1093/applin/amu067
- Yu & Trainin, *A meta-analysis examining technology-assisted L2 vocabulary learning*, ReCALL, 2022. https://www.cambridge.org/core/journals/recall/article/metaanalysis-examining-technologyassisted-l2-vocabulary-learning/08A549A6CFD1078406E6A4F8AFE28184
- Kim, *The Effects of Receptive vs. Productive Vocabulary Instruction: A Meta-analysis*. https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001582212

## 2. Input should lead the beginner experience, but `input-first` is not `input-only`

Input is necessary: a learner cannot acquire language they never encounter or understand. That does not imply output, retrieval, interaction, or explicit instruction should be prohibited until an undefined later stage.

Comparative meta-analyses show both comprehension-based and production-based instruction can develop L2 knowledge, with different advantages depending on the outcome and timing. A 2024 meta-analysis of explicit instruction found moderate-to-large effects on L2 development. Corrective-feedback meta-analyses also find durable positive effects, including stronger classroom effects for prompts that require self-repair than for recasts in one synthesis.

**Decision for Vidlish**

The zero-beginner loop should be **input-led**:

`understandable input -> learner attempt -> bounded support/explanation -> retrieval/production -> feedback -> retry -> changed context -> delayed retrieval`

This preserves the mission's emphasis on comprehensible input without banning production that creates measurable capability evidence.

**Sources**

- Goo et al., *Effects of Different Forms of Explicit Instruction on L2 Development: A Meta-Analysis*, Foreign Language Annals 57(1), 2024. ERIC record: https://eric.ed.gov/?id=EJ1416113
- Norris & Ortega, *Effectiveness of L2 Instruction: A Research Synthesis and Quantitative Meta-analysis*, Language Learning 50, 2000. https://doi.org/10.1111/0023-8333.00136
- Li, *The Effectiveness of Corrective Feedback in SLA: A Meta-Analysis*, Language Learning 60(2), 2010. https://doi.org/10.1111/j.1467-9922.2010.00561.x
- Lyster & Saito, *Oral Feedback in Classroom SLA: A Meta-Analysis*, Studies in Second Language Acquisition 32(2), 2010. https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/abs/oral-feedback-in-classroom-sla/4999EE1C8379B2BF026B148EAF373CA1

## 3. `i+1 = at most one new word` is a conservative implementation heuristic, not an SLA law

Vidlish currently converts lexical novelty into a deterministic gate: every token must be in the learner's productive-known set except at most one target token. This is useful because it is auditable and fail-closed. The research does not justify calling that formula the definition of `i+1`.

Lexical-coverage studies show that comprehension varies continuously with known-word coverage and differs by modality, text, learner, topic, and support. Van Zeeland & Schmitt found relatively good L2 listening comprehension around 95% lexical coverage with less variance than at 90%. Webb's review emphasizes that frequently cited 90/95/98% figures are not universal thresholds and that even 100% lexical coverage does not guarantee comprehension.

A short generated sentence and a multi-sentence listening passage are not the same unit, so these coverage figures should not be copied mechanically into the beginner gate. Their value here is conceptual: **lexical novelty is one predictor of comprehensibility, not the whole construct.**

**Decision for Vidlish**

- Keep the one-new-word default in the current generator as a conservative policy while it protects zero-beginner sessions from uncontrolled model output.
- Stop describing it as the scientific definition of `i+1`.
- Future comprehensibility policy should be able to incorporate lexical novelty/coverage plus construction novelty, acoustic difficulty, speech rate, semantic/context support, task demand, and opened support.
- Any widening must be an explicit policy/version change with learner and browser evidence; never widen silently to improve generation success.

**Sources**

- van Zeeland & Schmitt, *Lexical Coverage in L1 and L2 Listening Comprehension: The Same or Different from Reading Comprehension?*, Applied Linguistics 34(4), 2013. https://doi.org/10.1093/applin/ams074
- Webb, *Research Investigating Lexical Coverage and Lexical Profiling: What We Know, What We Don't Know, and What Needs to be Examined*, Reading in a Foreign Language 33(1), 2021. https://files.eric.ed.gov/fulltext/EJ1316858.pdf
- Schmitt, Cobb, Horst & Schmitt, *How much vocabulary is needed to use English? Replication of van Zeeland & Schmitt, Nation and Cobb*, Language Teaching 50(2), 2017. https://www.cambridge.org/core/journals/language-teaching/article/how-much-vocabulary-is-needed-to-use-english-replication-of-van-zeeland-schmitt-2012-nation-2006-and-cobb-2007/1D217A56A2E0056E67802A6A8360FDDE

## 4. Frequency is a prior, not a complete curriculum

High-frequency vocabulary provides large coverage gains and therefore deserves strong curriculum weight. But coverage depends on register and modality, and frequency alone does not encode communicative usefulness, prerequisite relationships, learnability, learner goals, or opportunities to encounter/reuse a target.

**Decision for Vidlish**

Do not hard-code `first 1000 words` as a complete learning sequence. Future target ranking should combine at least:

`frequency prior + communicative utility + prerequisite value + learner need + learnability + recurrence opportunity`

Frequency remains a strong input into selection, not a mastery claim and not the only curriculum ordering signal.

**Sources**

- Nation, *How Large a Vocabulary Is Needed For Reading and Listening?*, Canadian Modern Language Review 63(1), 2006. https://doi.org/10.3138/cmlr.63.1.59
- Schmitt et al., 2017 replication above.

## 5. Words are not the only useful target unit

Language use depends on recurring multiword sequences and constructions as well as individual lexemes. A meta-analysis reports a processing advantage for multiword sequences over novel sequences.

**Decision for Vidlish**

Future content/capability contracts should be able to distinguish target kinds such as:

- lexeme;
- multiword chunk/formulaic sequence;
- construction/pattern;
- communicative function;
- pronunciation/phonological contrast where validated.

Do not force the current beginner feature to migrate all target kinds in this policy-only slice.

**Source**

- *Processing Advantage of Multiword Sequences: A Meta-Analysis*, Studies in Second Language Acquisition. https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/abs/processing-advantage-of-multiword-sequences-a-metaanalysis/64D9BFF2B458422C8CCE202A520F914A

## 6. Retrieval, spacing, correction and changed context remain strong design choices

The existing Vidlish separation between attempt, reveal, retry, immediate transfer and delayed transfer should remain. It is one of the strongest parts of the current architecture because it avoids turning exposure or completion into a capability claim.

FSRS is appropriate as a scheduling implementation, but its card state estimates memory timing; it is not itself proof of comprehension, productive use, transfer, or mastery.

**Decision for Vidlish**

Keep the current evidence architecture:

- learner attempts before reveal;
- correction does not auto-complete the task;
- self-repair/retry creates new evidence;
- transfer changes context rather than repeating the source;
- delayed evidence is stored separately;
- scheduler decides *when* an item returns, not *what capability the learner has proved*.

**Sources**

- Agarwal et al., retrieval-practice review literature; a useful education systematic review: https://doi.org/10.1007/s10648-021-09595-9
- Li 2010 and Lyster & Saito 2010 corrective-feedback meta-analyses above.
- Open Spaced Repetition, `ts-fsrs` / FSRS v6 primary implementation documentation: https://github.com/open-spaced-repetition/ts-fsrs

## 7. Vietnamese explanation should taper by evidence, not a scientifically fixed word count

Using Vietnamese can reduce task ambiguity and cognitive load for a zero beginner. Explicit instruction also has positive evidence. What is not established is a universal threshold such as exactly 300 known English words after which Vietnamese should disappear.

**Decision for Vidlish**

Treat the approximate word count as an initial product hypothesis. A future scaffold policy may combine:

- learner request;
- repeated failure under lower support;
- target/construction novelty;
- receptive evidence;
- productive evidence;
- prior successful performance without Vietnamese;
- session/task stakes.

The system should record decreasing support as evidence when it happens, rather than forcing support reduction only to satisfy an arbitrary vocabulary count.

## 8. CEFR is useful for reporting and coverage, not as a hidden scalar mastery score

The CEFR Companion Volume defines communicative activities and can-do descriptors across reception, production, interaction, mediation and phonological control. It is explicitly a framework to adapt to context rather than a single internal proficiency variable.

**Decision for Vidlish**

Use CEFR descriptors later for curriculum coverage, external reporting and benchmark task design. Do not derive a learner's complete capability from one CEFR label or substitute CEFR level for the evidence ledger.

**Source**

- Council of Europe, CEFR Companion Volume / descriptors: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors

## 9. Pronunciation and speaking need Vietnamese-speaker validation before scoring

Speech recognition and pronunciation scoring must not be assumed accurate for Vietnamese-accented English. L2-ARCTIC contains non-native English speech with manual phoneme-level annotations and four Vietnamese speakers, making it a useful starting benchmark but not a complete validation population.

**Decision for Vidlish**

- Realtime conversation and speech input may be explored later under the existing roadmap.
- Do not publish a pronunciation score until the scorer has measured error characteristics on Vietnamese speakers.
- Before that, report bounded observations the system can actually support (for example, repeated recognition failure of a word under controlled conditions) without dressing them as accent quality.

**Source**

- L2-ARCTIC corpus: https://psi.engr.tamu.edu/l2-arctic-corpus/

## 10. Open-source patterns worth learning from without cloning product assumptions

### asbplayer

Useful patterns: subtitle navigation, auto-pause, condensed playback, word status, frequency annotations and media-rich sentence mining. These fit the authentic-media stage, not the zero-beginner core.

Primary repository: https://github.com/asbplayer/asbplayer

### Lute

Useful pattern: organize acquisition around texts and learner interaction with them instead of treating a course screen as the only unit.

Primary repository: https://github.com/LuteOrg/lute-v3

### LinguaCafe

Useful patterns: import content, contextual lookup, vocabulary state, contextual review and mobile-accessible reading workflow.

Primary repository: https://github.com/simjanos-dev/LinguaCafe

### Open Spaced Repetition / FSRS

Useful pattern: keep scheduling as a dedicated memory system with explicit state transitions. Do not elevate the scheduler into a competence estimator.

Primary repository: https://github.com/open-spaced-repetition/ts-fsrs

## 11. Gemini model policy: record capabilities now, benchmark later

Vidlish should not treat `Gemini` as one undifferentiated model. Current Google model families include stronger general models, Flash/Flash-Lite cost tiers, live/audio models, TTS, image generation and embeddings. These can eventually map to different bounded provider ports.

However, the current product authority already requires **at most three temporary authoring candidates** and selection by **cost per accepted lesson**. The five-person usability and learner-value gates precede provider optimization. Therefore this feature must not switch production models merely because a newer Gemini model exists.

**Decision for Vidlish**

- Keep one enabled production authoring model at a time.
- Keep provider/model identity observable in generation evidence.
- At the existing model-economics gate, benchmark at most three candidates on the same golden source set and deterministic acceptance gates.
- Evaluate accepted-lesson rate, grounding/schema/pedagogy failures, repair rate, latency, tokens and cost per accepted lesson; do not select on token price alone.
- Treat Live/TTS/embedding/image models as separate future capabilities, not automatic dependencies of the core learning loop.

**Primary documentation**

- Gemini model catalogue: https://ai.google.dev/gemini-api/docs/models
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini deprecations: https://ai.google.dev/gemini-api/docs/deprecations

## 12. Research-backed invariants vs policies vs hypotheses

### Keep as durable invariants

- completion != mastery;
- scheduler state != independent capability;
- source evidence must be grounded and server-hydrated;
- attempt/reveal boundaries are server-owned;
- correction read != successful retry;
- changed-context transfer != source repetition;
- immediate transfer != delayed transfer;
- product claims require corresponding learner/business/engineering evidence.

### Keep for now as conservative runtime policies

- default beginner lexical novelty budget of one new target word;
- productive-independent evidence as the current lexical set used by that gate;
- short bounded sessions;
- progressive support rather than full answer immediately;
- one enabled production authoring model.

### Treat explicitly as hypotheses to validate

- the exact lexical novelty budget for each learner/context;
- the point/rate at which Vietnamese support should taper;
- the exact readiness threshold for authentic video;
- the ordering and weight of frequency vs utility/prerequisites;
- when speaking/writing tasks should enter for each learner;
- which Gemini model has the best cost per accepted lesson;
- whether any pronunciation scorer is reliable enough for Vietnamese-accented English.

## 13. Consequence for the next implementation slice

Do **not** immediately replace the current one-word gate. First add a capability-model contract that can represent receptive and productive evidence separately while preserving the existing evidence ledger and scheduler separation. Then migrate one bounded decision at a time behind tests.

A safe sequence is:

1. correct governance/documentation language without learner-visible behavior change;
2. introduce capability dimensions at the application-contract level;
3. project existing `last_independent_at` evidence into the productive dimension without inventing historical receptive evidence;
4. add one real receptive evidence source (for example, listening recognition under answer-hidden conditions);
5. only then compare a capability-aware comprehensibility policy against the current conservative gate;
6. validate with moderated users/cohort before widening policy in production.
