# Golden Session five-person usability runbook

**Purpose:** run hard gate 5 without moving thresholds after seeing results.  
**Authority:** `golden-session-validation.md`  
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

Use independent learner accounts/sessions for the five people. Reusing one
learner account can contaminate later participants with earlier learning state.

## 2. Keep the test environment controlled

Use the existing Golden Session fixture and normal product flow. The internal
pass must not require a paid provider call or production Supabase.

Cover both desktop and mobile across the five participants. Do not explain the
intended interaction before they begin beyond the moderator introduction in the
validation protocol.

## 3. Before the learner starts

Record in the moderator notebook only what the protocol needs:

- participant code (`p1` … `p5`);
- desktop or mobile;
- target recognition before the session:
  - `not_recognized`;
  - `partial`;
  - `recognized`.

The recognition judgment is based on the moderated before-check, not the gist
verdict. Keep optional/free-recall wording out of the automated study JSON.

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

## 5. Capture the privacy-safe measurement summary

After that participant's session, while still authenticated as the learner who
owns the session, obtain:

`GET /api/learning-lab/v2/measurement?sessionId=<session-uuid>`

Save only the returned `LearningMeasurementSummary` for the study record. The
measurement API is owner-scoped, so capture it before switching to the next
independent learner account.

The summary intentionally contains IDs, bounded outcomes/counts/timings and
bounded runtime-error categories. It does not need raw answers, transcript text,
audio, email, IP, user agent or provider error strings.

## 6. Record moderator-only gate observations

For each participant, add this bounded observation object beside the measurement
summary:

```json
{
  "participantCode": "p1",
  "platform": "mobile",
  "completedWithoutModeratorInstruction": true,
  "lessonGoalRestated": true,
  "beforeTargetRecognition": "not_recognized",
  "afterTargetRecognition": "recognized",
  "blocked": false,
  "blockKind": null,
  "severeDefectKind": null
}
```

Recognition is ordered:

`not_recognized < partial < recognized`

The evaluator counts improvement only when the after level is strictly higher
than the before level.

Do **not** infer recognition improvement from `afterListen.latestVerdict`. The
Golden Session exit ticket is `unscored`; it proves an after-check was attempted,
not that the learner improved.

## 7. Evaluate exactly five records

Open:

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
