---
name: Vidlish
status: final
updated: 2026-08-03
description: Content-first responsive web that turns YouTube videos into grounded English lessons. shadcn/ui on Next.js + Tailwind; this file defines the brand-layer delta.
sources:
  - ../../prds/prd-vidlish-2026-08-03/prd.md
  - ../../../specs/spec-vidlish-lesson-engine/SPEC.md
  - ../../research/domain-youtube-lesson-content-design-2026-08-03.md
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
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  evidence-chip:
    background: '{colors.evidence}'
    foreground: '{colors.evidence-foreground}'
    radius: 999px
  phase-active:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: 999px
  transcript-active:
    background: 'color-mix(in srgb, {colors.accent} 12%, transparent)'
    border: '{colors.accent}'
    radius: '{rounded.sm}'
  lesson-card:
    radius: '{rounded.lg}'
    border: 'var(--border)'
---

# Vidlish — Design Spine

## Brand & Style

Vidlish should feel like a thoughtful study workspace, not an AI toy and not a school management system. The visual posture is **calm, grounded and content-first**:

- Video and lesson content carry the visual weight.
- Evidence and timestamps are visible but secondary.
- The product never celebrates quantity over learning quality.
- AI is presented as a process behind the lesson, not as a mascot or chat personality.
- Empty space is used to reduce cognitive load, not to create a marketing aesthetic.

The tagline is **“Any video. Your English lesson.”** Brand language is direct and useful. Avoid gradients, glowing AI effects, anthropomorphic assistants, streaks, confetti and decorative illustrations inside the learning flow.

Vidlish inherits shadcn/ui defaults for background, foreground, card, muted, border, input, ring, destructive, popover and form components. This spine overrides only the learning-specific brand layer.

## Colors

- **Learning Indigo (`{colors.primary}`)** — primary actions, active lesson phase, selected CEFR level and current generation stage. It means “continue the learning flow.”
- **Evidence Teal (`{colors.accent}`)** — source-backed content, transcript focus, successful grounding and interactive timestamp states. It means “this comes from the video.”
- **Timestamp Amber (`{colors.evidence}`)** — compact evidence chips and timeline anchors. Use sparingly; it is not a general warning color.
- **Status colors** — inherit shadcn semantic tokens. Destructive means irreversible failure/delete; warning means fallback or low-confidence transcript; success means lesson passed quality gates.

Do not color every lesson section differently. Sections are distinguished through type hierarchy, spacing, subtle borders and numbered phase labels.

## Typography

Body, label and muted text inherit Geist Sans/shadcn defaults.

- `display` — landing/create-page promise and major empty state only.
- `display-sm` — page titles and lesson section openings.
- `timestamp` — all timestamp chips, segment IDs in internal views and compact duration labels.

English source quotes use the body font with medium weight and a subtle left border. Vietnamese explanation uses normal weight. Generated examples must be labeled “Ví dụ mới” and never visually imitate source quotes.

Line-length rules:

- Explanations and summaries: maximum `{spacing.reading-column}`.
- Transcript: 65–85 characters per line when possible.
- Lesson Viewer can be wide, but reading content stays in a bounded column.

## Layout & Spacing

Maximum application width: `{spacing.app-shell}`.

- Create Lesson: centered single-column composition, max width 720px.
- Lesson Viewer desktop: sticky media rail (38–42%) + lesson content (58–62%).
- Library: list-first layout; cards may become two columns only on large screens.
- Forms use 16px internal gaps and 24–32px section gaps.
- Core lesson sections use 32px between phase blocks and 16px between activities.

The interface must not resemble a dense dashboard. Create and Lesson are task surfaces; Library is the only collection surface.

## Elevation & Depth

Use shadcn shadows conservatively:

- Cards have border-first hierarchy and no default heavy shadow.
- Sticky video rail may use a subtle shadow only while scrolling.
- Dialog/Sheet uses standard overlay elevation.
- Active transcript segment uses background + border, not shadow.

## Shapes

Corners are friendly but controlled:

- Inputs/timestamp rows: `{rounded.sm}`.
- Buttons/cards: `{rounded.md}`.
- Large lesson panels/dialogs: `{rounded.lg}`.
- Pills only for status, CEFR and compact evidence chips.

Do not use fully rounded containers for all content; it turns the lesson into disconnected bubbles.

## Components

### Inherited unchanged

Use shadcn defaults for `Button`, `Input`, `Select`, `Card`, `Dialog`, `Sheet`, `Tabs`, `Accordion`, `Progress`, `Alert`, `Toast`, `Tooltip`, `Skeleton`, `DropdownMenu`, `Badge`, `Separator` and `Checkbox`.

### Brand-layer components

- **Video URL field** — oversized input with paste affordance, URL validation below and metadata preview after success.
- **CEFR selector** — five equal buttons on desktop; horizontally scrollable segmented row on small screens. Selected state uses `{colors.primary}`.
- **Generation phase stepper** — vertical on mobile, horizontal/compact on desktop. Completed stages use neutral check; active uses `{components.phase-active}`; fallback transition uses warning semantics.
- **Fallback decision card** — one clear reason, one recommended action and optional alternatives. Never show provider jargon.
- **Video shell** — 16:9 player with title/channel below; no custom overlay covering YouTube controls.
- **Lesson phase card** — numbered phase, outcome mapping and completion state. Uses border hierarchy, not separate bright color.
- **Evidence chip** — timestamp with play icon using `{components.evidence-chip}`. Opens/seek video; tooltip says “Mở đoạn này”.
- **Transcript row** — timestamp + text. Current row uses `{components.transcript-active}`; source confidence appears only when low or in internal/debug mode.
- **Language item card** — term, kind/register, Vietnamese meaning, source quote + evidence chip, context explanation and “Ví dụ mới”.
- **Activity card** — instruction, interaction area, submit/reveal behavior and feedback region. Correct/incorrect colors are semantic and never the only feedback cue.
- **Quality status** — hidden from learners by default; beta/internal toggle may show “Đã đối chiếu với transcript” and quality version.
- **Lesson card** — thumbnail, title, CEFR, date, status and source type; compact actions in menu.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Let video and lesson content dominate | Build a dashboard full of metrics before the lesson |
| Show evidence/timestamps wherever a claim depends on the video | Hide grounding behind an “AI generated” badge |
| Use one primary action per state | Present five equal fallback buttons at once |
| Reveal transcript support progressively | Show bilingual transcript as the default first step for every learner |
| Label generated examples separately | Style generated examples like video quotes |
| Use calm, specific loading copy | Use “AI magic is happening ✨” |
| Keep phase progression visible | Turn every section into unrelated tabs |
| Preserve keyboard focus and readable line lengths | Use hover-only controls or very wide paragraphs |
| Use semantic colors plus text/icon | Communicate correctness by color alone |
