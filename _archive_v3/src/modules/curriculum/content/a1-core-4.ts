import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * The last twelve items of A1, taken from `pnpm curriculum --next`.
 *
 * These are the ones an author avoids by instinct — relative clauses, the
 * passive, participles used as modifiers — because they sound advanced. The
 * profile places them at A1 anyway, and it is right to: `the file I sent`, `it
 * was moved`, `the person working on it` are ordinary workplace English, not
 * grammar-book English. Writing to the inventory rather than to instinct is the
 * whole reason the inventory is there.
 */

export const A1_WHICH_ONE: FoundationUnit = {
  id: "a1-which-one",
  cefr: "A1",
  canDo: {
    vi: "Nói rõ mình đang nhắc tới thứ nào, người nào.",
    en: "Can say which thing or which person they mean.",
  },
  communicativeFunction: "Xác định rõ đối tượng",
  prerequisites: ["a1-doing-now"],
  targetChunks: [
    { text: "that works", vi: "cái mà chạy được" },
    { text: "who wrote", vi: "người đã viết" },
    { text: "i sent", vi: "tôi đã gửi" },
    { text: "talking about", vi: "đang nói về" },
  ],
  grammarFeatures: [
    "relative that/who",
    "omitted object relative",
    "preposition stranding",
  ],
  // CEFR-J: relative that, omitted relative, preposition stranding (A1.1),
  // relative who (A1.3).
  grammarCodes: ["PREL.that", "PRELO.OMIT", "PREP.STRAND", "PREL.who"],
  inputScenes: [
    { id: "rel-that", speaker: "Mai", text: "Use the one that works.", vi: "Dùng cái mà chạy được ấy." },
    { id: "rel-who", speaker: "Tom", text: "She is the person who wrote it.", vi: "Cô ấy là người đã viết nó." },
    { id: "rel-omit", speaker: "Mai", text: "This is the file I sent.", vi: "Đây là cái file tôi đã gửi." },
    { id: "rel-strand", speaker: "Tom", text: "That is the problem I am talking about.", vi: "Đó là vấn đề tôi đang nói tới." },
  ],
  activities: [
    { id: "which-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Họ đang chỉ vào thứ nào?", targets: ["that works", "who wrote"], supportAllowed: true },
    { id: "which-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["i sent"], supportAllowed: false },
    { id: "which-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["talking about"], supportAllowed: false },
    { id: "which-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói cụm tiếng Anh nghĩa là “người đã viết”.", targets: ["who wrote"], supportAllowed: false },
    { id: "which-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Có hai file giống nhau. Nói rõ bạn muốn cái nào và vì sao, hai câu.", targets: ["that works", "i sent"], supportAllowed: false },
    { id: "which-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “cái mà chạy được”.", targets: ["that works"], supportAllowed: false },
    { id: "which-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu xác định rõ đối tượng, nhanh dần.", targets: ["that works", "who wrote", "i sent"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "that works", independent: true, changedContext: true, delayed: false },
    { chunk: "i sent", independent: true, changedContext: true, delayed: true },
  ],
};

export const A1_WHEN_AND_ANYONE: FoundationUnit = {
  id: "a1-when-and-anyone",
  cefr: "A1",
  canDo: {
    vi: "Nói khi nào một việc xảy ra, và nói về người không xác định.",
    en: "Can say when something happens, and refer to no one in particular.",
  },
  communicativeFunction: "Thời điểm và người không xác định",
  prerequisites: ["a1-which-one"],
  targetChunks: [
    { text: "when i finish", vi: "khi tôi xong" },
    { text: "anyone", vi: "ai đó, bất kỳ ai" },
    { text: "nobody", vi: "không ai" },
    { text: "something", vi: "cái gì đó" },
  ],
  grammarFeatures: ["when clause", "indefinite pronouns"],
  // CEFR-J A1.2: adverbial clause with when, indefinite pronouns.
  grammarCodes: ["CL.when", "PIND.nobody.anything.etc"],
  inputScenes: [
    { id: "when-finish", speaker: "Mai", text: "I will send it when I finish.", vi: "Xong tôi sẽ gửi." },
    { id: "when-anyone", speaker: "Tom", text: "Can anyone help with this?", vi: "Có ai giúp việc này được không?" },
    { id: "when-nobody", speaker: "Mai", text: "Nobody is using it now.", vi: "Giờ không ai dùng nó cả." },
    { id: "when-something", speaker: "Tom", text: "There is something wrong here.", vi: "Có cái gì đó sai ở đây." },
  ],
  activities: [
    { id: "when-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Việc gì xảy ra khi nào?", targets: ["when i finish", "anyone"], supportAllowed: true },
    { id: "when-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["nobody"], supportAllowed: false },
    { id: "when-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["something"], supportAllowed: false },
    { id: "when-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói cụm tiếng Anh nghĩa là “khi tôi xong”.", targets: ["when i finish"], supportAllowed: false },
    { id: "when-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Báo cho nhóm biết khi nào bạn xong và bạn cần ai giúp gì. Hai câu.", targets: ["when i finish", "anyone"], supportAllowed: false },
    { id: "when-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết từ tiếng Anh nghĩa là “không ai”.", targets: ["nobody"], supportAllowed: false },
    { id: "when-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu, nhanh dần.", targets: ["when i finish", "anyone", "nobody"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "when i finish", independent: true, changedContext: true, delayed: true },
    { chunk: "nobody", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_IT_WAS_DONE: FoundationUnit = {
  id: "a1-it-was-done",
  cefr: "A1",
  canDo: {
    vi: "Nói một việc đã được làm mà không cần nói ai làm.",
    en: "Can say something was done without naming who did it.",
  },
  communicativeFunction: "Thể bị động và phân từ",
  prerequisites: ["a1-when-and-anyone"],
  targetChunks: [
    { text: "is fixed", vi: "đã được sửa" },
    { text: "the updated file", vi: "cái file đã cập nhật" },
    { text: "the person working", vi: "người đang làm" },
    { text: "the file attached", vi: "file đính kèm" },
  ],
  grammarFeatures: [
    "present passive",
    "premodifying past participle",
    "postmodifying participles",
  ],
  // CEFR-J: present passive and postmodifying V-ing (A1.2), pre/postmodifying
  // past participle (A1.3).
  grammarCodes: ["PASS.PRESENT", "VG.N_VG", "VN.VN_N", "VN.N_VN"],
  inputScenes: [
    { id: "pass-fixed", speaker: "Mai", text: "The problem is fixed.", vi: "Vấn đề đã được sửa." },
    { id: "pass-updated", speaker: "Tom", text: "Please read the updated file.", vi: "Đọc giúp cái file đã cập nhật." },
    { id: "pass-working", speaker: "Mai", text: "The person working on it is away.", vi: "Người đang làm việc đó đi vắng." },
    { id: "pass-attached", speaker: "Tom", text: "Check the file attached to the message.", vi: "Xem file đính kèm trong tin nhắn." },
  ],
  activities: [
    { id: "pass-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Việc gì đã được làm xong?", targets: ["is fixed", "the updated file"], supportAllowed: true },
    { id: "pass-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["is fixed"], supportAllowed: false },
    { id: "pass-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["the file attached"], supportAllowed: false },
    { id: "pass-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói cụm tiếng Anh nghĩa là “đã được sửa”.", targets: ["is fixed"], supportAllowed: false },
    { id: "pass-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Báo trạng thái hai việc, không nói ai làm.", targets: ["is fixed", "the updated file"], supportAllowed: false },
    { id: "pass-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “người đang làm”.", targets: ["the person working"], supportAllowed: false },
    { id: "pass-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu báo trạng thái, nhanh dần.", targets: ["is fixed", "the updated file", "the file attached"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "is fixed", independent: true, changedContext: true, delayed: true },
    { chunk: "the updated file", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_DID_YOU: FoundationUnit = {
  id: "a1-did-you",
  cefr: "A1",
  canDo: {
    vi: "Hỏi người khác đã làm gì, và bắt kịp một cụm động từ thường gặp.",
    en: "Can ask what someone did, and follow a common phrasal verb.",
  },
  communicativeFunction: "Hỏi về hành động",
  prerequisites: ["a1-it-was-done"],
  targetChunks: [
    { text: "do you have", vi: "bạn có… không" },
    { text: "did you send", vi: "bạn đã gửi chưa" },
    { text: "look at", vi: "nhìn vào, xem" },
    { text: "catch up with", vi: "bắt kịp, gặp lại" },
  ],
  grammarFeatures: ["S+V+O question", "phrasal verb with preposition"],
  // CEFR-J A1.2: S+V+O interrogative, phrasal verb + particle + preposition.
  grammarCodes: ["VP.SVO.INT.AFF", "PHV.V_PART_PREP"],
  inputScenes: [
    { id: "ask-have", speaker: "Mai", text: "Do you have the file?", vi: "Bạn có cái file không?" },
    { id: "ask-sent", speaker: "Tom", text: "Did you send the report?", vi: "Bạn gửi báo cáo chưa?" },
    { id: "ask-look", speaker: "Mai", text: "Look at this line.", vi: "Nhìn dòng này xem." },
    { id: "ask-catch", speaker: "Tom", text: "I need to catch up with the team.", vi: "Tôi cần bắt kịp cả nhóm." },
  ],
  activities: [
    { id: "did-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Họ hỏi nhau những gì?", targets: ["do you have", "did you send"], supportAllowed: true },
    { id: "did-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["do you have"], supportAllowed: false },
    { id: "did-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["catch up with"], supportAllowed: false },
    { id: "did-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Hỏi bằng tiếng Anh xem người kia đã gửi chưa.", targets: ["did you send"], supportAllowed: false },
    { id: "did-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Hỏi đồng nghiệp hai câu về việc hôm qua.", targets: ["did you send", "do you have"], supportAllowed: false },
    { id: "did-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “nhìn vào, xem”.", targets: ["look at"], supportAllowed: false },
    { id: "did-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Hỏi bốn câu liên tiếp, nhanh dần.", targets: ["do you have", "did you send", "look at"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "did you send", independent: true, changedContext: true, delayed: true },
    { chunk: "do you have", independent: true, changedContext: true, delayed: false },
  ],
};
