# Plan — Separate beginner dictation evidence

## Architecture

Keep the current beginner challenge authority and split only the evidence dimensions that the challenge can prove.

`BeginnerWordEvidence` gains:

```text
successfulDictations
lastSuccessfulDictationAt
lastIndependentDictationAt
```

The existing productive fields remain:

```text
successfulRetrievals
lastIndependentAt
```

`knownWords()` continues to read only productive `lastIndependentAt`.

## Challenge write contract

Change the repository write to:

```ts
recordChallengeEvidence({
  ownerUserId,
  challengeId,
  successful,
  independent,
})
```

`successful` distinguishes a correct supported dictation from a failed dictation. `independent` is a stronger claim and therefore requires `successful=true`.

The database resolves the challenge under owner/expiry/consumption lock, then branches on its server-owned `kind`:

### `introduce_word`

- preserve existing behavior;
- only `independent` increments `successful_retrievals` and advances `last_independent_at`;
- dictation fields are untouched.

### `dictation`

- `successful=true` increments `successful_dictations` and advances `last_successful_dictation_at`;
- `independent=true` advances `last_independent_dictation_at`;
- productive `successful_retrievals` and `last_independent_at` are untouched.

All attempts still advance the existing generic exposure/attempt/last-seen fields as they do today.

## Persistence

Add nullable/defaulted columns to `learning_item_states`:

```sql
successful_dictations integer not null default 0
last_successful_dictation_at timestamptz
last_independent_dictation_at timestamptz
```

Add a nonnegative constraint for the new counter.

Replace the old 3-argument challenge RPC with a 4-argument signature containing `p_successful` and `p_independent`. Do not leave the old overload executable.

No historical backfill is attempted. Existing aggregate rows do not carry enough provenance to prove whether an old `last_independent_at` came from introduction, dictation or a legacy write. Resetting or reclassifying those rows would manufacture history in the opposite direction.

## Application

The attempt route computes:

- `successful = dictation.perfect` for dictation;
- `successful = claimedIndependent` for initial word introduction;
- `independent = successful && !usedSupport && trustedCalibration`.

The response's `known` flag remains based on productive `lastIndependentAt` only.

## Privacy / security

No new learner raw text is persisted. The dictation text is still scored transiently and dropped. Challenge ownership, answer-key authority, replay prevention and service-role-only mutation remain intact.

## Verification

Add a fake-repository unit test for independent/supported dictation and later productive promotion. Update pgTAP to prove the same behavior in PostgreSQL, including ownership/expiry/replay/privilege checks.

Run the local migration/schema check before pushing where possible, then the complete repository CI gate on the exact PR head.
