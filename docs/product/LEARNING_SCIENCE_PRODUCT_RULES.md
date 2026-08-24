# Learning-science product rules

Vidlish is not a quiz generator wrapped around YouTube. The product must turn a learner-owned video into evidence that the learner can first understand, then retrieve, then reuse language with progressively less support.

This document is a product constraint, not a claim that any single activity proves language mastery. Research informs the design; learner evidence and cohort outcomes decide whether a feature stays.

## Minimum learning loop

Every generated first-session lesson must preserve this order:

1. **Unaided gist listen** — the first activity is a `gist_choice` with captions hidden on the first pass.
2. **Progressive support** — replay, hints, captions, chunk boundaries, meaning, and slower playback are scaffolds that unlock only as needed. They are not the default presentation.
3. **Form retrieval** — at least one `chunk_recall` requires the learner to reconstruct a target item. A recall activity may not start with captions already shown.
4. **Changed-context transfer** — at least one `guided_transfer` reuses a target item from recall in a different situation.
5. **Delayed retrieval** — the same item can return through the existing FSRS-backed review state. Immediate lesson completion is not mastery.

The deterministic authoring quality gate enforces steps 1, 3, and 4. The runtime support policy enforces step 2. Review scheduling owns step 5.

The gate also rejects a recall whose own `promptVi` or `hintVi` contains the phrase to be recalled. Captions are not the only way an answer leaks, and a lesson can hold a correct caption policy while restating the answer in the question.

## Why these rules exist

### Captions are support, not the task

A meta-analysis of captioned L2 video found strong overall benefits for listening comprehension and vocabulary learning, while outcome/test type changes the measured effect. That supports making captions available. It does **not** justify exposing the transcript before the learner has tried to decode the audio.

Product consequence: keep captions in the support ladder, require the first gist pass to be `hidden_first`, and reject a recall item whose caption policy is `shown`.

Reference: Montero Perez, Van Den Noortgate & Desmet (2013), *System*, DOI `10.1016/j.system.2013.07.013`.

### Recognition is not enough

Research reviews of L2 vocabulary training distinguish restudy/recognition from retrieval practice and show that retrieval plus spacing or semantic elaboration can build stronger form-meaning connections than massed repetition alone. Repeated retrieval has benefits, but more repetitions are not automatically more efficient once time-on-task is considered.

Product consequence: do not optimize for number of quiz questions. Require an actual production/retrieval event before the item can count as retrieved evidence.

References:
- Nakata (2017), *Studies in Second Language Acquisition*, DOI `10.1017/S0272263116000280`.
- Rice & Tokowicz (2020), *Studies in Second Language Acquisition*, DOI `10.1017/S0272263119000500`.

### Transfer must change the context

A learner can memorize the exact source sentence without learning to use its language. Vidlish therefore separates source-grounded recall from generated changed-context use.

Product consequence: a valid generated lesson must contain a `chunk_recall` and a later `guided_transfer` sharing at least one `candidateId`. Transfer before retrieval, or transfer using a different target, does not satisfy the loop.

This is a product operationalization of transfer practice, not a claim that one successful response proves generalized communicative competence.

### Spacing is durable state, not a streak

Meta-analytic and longitudinal L2 vocabulary research supports spacing encounters rather than concentrating all exposure in one sitting. Vidlish already represents delayed review with scheduler state so the product can bring an item back after the first lesson.

Product consequence: session completion must never be displayed or persisted as mastery. Review scheduling and later performance are separate evidence.

Reference: Webb, Uchihara & Yanagisawa (2023), *How effective is second language incidental vocabulary learning? A meta-analysis*, *Language Teaching*, DOI `10.1017/S0261444822000507`.

### AI proposes; deterministic systems decide

Recent reviews of AI in second-language learning show rapid growth, but writing and speaking dominate the literature while listening remains a smaller evidence base. Generative AI can enable richer task design, but use of AI alone does not make a task pedagogically transformative.

Product consequence: Gemini may diagnose candidate material and author task wording, but it does not decide provenance, mastery, CEFR, scheduler state, or whether a lesson meets the minimum learning loop. Those are deterministic or evidence-driven decisions.

References:
- Bao et al. (2025), systematic review of AI in SLA, DOI `10.1007/s10791-025-09833-6`.
- Li, Shadiev & Chiu (2025/2026), systematic review/meta-analysis of GenAI and task-based language learning, DOI `10.1007/s11528-025-01140-7`.

