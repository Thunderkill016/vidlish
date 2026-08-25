/**
 * The item bank for elicited imitation.
 *
 * The learner hears a sentence and says it back. It works as a measure because
 * a sentence longer than raw echoic memory cannot be echoed — only
 * reconstructed — so repeating it correctly is evidence of having parsed it,
 * not of having heard it. That is the whole reason this instrument is worth
 * more than a streak, and it is why the bank has to reach past about seven
 * syllables to measure anything at all.
 *
 * Length is the axis on purpose. Regression on published banks found that
 * syllable count predicted item difficulty while grammatical difficulty did
 * not, so the bank spans 7 to 18 syllables and grading a learner means finding
 * where in that span they stop succeeding.
 *
 * The sentences are authored rather than sampled from the corpus. A sampled
 * bank cannot control vocabulary, and the beginner corpus caps sentences at
 * eight words, which tops out around fourteen syllables — it cannot reach the
 * upper half of the range at all. Vocabulary leans towards ordinary workplace
 * and interview English, which is what this learner listens to.
 *
 * `syllables` is data, not a comment: the test recomputes every count from
 * CMUdict and fails if an authored number drifts from the pronunciation.
 */

export type ElicitedImitationItem = {
  readonly id: string;
  readonly text: string;
  readonly syllables: number;
};

export const ELICITED_IMITATION_ITEMS: readonly ElicitedImitationItem[] = [
  { id: "ei-07-a", text: "I did not hear the question.", syllables: 7 },
  { id: "ei-07-b", text: "The meeting started at nine.", syllables: 7 },
  { id: "ei-07-c", text: "He asked me one more question.", syllables: 7 },
  { id: "ei-08-a", text: "I did not understand that word.", syllables: 8 },
  { id: "ei-08-b", text: "They are building a new office.", syllables: 8 },
  { id: "ei-08-c", text: "She wants to talk to you today.", syllables: 8 },
  { id: "ei-08-d", text: "I read the report on the train.", syllables: 8 },
  { id: "ei-08-e", text: "We finished the work on Friday.", syllables: 8 },
  { id: "ei-09-a", text: "Can you send me the file this morning?", syllables: 9 },
  { id: "ei-09-b", text: "The problem is harder than it looks.", syllables: 9 },
  { id: "ei-10-a", text: "My brother works for a small company.", syllables: 10 },
  { id: "ei-10-b", text: "I have been learning English for two years.", syllables: 10 },
  { id: "ei-10-c", text: "He said the answer was already there.", syllables: 10 },
  { id: "ei-11-a", text: "We should talk about this again tomorrow.", syllables: 11 },
  { id: "ei-12-a", text: "The new version is much faster than the old one.", syllables: 12 },
  { id: "ei-12-b", text: "She explained the answer slowly and carefully.", syllables: 12 },
  { id: "ei-12-c", text: "I could not remember where I had put my keys.", syllables: 12 },
  { id: "ei-13-a", text: "Most people do not notice the difference at first.", syllables: 13 },
  { id: "ei-13-b", text: "He decided to leave the company last summer.", syllables: 13 },
  {
    id: "ei-14-a",
    text: "The team finished the project a week before the deadline.",
    syllables: 14,
  },
  {
    id: "ei-14-b",
    text: "We need to decide who is going to write the report.",
    syllables: 14,
  },
  {
    id: "ei-15-a",
    text: "I would rather read the document before the meeting starts.",
    syllables: 15,
  },
  {
    id: "ei-16-a",
    text: "Nobody told me the presentation had been moved to Friday.",
    syllables: 16,
  },
  {
    id: "ei-17-a",
    text: "Nobody told me the client had already approved the design.",
    syllables: 17,
  },
  {
    id: "ei-17-b",
    text: "She said the interview would probably last about forty minutes.",
    syllables: 17,
  },
  {
    id: "ei-17-c",
    text: "The engineer explained why the system had stopped working overnight.",
    syllables: 17,
  },
  {
    id: "ei-17-d",
    text: "Learning a language takes more time than most beginners expect it to.",
    syllables: 17,
  },
  {
    id: "ei-18-a",
    text: "The company announced that it would open three new offices this year.",
    syllables: 18,
  },
  {
    id: "ei-18-b",
    text: "I did not realise how much of the work had already been finished.",
    syllables: 18,
  },
  {
    id: "ei-18-c",
    text: "He kept asking the same question until somebody gave him an answer.",
    syllables: 18,
  },
];

/** The span the bank is built to cover. Below this, echoic memory answers. */
export const EI_MIN_SYLLABLES = 7;
export const EI_MAX_SYLLABLES = 18;
