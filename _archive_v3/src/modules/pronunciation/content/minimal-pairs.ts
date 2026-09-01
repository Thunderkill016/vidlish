/**
 * The sound contrasts a Vietnamese speaker of English cannot yet hear, and the
 * word pairs that force the distinction.
 *
 * High variability phonetic training is the best-evidenced thing in this
 * product's research base: a meta-analysis of 79 studies puts it at g = 0.92
 * pre/post and g = 0.67 against a control group, with gains retained long-term.
 * But it only helps if it trains the right contrasts, and which contrasts are
 * hard depends entirely on the first language.
 *
 * These are chosen from measured Vietnamese error data, not from a general list
 * of "difficult English sounds". On 36 Vietnamese university learners, feature
 * change accounted for 77.4% of errors in two-consonant clusters — overwhelmingly
 * the voiceless plosives /p/, /t/, /k/, because Vietnamese permits aspiration
 * only slightly and only on an alveolar. In three-consonant clusters the
 * strategy flipped to deletion, 78.2%, and the consonant dropped was the first.
 * Vietnamese also permits far fewer syllable-final consonants than English and
 * no final clusters at all.
 *
 * What this product may claim from training them is narrow and must stay
 * narrow. HVPT trains *perception*. Its transfer to production is +10.5% on the
 * exact items trained and +4.5% on untrained ones, with no strong evidence of
 * lasting production gains and no generalisation. So: this teaches the learner
 * to hear a difference. It does not fix their accent, and must never say it
 * does.
 *
 * Every pair here is machine-checked against CMUdict to differ in exactly the
 * phoneme it claims to teach. A "minimal pair" that differs in two places
 * teaches nothing reliable, and it is not a claim anyone should have to take on
 * trust.
 */

export type ContrastId =
  | "initial_aspiration_p_b"
  | "initial_aspiration_t_d"
  | "initial_aspiration_k_g"
  | "final_voicing_t_d"
  | "final_voicing_k_g"
  | "final_s_z"
  | "final_s_th";

export type MinimalPair = {
  /** The two words, in the order the options are built from. */
  readonly a: string;
  readonly b: string;
};

export type Contrast = {
  readonly id: ContrastId;
  /** ARPAbet phonemes, as CMUdict spells them without stress digits. */
  readonly phonemeA: string;
  readonly phonemeB: string;
  /** Where in the word the two differ. Checked, not asserted. */
  readonly position: "initial" | "final";
  readonly titleVi: string;
  /**
   * The explanation shown before training ever starts.
   *
   * Not preamble: presenting phonetic information about the target before
   * perception training measurably improves how much of the gain reaches
   * production. It is part of the treatment.
   */
  readonly explanationVi: string;
  readonly pairs: readonly MinimalPair[];
};