## Feature-adoption rules

A new learning feature belongs in Vidlish only when it satisfies all of these constraints:

- It targets a named capability: comprehension, productive recall, interactional use, changed-context transfer, or delayed transfer.
- It produces bounded evidence that can be interpreted without storing raw learner text/audio unless that privacy expansion was explicitly approved.
- It does not reveal the answer before an attempt.
- It has a deterministic fallback or guard when AI output can affect what the learner is taught.
- It can be evaluated against learner outcomes, not only engagement or completion.
- It does not infer CEFR or mastery from a single heuristic, model judgement, or session.

## High-value next experiments

These are experiments, not automatic dependencies:

- **Confidence calibration:** capture a bounded confidence rating before feedback so correct guesses and calibrated knowledge are distinguishable without persisting raw text.
- **Listening decoding micro-loop:** selective dictation/chunk segmentation for moments where comprehension fails despite known vocabulary.
- **Adaptive scaffold fading:** use prior support/replay evidence to start later encounters with less help, while allowing escalation.
- **YouTube lexical salience:** evaluate TUBELEX frequency/dispersion as a deterministic usefulness signal, versioned and benchmarked before it influences target selection.
- **Slow playback support:** wire supported YouTube playback rates to the existing `slower_playback` support step without exposing it before unlock.

None of these should be promoted as improving learning until cohort evidence shows a meaningful gain in delayed retrieval/transfer or a reduction in support needed for equivalent performance.

## Where input comes from at zero

The rules above assume a video exists that the learner can partly understand. Below A2 that assumption fails, and the source question has to be answered on its own terms. What follows is what the survey found, and what it changes.

### Retrieve a real sentence before generating one

A generated sentence is language a model invented, checked afterwards. A retrieved sentence is language a human wrote, checked the same way. Both pass the same i+1 gate; only one of them can be wrong in ways the gate cannot see — a sentence that is grammatical, uses only permitted words, and still is not something anyone would say.

Tatoeba is a corpus of human-written sentences with translation links between languages, released under CC BY 2.0 FR. It carries English–Vietnamese links, so the Vietnamese support the first three hundred words need is already written by people rather than translated by us. Some sentences also carry recorded audio, licensed per contributor — an empty license field means the audio may not be reused outside Tatoeba, so the license field is a filter, not a footnote.

Product consequence: the beginner path retrieves first and generates only when retrieval finds nothing at the learner's level. Generation stays as the fallback because coverage thins as the known set grows unusual, not because retrieval is worse. `composeBeginnerInput` already applies the same gate to both, so the fallback needs no separate quality story.

This also answers a cost question directly: the majority of beginner sentences should cost nothing per learner.

Reference: <https://tatoeba.org/en/downloads>, <https://en.wiki.tatoeba.org/articles/show/using-the-tatoeba-corpus>.

### Order the first thousand words by spoken frequency

`src/adapters/vocabulary/README.md` records a known weakness: CEFR-J carries level and part of speech but no frequency, so within a level the order falls back to a part-of-speech proxy. That proxy is defensible and it is not measurement.

SUBTLEX-US is a frequency list built from 51 million words of film and television subtitles. For a product whose first skill is listening, a subtitle corpus is the better instrument, not merely an available one: written-corpus frequency over-weights words a beginner will not hear for a year.

Licensing needs care. The convenient JSON packaging at `words/subtlex-word-frequencies` is ISC, but the underlying SUBTLEX-US data is CC BY-SA — ShareAlike reaches any ordering artifact derived from it, which is a stricter obligation than the CEFR-J artifact carries. Treat the data as CC BY-SA, attribute Brysbaert and New, and record the obligation in the artifact README beside the existing one.

Product consequence: keep the part-of-speech rule as the tie-break it always was, and let measured spoken frequency decide the order within a level.

Reference: <https://github.com/words/subtlex-word-frequencies>, <http://openlexicon.fr/datasets-info/SUBTLEX-US/README-SUBTLEXus.html>.

### Check writing with a rule engine before asking a model

Writing feedback from a model is fluent and unfalsifiable. LanguageTool is a rule and dictionary based checker under LGPL 2.1+, self-hostable, and it returns a span, a rule ID, and a suggestion — three things that can be logged, counted, and disputed.

