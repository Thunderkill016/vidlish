# Golden Session five-person usability runbook

**Purpose:** run hard gate 5 without moving thresholds after seeing results.  
**Authority:** `golden-session-validation.md`  
**Local harness:** `pnpm study:golden`  
**Capture:** `/learning-lab/v2/usability/capture`  
**Evaluator:** `/learning-lab/v2/usability`

This runbook makes the five-person usability pass reproducible. It does **not**
turn the pass into evidence of retention, mastery, payment, model quality, or
rollout readiness.

## 1. Recruit five real people

Aim for the validation persona as closely as practical:

- Vietnamese adult;
- roughly B1 English;
- watches English technology content;
- often needs English/Vietnamese captions;
- wants stronger listening plus practical work-related English;
- has about five minutes for the learning session.

Assign only local pseudonyms `p1` through `p5` in the automated study record.
Do not put names, email addresses or phone numbers into the evaluator input.

The local harness deliberately uses one owner-bound fixture account because the
durable lesson version is structurally bound to its owner. **Do not run five
people through one continuous learner state.** Instead run one real participant,
capture their record, clear the Golden browser state, stop the app, then run
`pnpm study:golden` again. The command resets local Supabase and reloads the
fixture before the next real participant. This gives each person fresh learning
state without weakening database ownership just for a study tool.

The five saved study records must still have five unique session IDs. A clean DB
reset creates a new session UUID; the capture page validates the participant
record before you save it.

## 2. Start a controlled local environment

From the repository root, with local Supabase CLI and `psql` installed, run:

```bash
pnpm study:golden
```

The command:

1. starts local Supabase without printing its local credentials;
2. resets the local database with no ordinary seed;
3. loads `supabase/fixtures/learning_model_v2_durable.sql`;
4. starts Vidlish with fake auth, local Supabase persistence and fixture external
   providers;
5. strips inherited Gemini, Supadata, YouTube API and production-Supabase
   credentials from the child app;
6. prints the local sign-in, lesson, capture and evaluator URLs plus the fixture
   email/OTP.

Use the existing Golden Session fixture and normal product flow. The internal
pass must not require a paid provider call or production Supabase.

Cover both desktop and mobile experience across the five participants. If the
operator environment cannot expose this local harness safely to a physical mobile
device, do not silently label desktop emulation as a real-device result; record
the actual platform used and arrange the remaining platform coverage separately.

Do not explain the intended interaction before the learner begins beyond the
moderator introduction in the validation protocol.

## 3. Before the learner starts

Record in the moderator notebook only what the protocol needs:

- participant code (`p1` … `p5`);
- desktop or mobile actually used;
- target recognition before the session:
  - `not_recognized`;
  - `partial`;
  - `recognized`.

The recognition judgment is based on the moderated before-check, not the gist
verdict. Keep optional/free-recall wording out of the automated study JSON.

Sign in with the fixture credentials printed by `pnpm study:golden`, open the
Golden Session URL, and hand control to the participant.

## 4. Observe without teaching the flow

During the session, note whether the participant:

- understands the initial promise;
- knows to listen before looking for text;
- discovers support controls;
- understands why answer/reveal remains hidden;
- can act on feedback;
- understands mandatory retry;
- understands changed-context use;
- is blocked.

For the automated evaluator, `blocked` is a boolean and `blockKind` must be one
of:

- `player`;
- `support`;
- `feedback`;
- `retry`;
- `transfer`;
- `navigation`;
- `other_flow`.

If not blocked, `blockKind` must be `null`.

If a severe defect appears, classify only:

- `grounding`;
- `answer_exposure`;
- `misleading_mastery`.

Otherwise `severeDefectKind` is `null`.

Detailed qualitative notes may stay in a local research notebook, but avoid
unnecessary PII and do not paste free-form notes into the automated evaluator.

## 5. Capture one privacy-safe participant record

After that participant's session, **while still signed in to the same fixture
owner and before resetting anything**, open:

`/learning-lab/v2/usability/capture`

Do not copy a UUID from DevTools or the database. The capture page reads the
versioned Golden Session pointer from that browser, takes its `sessionId`, and
calls the existing owner-scoped measurement endpoint itself. Missing, stale,
malformed or non-owned session state fails closed.

The page shows only the privacy-safe `LearningMeasurementSummary`: bounded IDs,
outcomes/counts/timing and runtime-error categories. It does not need raw answers,
transcript text, audio, email, IP, user agent or provider error strings.

Then fill the bounded moderator controls. They intentionally start unset. The
page must not infer any of these from telemetry:

- participant code;
- actual platform;
- completed without moderator instruction;
- lesson-goal restatement;
- recognition before and after;
- blocked status and bounded block kind;
- severe defect kind.

Recognition is ordered:

`not_recognized < partial < recognized`

Do **not** infer recognition improvement from `afterListen.latestVerdict`. The
Golden Session exit ticket is `unscored`; it proves an after-check was attempted,
not that the learner improved.

Click **Tạo participant JSON**. Copy the generated JSON and save it locally with
the other study records. The page does not POST or persist that record.

## 6. Reset before the next real participant

Only after the participant JSON has been copied:

1. click **Xóa Golden browser state** on the capture page;
2. verify the JSON remains visible/copyable;
3. stop the running `pnpm study:golden` process;
4. run `pnpm study:golden` again;
5. use the fresh session for the next real participant.

The browser action deletes only the Golden Session's versioned localStorage key;
it does not clear arbitrary application state. Restarting the harness is equally
important because it resets durable server-side learning state in local Supabase.

Do not reuse an earlier participant JSON, do not fabricate a missing record, and
do not run two real participants against the same unreset session state.

## 7. Evaluate exactly five genuine records

After five real people have completed the procedure, open:

`/learning-lab/v2/usability`

Paste a JSON object shaped as:

```json
{
  "participants": [
    {
      "measurement": { "...": "privacy-safe measurement summary" },
      "observation": { "...": "bounded moderator observation" }
    }
  ]
}
```

The real record must contain exactly five unique participant codes and five
unique session IDs. The page validates the strict schema in-browser and does not
persist the study record to Supabase.

The evaluator reports every predeclared threshold separately:

1. at least 4/5 durable completions without moderator instruction;
2. at least 4/5 can restate the goal;
3. at least 4/5 have a durable changed-context transfer attempt;
4. zero blocked participants;
5. zero severe grounding/answer-exposure/misleading-mastery defects;
6. all five have durable elapsed-time evidence and median is 240–480 seconds;
7. at least 3/5 show moderator-observed recognition improvement.

Overall PASS requires **all seven** thresholds to pass. There is no hidden score
and no discretionary weighting.

## 8. Post-session questions remain qualitative

Ask the six questions in `golden-session-validation.md` after each session.
Capture answers in the local moderator notebook, not in the automated gate JSON.

In particular:

- "I would come back" is not retention evidence;
- "I would pay" is not payment evidence;
- positive feedback does not override a failed usability threshold.

## 9. Decision language

If all seven thresholds pass after five real participants, the correct claim is:

> The Golden Session passed the predeclared five-person moderated usability gate.

Do **not** say:

- learners mastered the target;
- Vidlish has proven language-acquisition effectiveness;
- users retain the language;
- users will pay;
- Gemini authoring is reliable;
- the product is ready to roll out.

If any threshold fails, fix the journey and run a new five-person pass. Do not
lower the threshold after seeing the result.
