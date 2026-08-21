# CEFR-J vocabulary artifact

`cefrj-a1-a2.json` — 2,214 English headwords at CEFR A1 and A2, each with a part
of speech and a level.

## Where it comes from

Derived from the **CEFR-J Vocabulary Profile 1.5**, published by
[openlanguageprofiles/olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj).

Copyright of the CEFR-J datasets belongs to **Tono Laboratory, Tokyo University
of Foreign Studies**. The datasets may be used for research and commercial
purposes at no cost, with citation.

## What was changed

- kept only A1 and A2 rows;
- kept the first spelling of a multi-form headword (`a.m./A.M./am/AM` → `a.m.`);
- dropped headwords that are not a single lowercase word;
- a word appearing at both levels is kept at the **earlier** one — it should be
  taught when it is first needed, not twice.

## Why it is vendored rather than fetched

A learner's next word must not depend on a network call to somebody else's
repository. The file is small, the licence allows redistribution with citation,
and pinning it means a lesson built today can be explained tomorrow.

## What it does not carry

**Frequency.** CEFR-J gives a level, not an order within that level. Ordering by
coverage — the first hundred words are half of all written English — needs a
frequency list such as [Kelly](https://ssharoff.github.io/kelly/) as a second
artifact. Until then, ordering within a level is by part of speech, and that is
a weaker claim.