Product consequence: when the writing skill arrives, deterministic checks run first and their findings are what gets recorded as evidence. A model may explain a finding in Vietnamese; it may not be the thing that decides a learner was wrong.

Reference: <https://github.com/languagetool-org/languagetool>, <https://languagetool.org/dev>.

### Pronunciation scoring still has no Vietnamese ground truth

`AGENTS.md` already says a score must be measured on Vietnamese speakers before it ships. The survey sharpened why that is hard rather than merely prudent.

speechocean762 is the open corpus the pronunciation-assessment literature is benchmarked on: 5,000 utterances, five expert annotators, phoneme-level labels. Every one of its 250 speakers is a native Mandarin speaker. So the published accuracy numbers for GOP and its successors describe a population this product does not serve, and they cannot be assumed to carry over — Mandarin and Vietnamese differ in exactly the places English pronunciation is scored, final consonants and consonant clusters among them.

L2-ARCTIC remains the usable ground truth: four Vietnamese speakers with phoneme-level annotation. Four speakers is enough to detect a scorer that is badly wrong and not enough to certify one that looks right.

Product consequence: unchanged, and now with a reason that is specific. Report what is checkable — which words a listener could not make out — until a score has been measured on Vietnamese speech.

Reference: <https://arxiv.org/abs/2104.01378>.

### Text to speech has a cost floor worth knowing

Kokoro is an Apache-2.0 text-to-speech model, 82M parameters, 54 voices, CPU-capable. It is not as good as a hosted model and it is good enough for single sentences of beginner English, which is the only thing the A0 path needs spoken.

Product consequence: none yet — this is recorded so the choice is a choice. If per-sentence audio ever becomes the dominant cost of a session, the alternative already exists and its licence permits it.

Reference: <https://github.com/hexgrad/kokoro>.

## What the products that work actually do

Surveyed because the question was which product would teach one Vietnamese adult best, and the honest answer is that the mechanic matters more than the brand. Each of these is good at one thing and wrong about another, and the wrong part is what a product built for a Vietnamese beginner has to fix rather than copy.

### Comprehensible input, as a whole curriculum

Dreaming Spanish teaches only through video the learner can already mostly understand, ordered from absolute beginner upward, and publishes an hours roadmap: a patient speaker understood around 300 hours, normal native speech around 600, comfortable daily conversation around 1,000, practical use around 1,500.

Two things to take. The first is that the ordering is the product — the videos are ordinary, and what makes them work is that each one sits just past where the learner is. The second is that hours are the unit that predicts progress, not lessons completed, so a product that reports lessons is reporting the wrong number.

The thing not to take is the roadmap itself. Those hours were measured on English speakers learning Spanish, two closely related languages sharing script, phonology and a large shared vocabulary. Vietnamese to English shares none of that. Quoting 1,000 hours to a Vietnamese learner is borrowing a number from a population they are not in, and this product should say hours are unknown rather than publish a comforting one.

### Sentences as the unit, not words

Glossika drills whole sentences with audio and spaced repetition rather than word lists. This is the right unit and it is the unit the beginner corpus already uses: a word met inside a sentence arrives with its grammar, its collocations and its rhythm attached, and a word met on a card arrives with none of them.

What it gets wrong for a beginner is that raw repetition with minimal instruction assumes the learner can already parse what they hear.

### Recall at expanding intervals, inside the session

Pimsleur's graduated interval recall asks for a phrase again after a minute, then five, then fifteen, then days. The review scheduler in this codebase already does the days. It does not do the minutes, and that is a real gap: within-session expanding recall is the part that makes a word survive to the first delayed review at all.

Product consequence: worth building before any new activity type. It needs no model call and no new evidence shape.

### Where all of them are silent

None of these products knows the learner is Vietnamese.

Vietnamese does not permit consonant clusters in onset position and allows only a small set in coda. English clusters are therefore highly marked, and the documented repair strategies are consistent: final clusters like `/-st/` and `/-nd/` get reduced or deleted, and vowels get inserted to break clusters apart. This is the single most predictable difficulty a Vietnamese learner of English has, and no general product orders its content around it.

This product can, because the ordering is already ours and the filter is machine-checkable: CMUdict is a BSD-2-Clause pronunciation dictionary of over 134,000 English words in ARPAbet phonemes, so the coda shape of every word in the beginner corpus can be computed rather than guessed.

