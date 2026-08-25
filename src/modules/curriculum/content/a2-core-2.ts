import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * The rest of A2, again taken from `pnpm curriculum --next`.
 *
 * These are the items that turn answers into conversation: reporting what
 * someone else said, saying what you know or do not know without asking a bare
 * question, conditions, and the comparative forms that need `more` rather than
 * `-er`.
 */

export const A2_IF_AND_BECAUSE: FoundationUnit = {
  id: "a2-if-and-because",
  cefr: "A2",
  canDo: {
    vi: "Nói điều kiện và lý do, không chỉ nói sự việc.",
    en: "Can state conditions and reasons, not only facts.",
  },
  communicativeFunction: "Điều kiện và lý do",
  prerequisites: ["a2-polite"],
  targetChunks: [
    { text: "if you need", vi: "nếu bạn cần" },
    { text: "as we agreed", vi: "như đã thống nhất" },
    { text: "i think that", vi: "tôi nghĩ rằng" },
    { text: "another one", vi: "một cái khác" },
  ],
  grammarFeatures: ["if clause", "as clause", "V + that clause", "another"],
  // CEFR-J A2.1: if and as clauses, V+that+CLAUSE, determiner another.
  grammarCodes: ["CL.if", "CL.as", "CL.that.OBJ", "DT.another"],
  inputScenes: [
    { id: "a2i-if", speaker: "Mai", text: "If you need help, tell me.", vi: "Nếu bạn cần giúp thì nói tôi." },
    { id: "a2i-as", speaker: "Tom", text: "We did it as we agreed.", vi: "Chúng tôi làm như đã thống nhất." },
    { id: "a2i-that", speaker: "Mai", text: "I think that it is ready.", vi: "Tôi nghĩ rằng nó xong rồi." },
    { id: "a2i-another", speaker: "Tom", text: "Let's try another one.", vi: "Thử một cái khác đi." },
  ],
  activities: [
    { id: "a2i-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Điều kiện là gì?", targets: ["if you need", "as we agreed"], supportAllowed: true },
    { id: "a2i-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["if you need"], supportAllowed: false },
    { id: "a2i-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["another one"], supportAllowed: false },
    { id: "a2i-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói cụm tiếng Anh nghĩa là “tôi nghĩ rằng”.", targets: ["i think that"], supportAllowed: false },
    { id: "a2i-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Đề xuất một cách làm khác, kèm điều kiện. Hai câu.", targets: ["if you need", "another one"], supportAllowed: false },
    { id: "a2i-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “như đã thống nhất”.", targets: ["as we agreed"], supportAllowed: false },
    { id: "a2i-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu có điều kiện hoặc lý do, nhanh dần.", targets: ["if you need", "i think that", "another one"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "if you need", independent: true, changedContext: true, delayed: true },
    { chunk: "i think that", independent: true, changedContext: true, delayed: false },
  ],
};

export const A2_REPORTING: FoundationUnit = {
  id: "a2-reporting",
  cefr: "A2",
  canDo: {
    vi: "Thuật lại lời người khác, và nói mình biết hay không biết gì.",
    en: "Can report what someone said, and say what they do or do not know.",
  },
  communicativeFunction: "Thuật lại và câu hỏi gián tiếp",
  prerequisites: ["a2-if-and-because"],
  targetChunks: [
    { text: "she said that", vi: "cô ấy nói rằng" },
    { text: "i don't know what", vi: "tôi không biết cái gì" },
    { text: "he explained", vi: "anh ấy giải thích" },
    { text: "what you need", vi: "thứ bạn cần" },
  ],
  grammarFeatures: [
    "indirect speech",
    "indirect question",
    "compound relative what",
    "relative adverb",
  ],
  // CEFR-J: indirect question, compound relative, relative adverb (A2.1);
  // indirect speech (A2.2).
  grammarCodes: ["INDQ.know.etc", "PREL.what", "RBREL", "INDSP.explain.report.say"],
  inputScenes: [
    { id: "a2r-said", speaker: "Mai", text: "She said that it was moved.", vi: "Cô ấy nói là nó đã bị dời." },
    { id: "a2r-dontknow", speaker: "Tom", text: "I don't know what the problem is.", vi: "Tôi không biết vấn đề là gì." },
    { id: "a2r-explained", speaker: "Mai", text: "He explained the reason.", vi: "Anh ấy giải thích lý do." },
    { id: "a2r-what", speaker: "Tom", text: "This is what you need.", vi: "Đây là thứ bạn cần." },
  ],
  activities: [
    { id: "a2r-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Ai nói gì?", targets: ["she said that", "he explained"], supportAllowed: true },
    { id: "a2r-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["she said that"], supportAllowed: false },
    { id: "a2r-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["what you need"], supportAllowed: false },
    { id: "a2r-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói cụm tiếng Anh nghĩa là “tôi không biết cái gì”.", targets: ["i don't know what"], supportAllowed: false },
    { id: "a2r-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Thuật lại cho nhóm điều một người vừa nói với bạn. Hai câu.", targets: ["she said that", "he explained"], supportAllowed: false },
    { id: "a2r-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “thứ bạn cần”.", targets: ["what you need"], supportAllowed: false },
    { id: "a2r-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Thuật lại bốn câu, nhanh dần.", targets: ["she said that", "he explained", "i don't know what"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "she said that", independent: true, changedContext: true, delayed: true },
    { chunk: "i don't know what", independent: true, changedContext: true, delayed: false },
  ],
};

export const A2_MORE_AND_MOST: FoundationUnit = {
  id: "a2-more-and-most",
  cefr: "A2",
  canDo: {
    vi: "So sánh những thứ cần từ dài, và nói lượng nhiều ít.",
    en: "Can compare with longer words, and talk about quantity.",
  },
  communicativeFunction: "So sánh dài và lượng",
  prerequisites: ["a2-reporting"],
  targetChunks: [
    { text: "more useful", vi: "hữu ích hơn" },
    { text: "the most important", vi: "quan trọng nhất" },
    { text: "much time", vi: "nhiều thời gian" },
    { text: "the small ones", vi: "những cái nhỏ" },
  ],
  grammarFeatures: ["more + adj", "most + adj", "much + uncountable", "ones"],
  // CEFR-J: most+ADJ and ones (A2.1); more+ADJ and much (A2.2).
  grammarCodes: ["COMP.JJS.RBS.most", "PIND.ones", "COMP.JJR.RBR.more", "QUANT.much"],
  inputScenes: [
    { id: "a2m-more", speaker: "Mai", text: "This way is more useful.", vi: "Cách này hữu ích hơn." },
    { id: "a2m-most", speaker: "Tom", text: "That is the most important part.", vi: "Đó là phần quan trọng nhất." },
    { id: "a2m-much", speaker: "Mai", text: "We do not have much time.", vi: "Chúng ta không có nhiều thời gian." },
    { id: "a2m-ones", speaker: "Tom", text: "Start with the small ones.", vi: "Bắt đầu từ những cái nhỏ." },
  ],
  activities: [
    { id: "a2m-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Cái gì quan trọng nhất?", targets: ["more useful", "the most important"], supportAllowed: true },
    { id: "a2m-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["more useful"], supportAllowed: false },
    { id: "a2m-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["the small ones"], supportAllowed: false },
    { id: "a2m-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói cụm tiếng Anh nghĩa là “quan trọng nhất”.", targets: ["the most important"], supportAllowed: false },
    { id: "a2m-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Sắp thứ tự ưu tiên ba việc, nói vì sao. Ba câu.", targets: ["the most important", "more useful", "much time"], supportAllowed: false },
    { id: "a2m-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “nhiều thời gian”.", targets: ["much time"], supportAllowed: false },
    { id: "a2m-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu so sánh, nhanh dần.", targets: ["more useful", "the most important", "the small ones"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "the most important", independent: true, changedContext: true, delayed: true },
    { chunk: "more useful", independent: true, changedContext: true, delayed: false },
  ],
};

export const A2_GETTING_THINGS_DONE: FoundationUnit = {
  id: "a2-getting-things-done",
  cefr: "A2",
  canDo: {
    vi: "Nhờ người khác làm việc gì, và nói việc đã được làm.",
    en: "Can get someone to do something, and say a thing was done.",
  },
  communicativeFunction: "Nhờ làm và thể bị động quá khứ",
  prerequisites: ["a2-more-and-most"],
  targetChunks: [
    { text: "let me check", vi: "để tôi kiểm tra" },
    { text: "it was sent", vi: "nó đã được gửi" },
    { text: "i didn't get", vi: "tôi không nhận được" },
    { text: "this file", vi: "cái file này" },
  ],
  grammarFeatures: [
    "have/let/make + object + infinitive",
    "past passive",
    "S+V+O negative",
    "this/that + noun",
  ],
  // CEFR-J A2.1: causative have/let/make, past passive, S+V+O negative,
  // This/That + noun.
  grammarCodes: ["CAUS.have.let.make", "PASS.PAST.AFF", "VP.SVO.NEG", "DT.this.that_N"],
  inputScenes: [
    { id: "a2g-let", speaker: "Mai", text: "Let me check this file.", vi: "Để tôi kiểm tra cái file này." },
    { id: "a2g-sent", speaker: "Tom", text: "It was sent yesterday.", vi: "Nó đã được gửi hôm qua." },
    { id: "a2g-didnt", speaker: "Mai", text: "I didn't get the message.", vi: "Tôi không nhận được tin nhắn." },
  ],
  activities: [
    { id: "a2g-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Việc gì đã được gửi?", targets: ["it was sent", "this file"], supportAllowed: true },
    { id: "a2g-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["it was sent"], supportAllowed: false },
    { id: "a2g-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["i didn't get"], supportAllowed: false },
    { id: "a2g-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói cụm tiếng Anh nghĩa là “để tôi kiểm tra”.", targets: ["let me check"], supportAllowed: false },
    { id: "a2g-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Có nhầm lẫn về một file. Xử lý bằng hai câu.", targets: ["let me check", "it was sent"], supportAllowed: false },
    { id: "a2g-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “tôi không nhận được”.", targets: ["i didn't get"], supportAllowed: false },
    { id: "a2g-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu xử lý công việc, nhanh dần.", targets: ["let me check", "it was sent", "i didn't get"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "let me check", independent: true, changedContext: true, delayed: true },
    { chunk: "it was sent", independent: true, changedContext: true, delayed: false },
  ],
};

export const A2_ONGOING_WORK: FoundationUnit = {
  id: "a2-ongoing-work",
  cefr: "A2",
  canDo: {
    vi: "Mô tả việc đang diễn ra, và nói mình thấy ai đang làm gì.",
    en: "Can describe ongoing work, and say they saw someone doing something.",
  },
  communicativeFunction: "Việc đang diễn ra, người đang làm",
  prerequisites: ["a2-getting-things-done"],
  targetChunks: [
    { text: "the running process", vi: "tiến trình đang chạy" },
    { text: "a working version", vi: "một bản chạy được" },
    { text: "i saw him working", vi: "tôi thấy anh ấy đang làm" },
    { text: "keep it running", vi: "cứ để nó chạy" },
  ],
  grammarFeatures: [
    "premodifying present participle",
    "verb + object + V-ing",
  ],
  // CEFR-J: premodifying V-ing (A2.1), verb + object + V-ing (A2.2).
  grammarCodes: ["VG.VG_N", "VG.VV_NP_VG"],
  inputScenes: [
    { id: "a2o-running", speaker: "Mai", text: "Check the running process.", vi: "Kiểm tra tiến trình đang chạy." },
    { id: "a2o-working", speaker: "Tom", text: "We have a working version now.", vi: "Giờ đã có một bản chạy được." },
    { id: "a2o-saw", speaker: "Mai", text: "I saw him working on it.", vi: "Tôi thấy anh ấy đang làm việc đó." },
    { id: "a2o-keep", speaker: "Tom", text: "Keep it running until tomorrow.", vi: "Cứ để nó chạy tới mai." },
  ],
  activities: [
    { id: "a2o-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Cái gì đang chạy?", targets: ["the running process", "a working version"], supportAllowed: true },
    { id: "a2o-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["a working version"], supportAllowed: false },
    { id: "a2o-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["keep it running"], supportAllowed: false },
    { id: "a2o-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói cụm tiếng Anh nghĩa là “tôi thấy anh ấy đang làm”.", targets: ["i saw him working"], supportAllowed: false },
    { id: "a2o-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Báo trạng thái hệ thống cho nhóm. Hai câu.", targets: ["the running process", "a working version"], supportAllowed: false },
    { id: "a2o-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “cứ để nó chạy”.", targets: ["keep it running"], supportAllowed: false },
    { id: "a2o-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu mô tả việc đang diễn ra, nhanh dần.", targets: ["the running process", "a working version", "keep it running"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "a working version", independent: true, changedContext: true, delayed: true },
    { chunk: "i saw him working", independent: true, changedContext: true, delayed: false },
  ],
};
