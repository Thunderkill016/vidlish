# Feature Specification: Beginner listen-before-text integrity

**Feature branch:** `fix/030-beginner-listen-before-text`  
**Status:** implementation

## Problem

The beginner path claims to start with listening before reading, but the learner UI currently leaks text before the learner explicitly requests support:

- the standalone first word is rendered immediately while its audio is played;
- later i+1 sentences hide the sentence but still render the new target word in the header.

Both leaks leave `usedSupport=false`. A learner can therefore see the answer and still create an attempt that looks independent. This damages both the learning exercise and the durable progression signal that decides what the learner sees next.

## Requirements

### First standalone word

- Play the first word when the server issues the challenge.
- Do not render the target word while the attempt is in the listening phase.
- Keep replay available without marking support.
- Provide an explicit `Cho tôi xem chữ` action.
- Opening text sets the existing `usedSupport` state before any attempt is recorded.
- A supported successful self-report may be saved as an attempt but must not become independently known.
- Feedback must distinguish independently-known from supported/not-yet-independent results.

### Later i+1 sentences

- During the listening phase, render neither the sentence text nor the new target word.
- Keep the sentence position visible without leaking answer text.
- Replaying audio does not count as text support.
- Explicitly opening text reveals both sentence and target and sets the existing support flag.
- After an answer has been submitted, showing the text is allowed as feedback.

## Evidence boundary

- Server-owned challenge authority is unchanged.
- Request and persistence schemas are unchanged.
- Existing `usedSupport` and server-side `independent = successful && !usedSupport && trusted` semantics remain authoritative.
- This feature closes UI leaks; it does not introduce a new evidence type, score, scheduler or mastery claim.

## Verification

- Chromium verifies the first target is absent from the DOM before support.
- Chromium verifies opening first-word text cannot increase the independent-known count.
- Chromium verifies later sentence target and sentence text are both absent before support and visible after support.
- Existing single-use server challenge tests remain green.
- Full exact-head repository CI must pass before merge.