Product consequence: the first sentences a learner hears should avoid final clusters, and clusters should then be introduced deliberately and named as the difficulty they are, rather than scattered by accident. Ordering by frequency alone would put `just`, `first` and `and` in the first fifty words with no warning that they are the hardest things in the list to say.

### An open tension, for the product owner

Comprehensible-input practice discourages speaking until several hundred hours of listening have accumulated, on the argument that early output rehearses errors. The approved product decisions here include recording the learner's voice from early on.

These can both be honoured, but only by being explicit about what the recording is for. Recording as **evidence** — did the learner produce this word unaided — is compatible with the input-first order and is what `last_independent_at` already means. Recording as **speaking practice**, drilled before listening is stable, is the thing the research warns about. The product should do the first and wait on the second, and should say which one it is doing.

## Measuring progress that is real

The product owner's requirement is that progress be real rather than manufactured. That is a measurement question before it is a teaching question, and it has a specific answer per skill. It also has an immediate consequence for what has already shipped.

### What is currently self-reported, and therefore not evidence

`/start` asks the learner whether they produced the word unaided and records the answer. Nothing checks it.

That is the definition of manufactured progress: a learner who is tired, generous with themselves, or simply mistaken about what they heard produces the same evidence as one who genuinely said the word. The database is careful with that flag — independence can never be erased once recorded — which makes an unchecked flag worse, not better, because a wrong `true` is permanent.

This is not an argument for removing the self-report. It is an argument for making it checkable, which the vocabulary-testing literature solved decades ago.

### Nonwords make a self-report checkable

Yes/no vocabulary tests ask whether the learner knows a word, and mix in **nonwords** — plausible English-looking strings that do not exist. Saying yes to a nonword is a false alarm, and the false-alarm rate is what turns a self-report into a score: correction formulas using false-alarm information have been developed and validated precisely because raw yes/no answers overstate knowledge.

Product consequence: seed the beginner track with occasional nonword items, drawn to match English phonotactics. A learner who reports producing `blorf` as confidently as `water` has told the product that today's evidence is unreliable, and the product can discount the session rather than bank it. This costs one item in ten and it is the difference between a number that means something and a number that flatters.

### Elicited imitation is the measure this product almost already has

Elicited imitation asks the learner to listen to a sentence and repeat it back. It is one of the few short-cut measures of global L2 oral proficiency that has been validated against external criteria and shown to distinguish proficiency levels reliably, and it works because a sentence longer than raw echoic memory can only be reproduced by someone who parsed it.

The A0 session already does listen-then-say-back. What it does not do is score the repetition, and scoring is what separates a measure from an activity.

Product consequence: build elicited imitation as the progress instrument, not as another exercise type. It reuses the corpus, the audio and the recording permission that are already approved, and it produces a number that is comparable across weeks — which is what "am I actually getting better" requires and what a streak can never provide.

### The buildable specification, with the numbers it rests on

The paragraph above says what to build. These are the parameters, taken from the published instruments rather than invented here, so that the score this product reports is comparable to something outside this product.

**Item bank.** The standard shape is around **30 items ranging from 7 to 18 syllables**. Length is not decoration: regression on item difficulty found that **syllable length predicted difficulty while grammatical difficulty did not**, so the bank is spread across that range deliberately and grading a learner means finding where in it they stop succeeding.

**Why it cannot be gamed.** An item longer than raw echoic memory cannot be echoed — only reconstructed — so a correct repetition is evidence of parsing rather than of hearing. That is the entire reason this instrument is worth more than a streak, and it is also why the item bank must reach past roughly seven syllables to work at all.

**Scoring.** Human rubrics use a scale of more than three levels and credit **meaning retained despite form errors**. The automatable equivalent is word error rate against the known target sentence, and it has been measured against human raters: **ICC = 0.929** on per-item error rates and **r = 0.969** on overall participant scores, using open-source Whisper. That is the finding that makes this instrument buildable by one person — the alternative was paying trained raters.

**The limit, stated before it bites.** That validation used 30 participants whose L1 was Japanese. There is no equivalent Vietnamese-L1 validation, and Vietnamese speakers sit among the harder accent groups for every ASR system tested on L2-ARCTIC. What protects the measure is the task shape rather than the accent: elicited imitation is short, read-like speech against a *known* target, which is the case where Whisper reaches roughly **5.4% error** on non-native read speech — against 13–28% on spontaneous accented narrative.

