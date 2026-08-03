---
name: Vidlish
status: final
updated: 2026-08-03
description: Content-first responsive web that turns English-language YouTube videos into grounded English lessons.
sources:
  - ../../prds/prd-vidlish-2026-08-03/prd.md
  - ../../prds/prd-vidlish-2026-08-03/language-eligibility-amendment.md
  - ../../../specs/spec-vidlish-lesson-engine/SPEC.md
  - ../../architecture/architecture-vidlish-2026-08-03/LANGUAGE-ELIGIBILITY-AMENDMENT.md
colors:
  primary: '#4338CA'
  primary-foreground: '#FFFFFF'
  accent: '#0F766E'
  accent-foreground: '#FFFFFF'
  evidence: '#B45309'
  evidence-foreground: '#FFFFFF'
  primary-dark: '#818CF8'
  primary-foreground-dark: '#111827'
  accent-dark: '#5EEAD4'
  accent-foreground-dark: '#042F2E'
  evidence-dark: '#FBBF24'
  evidence-foreground-dark: '#422006'
typography:
  display:
    fontFamily: 'Geist Sans, ui-sans-serif, system-ui, sans-serif'
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.025em
  display-sm:
    fontFamily: 'Geist Sans, ui-sans-serif, system-ui, sans-serif'
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  timestamp:
    fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, monospace'
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.3'
rounded:
  sm: 8px
  md: 12px
  lg: 16px
spacing:
  reading-column: 720px
  app-shell: 1280px
  section-gap: 32px
---

# Vidlish — Design Spine

## Brand promise

Canonical tagline:

> **Any English video. Your English lesson.**

Product copy must never imply that every public YouTube video is eligible. A video must contain enough reliable original English speech. Missing captions can trigger transcription fallback; confirmed insufficient English is terminal for MVP.

Vidlish should feel like a thoughtful study workspace, not an AI toy or school-management dashboard. The visual posture is **calm, grounded and content-first**:

- Video and lesson content carry the visual weight.
- Evidence and timestamps are visible but secondary.
- AI is a behind-the-scenes process, not a mascot or chat personality.
- Empty space reduces cognitive load.
- Quality and source grounding matter more than quantity or speed.

Avoid gradients, glowing AI effects, anthropomorphic assistants, streaks, XP, confetti and decorative illustrations inside the learning flow.

## Colors

- **Learning Indigo** (`#4338CA`) — primary actions, selected CEFR and active generation/lesson phase.
- **Evidence Teal** (`#0F766E`) — source-backed content, transcript focus and successful grounding.
- **Timestamp Amber** (`#B45309`) — compact evidence chips and timeline anchors only.
- Status colors inherit shadcn semantic tokens. Warning indicates fallback or low confidence; destructive indicates irreversible failure/delete; success indicates a passed gate.

Color is never the only state cue. Pair it with text and/or icons.

## Typography

- Body, labels and muted text: Geist Sans/shadcn defaults.
- `display`: create-page promise and major empty states.
- `display-sm`: page titles and lesson section openings.
- `timestamp`: timestamp chips, duration labels and internal segment IDs.

English source quotes use medium weight and a subtle source border. Vietnamese explanation uses normal weight. Generated examples are labeled **“Ví dụ mới”** and never imitate source quotes.

Line-length rules:

- Explanations and summaries: maximum 720px.
- Transcript: approximately 65–85 characters per line where possible.
- Lesson Viewer may be wide, but reading content stays bounded.

## Layout

Maximum application width: 1280px.

- Create Lesson: centered single column, max 720px.
- Generation: single-column progress and fallback decisions.
- Lesson Viewer desktop: sticky media rail 38–42% plus reading rail 58–62%.
- Lesson Viewer mobile: stacked, player first and non-sticky after meaningful scroll.
- Library: list-first; two-column cards only on large screens when readability remains strong.
- Forms use 16px internal gaps and 24–32px section gaps.
- Lesson phases use 32px between blocks and 16px between activities.

The interface must not resemble a dense analytics dashboard.

## Shape and elevation

- Inputs and transcript rows: 8px radius.
- Buttons and standard cards: 12px.
- Large panels, dialogs and sheets: 16px.
- Pills only for compact status, CEFR and evidence chips.
- Border-first hierarchy; avoid heavy card shadows.
- Sticky media may gain a subtle shadow while scrolling.

## Component layer

Use shadcn defaults for `Button`, `Input`, `Select`, `Card`, `Dialog`, `Sheet`, `Tabs`, `Accordion`, `Progress`, `Alert`, `Toast`, `Tooltip`, `Skeleton`, `DropdownMenu`, `Badge`, `Separator` and `Checkbox`.

### Product components

- **Video URL field** — paste affordance, delayed validation and compact metadata preview.
- **CEFR selector** — five equal desktop buttons; horizontally scrollable segmented row on mobile.
- **Generation phase stepper** — includes `Kiểm tra tiếng Anh`; vertical on mobile and compact horizontal/vertical on desktop.
- **Fallback decision card** — one reason, one recommended action and alternatives under `Cách khác`; no provider jargon.
- **Unsupported-language card** — terminal message with one primary action `Chọn video khác`; never offers translation mode.
- **Video shell** — 16:9 player; no custom overlay covering YouTube controls.
- **Lesson phase card** — numbered phase, outcome mapping and completion state using border/type hierarchy.
- **Evidence reference** — timestamp/source reference. It becomes an interactive seek control only when Story 4.1 exists and reliable timing is available.
- **Transcript row** — timestamp and original speech; low confidence shown only when useful.
- **Language item card** — item, type/register, Vietnamese meaning, source quote, context explanation and labeled generated example.
- **Activity card** — instruction, attempt, submit/reveal and feedback; correctness never color-only.
- **Lesson card** — thumbnail, title, CEFR, date, status and source summary with compact actions.

## Source distinction

- Original English speech is visually marked as source-backed.
- Non-English source portions may appear as context but never as English learning evidence.
- Translation or Vietnamese support is generated learner assistance, not source speech.
- Generated examples, explanations and feedback must be labeled or styled distinctly from source quotes.

## Do / Do not

| Do | Do not |
| --- | --- |
| Use **Any English video. Your English lesson.** | Promise support for any video regardless of spoken language |
| Let video and lesson content dominate | Build a metrics dashboard before the lesson |
| Keep evidence close to claims | Hide grounding behind a generic AI badge |
| Use one primary action per state | Show many equal fallback buttons |
| Reveal transcript support progressively | Default to a full bilingual transcript |
| Label generated examples separately | Style generated content as video speech |
| Use calm, specific progress copy | Use “AI magic” language |
| Include `Kiểm tra tiếng Anh` in progress | Skip the mandatory eligibility state |
| Preserve keyboard focus and readable lines | Use hover-only controls or very wide text |
| Pair semantic color with text/icon | Communicate status by color alone |