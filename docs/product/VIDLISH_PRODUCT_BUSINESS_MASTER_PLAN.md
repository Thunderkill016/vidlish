# Nếp — Product & Learning Master Plan

**Status:** current product direction

**Date:** 2026-08-23
**Applies to:** product, curriculum, UX, AI, data, validation and rollout

---

## 1. Product decision

**Nếp** helps one Vietnamese adult build English from near zero into real use.

> **Tiếng Anh thành nếp.**
> Hiểu thật. Nhớ lâu. Dùng được.

Nếp does not sell AI-generated lessons, video processing, streaks, or a single
"English level". Those can be useful tools, but none is the learner outcome.
The product earns its place when a learner can understand and use language that
they previously could not.

The name means a durable daily pattern. It is a product principle: small,
meaningful retrieval and use accumulate into capability. It is not a promise of
fast fluency.

The GitHub repository, deployment domain, event names, cookie names and local
storage keys still use `vidlish` while integrations are migrated deliberately.
They are compatibility identifiers, not learner-facing branding. Do not rename
or delete them without an explicit migration and rollback plan.

## 2. Learner and job to be done

The initial learner is the product owner: a Vietnamese-speaking adult near A0
who wants to understand and use English in daily life, technology work,
interviews and, later, selected English media.

The learner's job is not "finish a course". It is:

> In a short session, understand one small message, retrieve part of it without
> help, use it in a changed situation, and come back when the evidence says it
> is due.

The long-term path is A0 → independent everyday/work use. IELTS, CEFR labels,
and authentic media are reference points, not an early product promise or a
time-based guarantee.

## 3. What the four skills mean in Nếp

Listening, speaking, reading and writing are important but are not four
independent courses to run in parallel from day one. Communication also needs
meaning, vocabulary/chunks, grammar/constructions, sound perception, register,
interaction and processing speed.

For a beginner the sequence is:

```text
comprehensible listening and reading
→ recognition of form and meaning
→ controlled recall / substitution
→ guided speaking or writing
→ changed-context use
→ delayed review with less support
```

Input comes first. A learner may repeat, choose, fill a short gap, or build a
sentence early, but Nếp does not force free conversation or blank-page writing
before there is language to use. Support fades only when the learner's recorded
independent performance supports it.

Every language item has separate evidence for `understood`, `recalled`,
`transferred`, and `retained`. A completed card, a streak, or a scheduled review
is not proof of mastery.

## 4. Learning loop and content standard

Each Nếp session has one observable can-do outcome and one narrow communicative
context. The default loop is:

```text
hear/read understandable input
→ attempt meaning before the answer
→ notice one useful word, chunk or construction
→ retrieve it without the full model
→ use it in a different context
→ return after a delay
```

Content must be concise, Vietnamese-scaffolded, and immediately usable. An item
is accepted only when it has:

- a learner-visible can-do outcome;
- source/audio/text with a known provenance;
- a Vietnamese explanation appropriate to the learner's known vocabulary;
- a recognition task before the answer is fully visible;
- controlled retrieval and a changed-context use task;
- bounded feedback and a retry where correction is needed;
- a review representation that does not claim mastery.

Vietnamese support is an intentional early scaffold. It should taper across the
first roughly 300 independently produced words instead of being removed on an
arbitrary calendar day.

## 5. Curriculum architecture

### Stage 0 — first footholds (0–30 independently produced words)

The learner cannot yet satisfy an i+1 sentence. Introduce one word or fixed
chunk at a time through clear audio, meaning and controlled imitation; then use
it as the known part of the next input. The first experience must not pretend
that a long sentence is understandable.

Content centres on identity, people, immediate objects, simple actions and
high-utility social responses. Each item needs a human-authored or reviewed
micro-context, not an alphabetical word list.

### Stage 1 — controlled everyday sentences (30–300 words)

Use sentences where every word is known except at most one. Build listening
segmentation, core chunks, simple reading, substitution, guided speaking and
short scaffolded writing. The first 1,000 high-frequency words are a strategic
content asset; their order follows usefulness, frequency and prerequisite
relationships, not parts of speech or textbook chapter convention.

Nếp measures independent production with support closed. Self-report can guide
the experience but cannot mark a word as known.

### Stage 2 — usable foundation (300–1,000 words)

Taper Vietnamese explanations, introduce more varied short texts and audio,
and open a small technology/work layer only when it can attach to a functional
foundation. Speaking and writing expand from substitution to guided interaction
and revision.

### Stage 3 — authentic input as a graduated source

Authentic video is a source the learner graduates to, not the product's centre.
Begin with clear, bounded interview or explanatory material; do not send a
beginner to fast live streams, long videos, or an entire transcript. The legacy
grounded YouTube pipeline remains available only after an input-difficulty gate
shows that the selected window is usable.

## 6. Product surfaces and priority

The first viewport must show the next learning action, not a video-generation
form.