export const CONTRASTS: readonly Contrast[] = [
  {
    id: "initial_aspiration_p_b",
    phonemeA: "P",
    phonemeB: "B",
    position: "initial",
    titleVi: "P bật hơi và B",
    explanationVi:
      "Tiếng Anh đầu từ, chữ P bật ra một hơi gió: để bàn tay trước miệng nói “pin”, bạn thấy hơi đập vào tay. Nói “bin” thì không. Tiếng Việt gần như không có cái bật hơi này, nên tai chưa quen tách hai âm — và đây là loại lỗi chiếm phần lớn số lỗi phụ âm của người Việt.",
    pairs: [
      { a: "pin", b: "bin" },
      { a: "pat", b: "bat" },
      { a: "pack", b: "back" },
      { a: "pig", b: "big" },
      { a: "peach", b: "beach" },
      { a: "pear", b: "bear" },
    ],
  },
  {
    id: "initial_aspiration_t_d",
    phonemeA: "T",
    phonemeB: "D",
    position: "initial",
    titleVi: "T bật hơi và D",
    explanationVi:
      "Cũng một hơi gió đó, lần này ở đầu lưỡi. “Ten” bật hơi, “den” thì không. Tiếng Việt cho phép bật hơi nhẹ ở âm đầu lưỡi (chữ “th”), nên âm này thường dễ hơn P một chút — nhưng vẫn là chỗ tai hay nhầm.",
    pairs: [
      { a: "ten", b: "den" },
      { a: "tie", b: "die" },
      { a: "town", b: "down" },
      { a: "time", b: "dime" },
      { a: "try", b: "dry" },
    ],
  },
  {
    id: "initial_aspiration_k_g",
    phonemeA: "K",
    phonemeB: "G",
    position: "initial",
    titleVi: "K bật hơi và G",
    explanationVi:
      "Hơi gió ở cuống lưỡi. “Coat” bật hơi, “goat” thì không. Tiếng Việt không bật hơi ở vị trí này, nên hai từ dễ nghe thành một.",
    pairs: [
      { a: "coat", b: "goat" },
      { a: "cot", b: "got" },
      { a: "came", b: "game" },
      { a: "cold", b: "gold" },
      { a: "curl", b: "girl" },
    ],
  },
  {
    id: "final_voicing_t_d",
    phonemeA: "T",
    phonemeB: "D",
    position: "final",
    titleVi: "Âm cuối T và D",
    explanationVi:
      "Tiếng Việt có rất ít phụ âm cuối, và những phụ âm cuối nó có thì đều ngậm lại không bung ra. Tiếng Anh phân biệt “bat” với “bad” chỉ bằng âm cuối đó — và thường bằng cả độ dài nguyên âm trước nó: nguyên âm trước âm cuối kêu (D) dài hơn.",
    pairs: [
      { a: "bat", b: "bad" },
      { a: "seat", b: "seed" },
      { a: "hat", b: "had" },
      { a: "wrote", b: "road" },
      { a: "heart", b: "hard" },
    ],
  },
  {
    id: "final_voicing_k_g",
    phonemeA: "K",
    phonemeB: "G",
    position: "final",
    titleVi: "Âm cuối K và G",
    explanationVi:
      "Cùng một chuyện ở cuống lưỡi: “back” và “bag” chỉ khác nhau ở âm cuối, và ở độ dài nguyên âm đứng trước.",
    pairs: [
      { a: "back", b: "bag" },
      { a: "pick", b: "pig" },
      { a: "duck", b: "dug" },
    ],
  },
  {
    id: "final_s_z",
    phonemeA: "S",
    phonemeB: "Z",
    position: "final",
    titleVi: "Âm cuối S và Z",
    explanationVi:
      "Âm cuối kêu (Z) là chỗ tiếng Việt không có. “Bus” và “buzz” khác nhau ở đó. Đây cũng chính là âm phân biệt số nhiều và ngôi thứ ba trong tiếng Anh, nên nghe nhầm ở đây là nghe nhầm cả ngữ pháp.",
    pairs: [
      { a: "bus", b: "buzz" },
      { a: "price", b: "prize" },
      { a: "peace", b: "peas" },
    ],
  },
  {
    id: "final_s_th",
    phonemeA: "S",
    phonemeB: "TH",
    position: "final",
    titleVi: "Âm cuối S và TH",
    explanationVi:
      "Âm TH không tồn tại trong tiếng Việt, nên tai thường xếp nó vào ô gần nhất là S. “Mouse” và “mouth” khác nhau đúng ở chỗ đó: TH phải thè lưỡi ra giữa hai hàm răng.",
    pairs: [
      { a: "mouse", b: "mouth" },
      { a: "pass", b: "path" },
      { a: "force", b: "fourth" },
    ],
  },
];

export function contrast(id: ContrastId): Contrast {
  const found = CONTRASTS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown contrast: ${id}`);
  return found;
}

/** Every distinct word the training needs audio for. */
export function contrastWords(): readonly string[] {
  const words = new Set<string>();
  for (const item of CONTRASTS) {
    for (const pair of item.pairs) {
      words.add(pair.a);
      words.add(pair.b);
    }
  }
  return [...words].sort();
}

/**
 * How many different voices each word is rendered in.
 *
 * The "high variability" in high variability phonetic training is talker
 * variability: hearing one speaker teaches the learner that speaker, not the
 * sound. Three is the floor the meta-analysis supports — talker count between
 * three and thirty did not predict how much of the gain reached production — so
 * three is what this renders, and the build cost is three times one word rather
 * than thirty.
 *
 * This is deliberately the opposite of the rule for curriculum audio, which
 * uses exactly one voice. That rule protects *measurement*: a listening score
 * is only comparable between sessions if the stimulus did not change. This one
 * serves *training*: a category is only robust if it survived several speakers.
 * Different jobs, opposite answers, both correct.
 */
export const TRAINING_VOICES = ["af_heart", "am_michael", "bf_emma"] as const;

/** Held out of training and used only to test generalisation to a new voice. */
export const HELD_OUT_VOICE = "bm_george";
