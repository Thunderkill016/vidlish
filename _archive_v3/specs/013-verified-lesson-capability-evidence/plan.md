# Plan — Feature 013

## Approach

Extend the capability contract with verification strength, then add lesson-attempt projection inside the already wired `summarise-capability-evidence.ts` application boundary.

The projector receives only immutable lesson blueprint data, privacy-safe persisted attempts and privacy-safe persisted support events. It does not receive raw learner text.

## Projection policy

### Beginner dictation

Keep the existing mapping to listening, now explicitly `verification: objective`.

### Chunk recall

The immutable activity points to one target item, the response is typed text, and the server evaluator returns `correct` or `incorrect`. Project it as item-level writing evidence:

- response mode: writing;
- verification: objective;
- outcome: successful/unsuccessful from the server verdict;
- support: supported if a matching support-opened event occurred before the attempt, or conservatively if the immutable activity carries a hint.

### Guided transfer

The learner genuinely writes, but the runtime explicitly returns `self_check` rather than a correctness verdict. Project one observation per referenced target item with:

- target skill: writing;
- verification: self_check;
- outcome: unscored.

### Ambiguous activities

Do not project gist/meaning choices or reflection yet. Their current schema does not prove which receptive modality was measured.

## Verification

Add contract and projector unit tests, then run full CI on the exact PR head including architecture reachability, Chromium, Supabase pgTAP/RLS and durable Golden Session journey.
