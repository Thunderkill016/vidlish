# Learning Model v2 preview persistence runbook

**Status:** prepared, not executed  
**Production database:** prohibited  
**Current Supabase branch price quote:** USD 0.01344/hour

## Purpose

Verify the Golden Session against durable Supabase session and attempt storage without calling an AI provider and without writing to the production Vidlish database.

The preview exists only to prove:

- session start/resume ownership;
- incorrect attempts remain on the current activity;
- a later correct retry advances;
- an idempotent network retry does not duplicate an attempt;
- guided transfer remains current until every bounded criterion is confirmed;
- raw productive/reflection text is removed before persistence;
- PostgreSQL rejects unrestricted response text if application validation is bypassed;
- final reflection completes the session without claiming mastery.

## Cost and authorization gate

Do not create a Supabase branch until the owner explicitly accepts the current quote of **USD 0.01344 per hour**.

After verification:

1. export only non-sensitive test evidence needed for the report;
2. delete the preview branch;
3. confirm that no preview secret remains in Vercel or local configuration;
4. record actual branch lifetime and cost.

## Required isolation

The preview must be a development branch of project `cxfauidpobstskyvlhxi`, not the production database itself.

Never copy these values from production into a public place:

- secret/service key;
- database password;
- user session cookie;
- provider API key.

Local, CI and ordinary PR work remain fixture-only.

## Preview environment

Set these values only in the isolated preview runtime:

```text
AUTH_ADAPTER=fake

LEARNING_SESSION_REPOSITORY=supabase
LEARNING_LAB_V2_LESSON_VERSION_ID=77777777-7777-4777-8777-777777777777

NEXT_PUBLIC_SUPABASE_URL=<preview project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<preview publishable key>
SUPABASE_SECRET_KEY=<preview secret key>

VIDEO_METADATA_ADAPTER=fixture
TRANSCRIPT_NATIVE_ADAPTER=fixture
TRANSCRIPT_REPOSITORY=fake
LESSON_PROVIDER=fixture
```

No Gemini, Supadata or other paid content provider is required for this verification.

## Seed boundary

`supabase/seed.sql` contains local/preview-only ownership fixtures:

```text
learning-preview@example.com
→ video M7lc1UVf-VE
→ completed fixture job
→ canonical fixture transcript
→ lesson:v1 parent
→ lesson:v2 version 77777777-7777-4777-8777-777777777777
```

The seed file is not a production migration.

## Execution order

1. Create the authorized preview branch.
2. Confirm the branch has a distinct project reference and database host.
3. Apply the PR migrations to the preview only.
4. Apply the local/preview seed.
5. Configure a bounded preview runtime with the variables above.
6. Run the server-backed Golden Session journey.
7. Verify database rows and privacy constraints.
8. Run the same idempotency request twice and confirm one attempt row.
9. Capture counts and statuses, not raw learner answers.
10. Delete the preview branch after the report is complete.

## Verification queries

Run only on the preview branch.

```sql
select id, status, current_phase, current_activity_id, completed_at
from public.lesson_sessions
where lesson_version_id = '77777777-7777-4777-8777-777777777777';
```

```sql
select
  activity_id,
  attempt_number,
  response ->> 'kind' as response_kind,
  response ? 'text' as contains_raw_text,
  evaluation ->> 'verdict' as verdict
from public.activity_attempts
where owner_user_id = '133f314f-4bfd-46aa-8fc6-b6a33252232b'
order by submitted_at;
```

Expected:

- `contains_raw_text` is false for every row;
- incorrect gist does not advance the session;
- the next correct gist attempt advances to practice;
- duplicate idempotency requests share one attempt ID;
- incomplete transfer remains on `activity_transfer`;
- confirmed transfer advances to `activity_exit`;
- reflection marks the session completed.

## Abort conditions

Stop immediately when:

- the resolved database host/project reference is production;
- any production secret appears in preview configuration;
- migration or seed targets are ambiguous;
- the branch cost differs from the authorized quote;
- raw learner text appears in a persisted response;
- an incorrect or incomplete transfer attempt advances the session;
- retries create duplicate rows;
- provider calls occur unexpectedly.
