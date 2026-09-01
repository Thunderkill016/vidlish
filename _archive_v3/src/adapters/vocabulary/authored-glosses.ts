/**
 * Vietnamese for the words a learner meets first, written by hand.
 *
 * The scraped artifact is right for most of the catalogue and wrong in exactly
 * the worst place. Wiktionary's inline entry for a one-letter word is the
 * alphabet letter, so `i` came back as “i, i ngắn” — the letter, not the
 * pronoun that is 4% of everything anyone says. `are` came back as “a”, the
 * unit of area. `no` came back as “không, ừ, phải”, where the last two mean
 * *yes*. And seven of the sixty most common spoken words — `you`, `the`, `is`,
 * `was`, `out`, `him`, `her` — had no entry at all, because Vietnamese has no
 * article and no case-marked pronoun, so there is nothing to translate them
 * *to*.
 *
 * A beginner cannot catch any of this. They have no English yet, which is the
 * whole reason they are reading a gloss, so a wrong first meaning becomes a
 * belief every later sentence quietly confirms.
 *
 * So the highest-frequency words are authored rather than scraped, and a
 * grammatical word that has no Vietnamese equivalent gets an explanation
 * instead of a fake translation. This list is short on purpose: it is meant to
 * be read end to end by a person who speaks both languages, and argued with.
 */
export const AUTHORED_GLOSSES: Record<string, readonly string[]> = {
  // Pronouns. Vietnamese marks the relationship, not the case, so the
  // parenthetical says which slot the English word fills.
  i: ["tôi"],
  you: ["bạn", "các bạn"],
  he: ["anh ấy", "ông ấy"],
  she: ["cô ấy", "chị ấy"],
  it: ["nó"],
  we: ["chúng tôi", "chúng ta"],
  they: ["họ", "chúng nó"],
  me: ["tôi (làm tân ngữ)"],
  him: ["anh ấy (làm tân ngữ)"],
  her: ["cô ấy (tân ngữ)", "của cô ấy"],
  us: ["chúng tôi (tân ngữ)"],
  them: ["họ (làm tân ngữ)"],
  my: ["của tôi"],
  your: ["của bạn"],
  his: ["của anh ấy"],
  our: ["của chúng tôi"],
  their: ["của họ"],

  // Articles. Vietnamese has none, so a translation would be a lie; what the
  // learner needs is what the word does.
  the: ["(từ chỉ vật đã biết, tiếng Việt không có từ tương đương)"],
  a: ["một"],
  an: ["một (trước nguyên âm)"],

  // The verb `be`. One Vietnamese word cannot carry it, so the forms are split.
  be: ["thì, là, ở"],
  am: ["là (đi với I)"],
  is: ["là (ngôi thứ ba số ít)"],
  are: ["là (số nhiều, hoặc đi với you)"],
  was: ["đã là, đã ở (quá khứ số ít)"],
  were: ["đã là, đã ở (quá khứ số nhiều)"],

  // Auxiliaries, where the scraped sense was a noun or a musical note.
  do: ["làm", "(trợ động từ cho câu hỏi và câu phủ định)"],
  does: ["(trợ động từ, ngôi thứ ba số ít)"],
  did: ["đã làm", "(trợ động từ quá khứ)"],
  have: ["có", "(trợ động từ thì hoàn thành)"],
  has: ["có (ngôi thứ ba số ít)"],
  had: ["đã có"],
  been: ["đã từng là, đã từng ở (dạng phân từ của be)"],
  will: ["sẽ"],
  would: ["sẽ (ở dạng lịch sự hoặc giả định)"],
  can: ["có thể"],
  could: ["có thể (quá khứ hoặc lịch sự)"],
  should: ["nên"],
  must: ["phải"],

  // Negation and answers. The scraped `no` carried two words meaning yes.
  no: ["không"],
  not: ["không"],
  yes: ["có", "vâng"],
  yeah: ["ừ"],
  ok: ["được", "ổn"],
  okay: ["được", "ổn"],

  // Very common words whose scraped first sense was a rarer one.
  just: ["chỉ", "vừa mới"],
  come: ["đến", "tới"],
  let: ["để cho", "cho phép"],
  get: ["được", "lấy", "trở nên"],
  like: ["thích", "giống như"],
  right: ["đúng", "bên phải"],
  well: ["tốt, giỏi", "à (từ đệm khi ngập ngừng)"],
  so: ["nên, vậy nên", "rất"],
  out: ["ra", "ra ngoài"],
  up: ["lên", "ở trên"],
  there: ["ở đó", "có (trong there is, there are)"],
  here: ["ở đây"],
  one: ["một"],
  about: ["về", "khoảng"],
  all: ["tất cả", "mọi"],
  now: ["bây giờ"],
  how: ["như thế nào"],
  what: ["cái gì"],
  that: ["đó, cái đó", "rằng"],
  this: ["này, cái này"],
  and: ["và"],
  but: ["nhưng"],
  if: ["nếu"],
  or: ["hoặc"],
  because: ["bởi vì"],
  with: ["với", "cùng"],
  for: ["cho", "để"],
  of: ["của"],
  to: ["đến", "để"],
  at: ["ở, tại", "lúc"],
  in: ["trong", "ở"],
  on: ["trên"],
  from: ["từ"],
  know: ["biết"],
  think: ["nghĩ"],
  want: ["muốn"],
  see: ["thấy", "nhìn"],
  go: ["đi"],
  good: ["tốt", "hay"],
};
