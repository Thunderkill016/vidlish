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

---

# Tatoeba beginner sentence artifact

`tatoeba-beginner-sentences.json` — 18,127 human-written English sentences of
2–8 words, every word inside the CEFR-J catalogue above, covering 2,008 of its
2,214 headwords. Rebuild with `node scripts/build-tatoeba-subset.mjs <export-dir>`.

## Where it comes from

[Tatoeba](https://tatoeba.org) public exports (`eng_sentences`, `eng-vie_links`,
`vie_sentences`, `sentences_with_audio`). Tatoeba sentences are released under
**CC BY 2.0 FR**; attribution is by sentence id, which every row keeps.

## Why sentences are retrieved before they are generated

A generated sentence can be grammatical, use only permitted words, pass every
check this codebase can perform, and still be something no person would ever
say. That failure is invisible to the i+1 gate. A retrieved sentence cannot fail
that way, because a human already decided it was worth writing.

## Why it is an artifact rather than a live query

The sentences a learner meets in their first thousand words should be readable
by a person before they ship. A live corpus call means nobody ever reads what
gets served, and "a human wrote it" stops being a guarantee the moment nobody
checks which human, or what.

## What was measured

Against the catalogue's teaching order, counting English sentences of 2–8 words
where exactly one word is new:

| Words known | Usable sentences | Next 50 targets covered |
| ----------- | ---------------- | ----------------------- |
| 25          | 1,884            | 5 / 50                  |
| 50          | 6,159            | 26 / 50                 |
| 100         | 11,721           | 47 / 50                 |
| 200         | 31,154           | 47 / 50                 |
| 800         | 126,187          | 44 / 50                 |

So retrieval cannot cover the beginning. Generation is **required** for roughly
the first fifty words and becomes the exception after that — it is not a rare
fallback, and planning as though it were would leave a learner with nothing to
read on their first day.

## What it cannot supply

**Audio.** 74 of 18,127 sentences carry a recording whose licence permits reuse
outside Tatoeba. About nine in ten Tatoeba recordings are `CC BY-NC-ND 3.0` or
`CC BY-NC 4.0`, and a further 74,041 rows carry no licence at all — those may
not be used outside Tatoeba by anyone. Synthesized speech is therefore a
**requirement** of the listening step, not a cost optimisation.

The licence field is a filter, not a footnote. The build script drops every
recording outside `CC BY 4.0` and `CC BY-SA 4.0`, and a test fails if that
filter is ever relaxed.

**Vietnamese.** 721 of 18,127 sentences have a human Vietnamese translation.
That is too thin to carry the first three hundred words, so Vietnamese support
has to come from somewhere else and be checked there.

---

# Vietnamese gloss artifact

`vietnamese-glosses.json` — Vietnamese senses for 1,838 of the 2,214 catalogue
words, at most three each. Rebuild with `node scripts/build-vietnamese-glosses.mjs`.

## Where it comes from

English Wiktionary, through the MediaWiki API. Content is CC BY-SA 4.0 and GFDL;
attribution is by page title, which is the headword itself.

Translations live in two places: inline for short entries, and on a
`<word>/translations` subpage once the table grows. Both are read, because
taking only the inline one returns the wrong sense — `water` inline gives
`tưới`, the verb, while the noun everyone means sits on the subpage.

## Why not a model

The first words a learner meets are the ones they have no way to check. A wrong
gloss there is not a small error: it becomes a belief every later sentence
quietly reinforces, and the learner has no evidence with which to catch it.
Wiktionary glosses were written and revised by people and carry an edit history.

## What was measured

Coverage against the catalogue's teaching order:

| Words taught | Glossed |
| ------------ | ------- |
| first 50     | 36 (72%) |
| first 100    | 83 (83%) |
| first 300    | 262 (87%) |
| first 1000   | 908 (90%) |
| all 2214     | 1838 (83%) |

The gaps are **not random, and they are worst where it matters most**. Missing
from the first hundred: `the`, `you`, `him`, `her`, `us`, `them`, `its`, `an`,
`any`, `these`, `whose`. Vietnamese has no article and no case-marked pronoun,
so there is nothing for those to translate to — Wiktionary marks several of
them `{{not used|vi}}`, which is information rather than an omission.

Product consequence: a missing gloss is shown as a missing gloss, and the word
is taught through use. Filling those cells with an invented equivalent would
teach a word that does not do the job.

## What was filtered

308 senses in a non-Latin script were dropped. Wiktionary carries Chữ Nôm for
some entries, and a learner shown `每𠊛` for "everyone" has been handed a
different writing system, not a translation. A test fails if any survives.

## Politeness

Wikimedia answered `429` immediately at a 200 ms interval. The run is paced at
1.2 s with backoff and a contact in the user agent, because this is their
infrastructure paying for our artifact.

---

# Spoken frequency artifact

`spoken-frequency.json` — how often each of 2,204 catalogue words appears in
spoken English. Rebuild with `node scripts/build-spoken-frequency.mjs`.

## Where it comes from

**SUBTLEX-US**, 51 million words of film and television subtitles, via the
[`words/subtlex-word-frequencies`](https://github.com/words/subtlex-word-frequencies)
packaging.

The JSON packaging is ISC. The underlying data is **CC BY-SA**, and ShareAlike
reaches this derived file — a stricter obligation than the CEFR-J artifact
carries. Attribution: Brysbaert & New, Ghent University.

Subtitles rather than books, deliberately. The first skill here is listening,
and written-corpus frequency over-weights words nobody says out loud.

## What it fixed

The CEFR-J README recorded the weakness: no frequency, so order within a level
fell back to part of speech and then the alphabet. Measured against the same
catalogue, the two rules disagree about **more than half** of the first hundred
words:

| Rule | First twenty words |
| --- | --- |
| part of speech, then alphabet | `a, all, an, another, any, anybody, anyone, anything, each, every, everybody, everyone, everything, he, her, hers, him, his, it, its` |
| spoken frequency | `you, the, to, a, it, that, and, of, what, in, me, is, we, this, he, on, for, my, your, have` |

Only **44 of the first 100** words are the same under both. The old first fifty
was a dictionary; the new one is a language.

Part of speech survives as a tie-break, for words the corpus counted equally.
Level still comes first: an A2 word is not offered while A1 words remain.

10 catalogue words carry no spoken count. They sort last within their level,
because a word the subtitle corpus never recorded anyone saying is not a word to
teach early.