1. **Start/continue:** today's short i+1 session and its one can-do outcome.
2. **Review:** items that are due, with the original answer hidden until an
   attempt.
3. **Progress:** capability evidence by skill and support level; never just
   sessions, streaks, or a flattering composite score.
4. **Source path:** optional controlled text/audio, then authenticated video
   input after the Stage 3 gate.
5. **Library/history:** a record of what was practised and what remains open.

Desktop and mobile use the same order: current task, attempt, feedback, next
step. Learning pages show one task at a time rather than a document full of
vocabulary, grammar, quizzes and decorative progress.

## 7. Content production plan

Build a reviewed **Starter Catalogue** before adding a broad AI authoring layer.

| Pack | Outcome | Required assets | Exit evidence |
| --- | --- | --- | --- |
| 0–30 | Hear, recognise and repeat the first useful words/chunks | source audio, meaning, micro-context, controlled imitation | a learner can independently produce each item on a later attempt |
| 31–100 | Understand and build simple everyday sentences | i+1 sentence set, glosses, retrieval prompts, substitutions | sentence-level recognition and recall with reduced support |
| 101–300 | Handle common exchanges and short messages | varied contexts, guided writing/speaking, delayed variants | changed-context use and scheduled retention evidence |

Generation may propose candidates only after deterministic vocabulary,
difficulty, provenance and privacy gates. A model never decides a learner is
ready, never invents source evidence, and does not replace editorial review for
the starter catalogue.

## 8. Measurement and feedback

Measure the activity that supports a claim:

- listening: recognition and dictation built from known language;
- reading: coverage and comprehension of comparable text;
- speaking: controlled elicited imitation or guided production against a known
  target, not a fake fluency score;
- writing: bounded construction checks and actionable revision feedback;
- transfer: a new context/input, stored separately from immediate recall;
- retention: a delayed attempt, not a completed review card.

Speech recording and learner writing are authorised only where they are needed
for the exercise and are governed by the product's privacy boundary. Do not
ship pronunciation scoring or free-conversation grades until they are measured
on Vietnamese speakers and shown not to penalise intelligible speech.

## 9. What exists and what remains unproven

The current checkout contains an authenticated `/start` flow, beginner
vocabulary selection, i+1 sentence gating, within-session recall, persisted
attempts, FSRS-based review foundations, and a later grounded-video path. Those
are implementation foundations, not proof that Nếp teaches a learner.

Still unproven:

- whether a real A0 learner understands the first-session instructions;
- whether the starter content produces a before/after listening or use gain;
- whether the learner returns for delayed review;
- reliability of authoring/provider paths on a representative set;
- value, willingness to pay, legal clearance and unit economics.

No production, provider, payment or domain change is implied by this plan.

## 10. Execution sequence

### P0 — make the first Nếp session teachable

1. Rebrand learner-visible UI and the canonical product documents.
2. Audit the existing `/start` flow against Stage 0: one outcome, clear audio,
   intentional support, attempt-before-reveal, and honest persistence.
3. Create and review the first 30-item Starter Catalogue with full learning
   assets and deterministic tests.
4. Replace dashboard/video-first prioritisation with start/continue/review.
5. Run moderated usability sessions with five Vietnamese adults near the target
   level; record confusion points and before/after task evidence.

### P1 — validate the compounding loop

1. Expand the catalogue to 100 then 300 words through reviewed packs.
2. Connect delayed review to learner-visible capability evidence.
3. Add one reliable instrument per skill, beginning with listening and
   controlled speaking.
4. Run a 20–50 learner cohort with predeclared activation, return and learning
   thresholds.

### P2 — open graduated authentic input

1. Gate text/audio/video by vocabulary coverage and speech difficulty.
2. Keep grounded YouTube lessons bounded to usable windows.
3. Benchmark at most three temporary authoring models on the same approved
   source set; choose by accepted-learning-asset quality and cost, not token
   price.

### P3 — commercial validation and rollout

Only after P0–P2 demonstrate learning value and return behaviour: test pricing,
privacy/legal operations, billing, support, provider cost and retention. Do not
call signups, session count, a green CI run, or model output a business result.

## 11. Explicit non-goals for now

- simultaneous courses for multiple languages or children/classrooms;
- an AI chat tutor as the main product;
- free-form pronunciation or fluency scoring;
- arbitrary media ingestion, public lesson marketplace, or whole-video study;
- gamified scores standing in for capability evidence;
- multi-provider production routing, payments, or external rebranding before
  the learning loop is validated.

## 12. Product rebuild: one system, not a collection of patches

The current A0 learning engine is useful foundation code, but the product shell,
account experience, visual language and navigation must now be rebuilt as one
coherent system. Nếp will not accumulate individual template pages, multiple
component libraries, a second authentication system, or routes that compete for
the learner's attention.

### 12.1 Locked foundation