Product consequence, in order:

1. The recogniser is compared against the sentence it was supposed to produce, never asked to transcribe freely.
2. A score is reported as a range, not a point, until it has been measured on this learner's own speech.
3. If the recogniser and the learner disagree, the audio is kept for the learner to arbitrate. A measure that cannot be disputed is not a measure, it is an assertion.

Sources: [Yan et al. 2016 meta-analysis](https://eric.ed.gov/?id=EJ1114289) · [Davis et al. 2021, ETS](https://onlinelibrary.wiley.com/doi/full/10.1002/ets2.12338) · [Whisper + WER automation study](https://www.sciencedirect.com/science/article/pii/S2772766125000187) · [standardized EIT measurement properties](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/measurement-properties-of-a-standardized-elicited-imitation-test-an-integrative-data-analysis/D25501C0180D2327C935B8315D97A9AA) · [ASR accent comparison on L2-ARCTIC](https://arxiv.org/pdf/2310.11004)

### Speech recognition is usable for this shape and not for free speech

The measured picture is consistent. Non-native word error rate on **clean read speech** can be as low as 5.4%. Spontaneous accented narrative runs 13–28%, and accented speech generally raises error rates two- to fourfold against native benchmarks; a large multi-accent corpus put a strong model at 19.7% WER against 2.7% on US English read speech.

Elicited imitation is the good case: short, known-target, read-like speech. Free conversation is the bad case, and the errors there are not random — they cluster on exactly the L1 groups least represented in training data, which includes this learner.

Product consequence: score repetition against a known target, where a recogniser's mistakes can be bounded by comparing against the sentence it was supposed to produce. Do not build free-conversation scoring, and do not report a fluency number derived from spontaneous speech, until it has been measured on Vietnamese speech.

### One instrument per skill, and none of them is a streak

| Skill | Instrument | Why it cannot be gamed |
| --- | --- | --- |
| Listening | dictation of a sentence built only from known words | a wrong word is a wrong word; nothing to interpret |
| Speaking | elicited imitation, scored against the known target | requires parsing, not memory of the audio |
| Reading | share of a text the learner's known set covers | computed from evidence already held, not asked |
| Writing | deterministic checks first, model explanation second | a rule ID and a span can be counted and disputed |

What none of these are: sessions completed, days in a row, items reviewed. Those measure attendance. A product that reports attendance to someone who asked for progress is answering a different question than the one it was asked.

## This learner, specifically

The learner is a Vietnamese adult who studies programming and technology, watches live streamers — IShowSpeed, MrBeast — and listens to CEO interview podcasts. That is not colour; it changes what the product teaches and in what order, and the three sources are not equally reachable.

### The podcast is the achievable target; the stream is the hardest thing in English

Interview podcasts are produced at roughly 150–160 words per minute, because a host who wants to be understood slows down. Casual unscripted conversation runs nearer 196, and a live stream adds shouting, slang, overlapping speech and no second take. Research on speech rate finds around 150 wpm is where lower-intermediate learners start to keep up.

So the ordering of the three is the reverse of how they feel. A CEO interview sounds harder because the ideas are abstract; it is the easiest to hear. A live stream sounds easy because it is casual; it is the hardest listening in English.

Product consequence: when the video path opens to this learner, aim it at interview podcasts first. Do not present a live stream as an early target — it would fail, and the learner would conclude their listening is worse than it is.

### Foundation before domain — the product owner's decision

Technical vocabulary is not in the A1/A2 catalogue, and it is a comparatively closed set that can be learned quickly once there is a language to hang it on. The choice was whether to mix it in from the first day, so the learner can use English at work sooner, or to hold it until the foundation is in place.

**Decision: foundation first, and the technical layer opens at roughly three hundred words.**

The reasoning is that `you`, `the`, `to` and `it` are needed by every English sentence including every sentence about code, and a learner who has technical nouns without them can label things but cannot say anything. Three hundred is where the corpus measurements show retrieval covering most targets, so it is also where the product stops depending on generated sentences.

Product consequence: do not add a technical word list to the beginner catalogue. When the layer is built, it is gated on evidence — three hundred words produced unaided — not on time spent or sessions completed.