| Concern | Decision | Why it is the single owner |
| --- | --- | --- |
| UI foundation | [shadcn/ui](https://ui.shadcn.com/docs) + Tailwind CSS | Open component code, accessible primitives, semantic tokens and one customizable component registry; not a black-box theme. |
| Product design | Nếp design system in `src/shared/ui` and global semantic tokens | Components, states, density, typography and responsive rules have one source of truth. No page may invent its own button/input/dialog treatment. |
| Identity | [Supabase Auth](https://supabase.com/docs/guides/auth) + `@supabase/ssr` | The current database already uses `auth.users` UUIDs and RLS. Replacing identity would require a high-risk parallel user system and a wholesale data migration. |
| Authorisation | Supabase JWT claims + RLS + server-side ownership checks | Every learner-owned row remains protected by the same database principal. Service-role access is server-only and never becomes a browser capability. |
| Security baseline | [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) applied proportionally to a consumer learning product | Authentication, sessions, input, access control, secrets, logging and recovery have explicit acceptance checks rather than relying on a polished sign-in screen. |

Clerk and Better Auth are valid products, but are deliberately **not** added to
this codebase. They would create a second identity authority beside Supabase
while the existing foreign keys and RLS policies are keyed to `auth.users`.
That is a migration project, not a UI improvement.

### 12.2 Product information architecture

The site has two shells, with clear jobs:

```text
Public shell
  → value and sample learning interaction
  → one account entry point
  → sign in / sign up
  → lightweight onboarding

Learner shell
  → Today: one next action and one can-do outcome
  → Review: due evidence only
  → Path: what has been learned and what is next
  → Library: completed learning material and, later, graduated sources
  → Progress: capability evidence, not vanity counters
  → Account & security: profile, sessions, MFA, data controls
```

`/create`, jobs and the legacy video pipeline remain later-source surfaces. They
do not occupy the primary navigation for an A0 learner.

Every learner screen has one primary action above the fold. Navigation, status
and support are subordinate to that action. Responsive layouts are designed as
two explicit layouts, not a desktop page allowed to wrap accidentally; touch
actions must remain reachable above fixed navigation and safe areas.

### 12.3 Account and security contract

The public account flow is one clear **sign in or sign up** experience:

1. Email and password are the public sign-in and sign-up methods. In the real
   application the browser calls Supabase Auth's password APIs directly; Nếp
   never stores, logs or verifies a password itself.
2. Email confirmation, permitted redirect URLs, bot protection and Auth rate
   limits are configured in Supabase before a public launch.
3. The private-beta allowlist is removed from the public learner path during
   the migration. It must not silently reject a legitimate new learner after
   the public sign-up UI is shown.
4. Account settings expose sign-out, session/device management, password
   recovery and optional TOTP MFA. An emailed confirmation or recovery link is
   not an OTP login flow; MFA enrolment and challenge use Supabase's documented
   APIs rather than custom credential handling.
5. Server routes verify identity with `getClaims()`, never trust a cookie-derived
   `getSession()` user for authorisation, and use a per-request SSR client.
6. Every learner-owned query is protected by RLS and a server-side ownership
   check; the Supabase secret/service key remains server-only and is never sent
   to client code, telemetry or error messages.

The last two points follow Supabase's SSR guidance and database security model;
the first four require dashboard configuration and therefore are release gates,
not claims that source code alone can satisfy.

### 12.4 Rebuild slices and exit criteria

| Slice | Deliverable | Exit evidence |
| --- | --- | --- |
| R0 — foundation | shadcn registry, Nếp tokens, typography/spacing/elevation/status rules, accessible primitives and visual regression harness | desktop + mobile screenshots; keyboard/focus checks; no duplicate primitive family |
| R1 — public and account | public entry page, email-password sign-in/sign-up, confirmation/recovery callback, account/security settings and public-enrolment policy | fake + real-provider contract tests; route protection; negative auth/security tests; Supabase dashboard checklist completed before release |
| R2 — learner core | Today, onboarding, A0 session, review, path and progress built on the new shell | five target learners complete the first session unaided; no fixed-nav overlap; screen-reader/keyboard smoke passes |
| R3 — later sources | move video generation and library into the secondary source path | no A0 route exposes video as its default task; existing grounded-video verification remains green |
| R4 — deletion | remove superseded page shells, old auth UI, dead routes/styles and compatibility shims that are no longer needed | dependency audit, dead-code scan, route inventory, full test/build/E2E pass |

No slice is complete because it looks polished. It is complete only when its
learning, access-control, responsive and failure/recovery behaviour are tested.

## 13. Current next deliverable

> R1/R2: validate the real Supabase MFA dashboard configuration, then replace
> individual learner screens against the new public account, security and
> five-destination shell. No page may bypass the AAL2 gate once a learner has
> enrolled a factor.

Research rationale and source links live in
[`A0_ENGLISH_LEARNING_RESEARCH_DOSSIER.md`](./A0_ENGLISH_LEARNING_RESEARCH_DOSSIER.md).
The video-specific Golden Session remains a later-path validation protocol; it
does not define the first A0 session.
