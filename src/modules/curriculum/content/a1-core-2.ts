import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * The second batch of A1 units, written against named gaps in the inventory.
 *
 * Chosen by what this learner needs soonest rather than by what is easiest to
 * write: `can` and `want to` are how anyone asks for anything at work, `there
 * is` is how problems get reported, `why/because` is the whole of an interview
 * answer, and the past tense is most of what a podcast guest is doing.
 */

export const A1_CAN: FoundationUnit = {
  id: "a1-can",
  cefr: "A1",
  canDo: {
    vi: "Nói mình làm được gì, và nhờ người khác làm giúp.",
    en: "Can say what they are able to do, and ask someone to do something.",
  },
  communicativeFunction: "Khả năng và lời nhờ",
  prerequisites: ["a1-asking-with-be"],
  targetChunks: [
    { text: "i can", vi: "tôi có thể" },
    { text: "i can't", vi: "tôi không thể" },
    { text: "can you", vi: "bạn có thể… không" },
    { text: "help me", vi: "giúp tôi" },
  ],
  grammarFeatures: ["can, affirmative and question"],
  // CEFR-J A1.2: modal can, statement and question.
  grammarCodes: ["MD.can.AFF", "MD.can.INT.AFF"],
  inputScenes: [
    { id: "can-do-it", speaker: "Mai", text: "I can do it today.", vi: "Hôm nay tôi làm được." },
    { id: "cant-today", speaker: "Tom", text: "I can't today.", vi: "Hôm nay tôi không làm được." },
    { id: "can-you-help", speaker: "Mai", text: "Can you help me?", vi: "Bạn giúp tôi được không?" },
    { id: "can-you-send", speaker: "Tom", text: "Can you send the file?", vi: "Bạn gửi file được không?" },
  ],
  activities: [
    { id: "can-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Ai làm được, ai không?", targets: ["i can", "i can't"], supportAllowed: true },
    { id: "can-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["can you"], supportAllowed: false },
    { id: "can-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["help me"], supportAllowed: false },
    { id: "can-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi không thể”.", targets: ["i can't"], supportAllowed: false },
    { id: "can-use-ask", strand: "meaning_focused_output", skill: "speaking", promptVi: "Bạn đang kẹt một việc. Nhờ đồng nghiệp giúp, hai câu.", targets: ["can you", "help me"], supportAllowed: false },
    { id: "can-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết câu tiếng Anh nghĩa là “tôi có thể”.", targets: ["i can"], supportAllowed: false },
    { id: "can-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu liên tiếp, nhanh dần. Lời nhờ phải bật ra ngay.", targets: ["i can", "can you", "help me"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "i can", independent: true, changedContext: true, delayed: false },
    { chunk: "can you", independent: true, changedContext: true, delayed: true },
  ],
};

export const A1_THERE_IS: FoundationUnit = {
  id: "a1-there-is",
  cefr: "A1",
  canDo: {
    vi: "Nói rằng có hoặc không có cái gì đó.",
    en: "Can say that something exists or does not.",
  },
  communicativeFunction: "Báo có vấn đề, báo còn hay hết",
  prerequisites: ["a1-can"],
  targetChunks: [
    { text: "there is", vi: "có (một cái)" },
    { text: "there are", vi: "có (nhiều cái)" },
    { text: "some questions", vi: "vài câu hỏi" },
    { text: "no time", vi: "không có thời gian" },
  ],
  grammarFeatures: ["there + be", "some/any", "no"],
  // CEFR-J: there+be and determiner no (A1.2), some/any (A1.1).
  grammarCodes: ["EX.there.AFF", "DT.some.any", "DT.no"],
  inputScenes: [
    { id: "there-problem", speaker: "Mai", text: "There is a problem.", vi: "Có một vấn đề." },
    { id: "there-questions", speaker: "Tom", text: "There are some questions.", vi: "Có vài câu hỏi." },
    { id: "no-time", speaker: "Mai", text: "We have no time today.", vi: "Hôm nay chúng ta không có thời gian." },
    { id: "there-two", speaker: "Tom", text: "There is a problem, and there are some questions.", vi: "Có một vấn đề, và có vài câu hỏi." },
  ],
  activities: [
    { id: "there-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Có mấy thứ đang được nhắc tới?", targets: ["there is", "there are"], supportAllowed: true },
    { id: "there-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["there is"], supportAllowed: false },
    { id: "there-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["no time"], supportAllowed: false },
    { id: "there-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “có vài câu hỏi”.", targets: ["some questions"], supportAllowed: false },
    { id: "there-use-report", strand: "meaning_focused_output", skill: "speaking", promptVi: "Báo cho nhóm biết hôm nay có gì vướng. Hai câu.", targets: ["there is", "there are", "no time"], supportAllowed: false },
    { id: "there-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết câu tiếng Anh nghĩa là “có (nhiều cái)”.", targets: ["there are"], supportAllowed: false },
    { id: "there-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu liên tiếp, nhanh dần.", targets: ["there is", "there are"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "there is", independent: true, changedContext: true, delayed: false },
    { chunk: "there are", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_WANT_TO: FoundationUnit = {
  id: "a1-want-to",
  cefr: "A1",
  canDo: {
    vi: "Nói mình muốn làm gì, và nhờ người khác làm gì.",
    en: "Can say what they want to do, and ask someone else to do something.",
  },
  communicativeFunction: "Ý định và yêu cầu",
  prerequisites: ["a1-there-is"],
  targetChunks: [
    { text: "i want to", vi: "tôi muốn" },
    { text: "i need to", vi: "tôi cần" },
    { text: "i want you to", vi: "tôi muốn bạn" },
    { text: "to check", vi: "kiểm tra" },
  ],
  grammarFeatures: ["to-infinitive", "verb + to do", "verb + object + to do"],
  // CEFR-J: to-infinitive (A1.1), verb to do and verb object to do (A1.2).
  grammarCodes: ["TO.to_do", "TO.VV_to_do", "TO.VV_NP_to_do"],
  inputScenes: [
    { id: "want-learn", speaker: "Mai", text: "I want to learn English.", vi: "Tôi muốn học tiếng Anh." },
    { id: "need-check", speaker: "Tom", text: "I need to check the file.", vi: "Tôi cần kiểm tra cái file." },
    { id: "want-you", speaker: "Mai", text: "I want you to check it.", vi: "Tôi muốn bạn kiểm tra nó." },
    { id: "to-check", speaker: "Tom", text: "It is easy to check.", vi: "Kiểm tra thì dễ thôi." },
  ],
  activities: [
    { id: "want-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Ai muốn làm gì?", targets: ["i want to", "i need to"], supportAllowed: true },
    { id: "want-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["i want to"], supportAllowed: false },
    { id: "want-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["to check"], supportAllowed: false },
    { id: "want-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi cần”.", targets: ["i need to"], supportAllowed: false },
    { id: "want-use-plan", strand: "meaning_focused_output", skill: "speaking", promptVi: "Nói ba việc bạn muốn làm trong tuần này.", targets: ["i want to", "i need to"], supportAllowed: false },
    { id: "want-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết câu tiếng Anh nghĩa là “tôi muốn bạn”.", targets: ["i want you to"], supportAllowed: false },
    { id: "want-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu liên tiếp, nhanh dần.", targets: ["i want to", "i need to"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "i want to", independent: true, changedContext: true, delayed: true },
    { chunk: "i need to", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_WHY_BECAUSE: FoundationUnit = {
  id: "a1-why-because",
  cefr: "A1",
  canDo: {
    vi: "Hỏi lý do, và trả lời bằng một lý do.",
    en: "Can ask why, and answer with a reason.",
  },
  communicativeFunction: "Lý do và ý kiến",
  prerequisites: ["a1-want-to"],
  targetChunks: [
    { text: "why", vi: "tại sao" },
    { text: "because", vi: "bởi vì" },
    { text: "i think", vi: "tôi nghĩ" },
    { text: "i know", vi: "tôi biết" },
  ],
  grammarFeatures: ["why", "because clause", "think/know + clause"],
  // CEFR-J: Why (A1.2), subordinate clause (A1.1), think/know + clause (A1.2).
  grammarCodes: ["INT.why", "CL_after.etc", "CL.that.OMIT"],
  inputScenes: [
    { id: "why-late", speaker: "Mai", text: "Why is it late?", vi: "Sao nó trễ?" },
    { id: "because-problem", speaker: "Tom", text: "Because there is a problem.", vi: "Bởi vì có một vấn đề." },
    { id: "i-think", speaker: "Mai", text: "I think it is ready.", vi: "Tôi nghĩ nó xong rồi." },
    { id: "i-know", speaker: "Tom", text: "I know you are busy.", vi: "Tôi biết bạn đang bận." },
  ],
  activities: [
    { id: "why-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Lý do là gì?", targets: ["why", "because"], supportAllowed: true },
    { id: "why-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["because"], supportAllowed: false },
    { id: "why-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["i think"], supportAllowed: false },
    { id: "why-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi biết”.", targets: ["i know"], supportAllowed: false },
    { id: "why-use-answer", strand: "meaning_focused_output", skill: "speaking", promptVi: "Có người hỏi sao việc chưa xong. Trả lời bằng một lý do.", targets: ["because", "i think"], supportAllowed: false },
    { id: "why-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết từ tiếng Anh nghĩa là “tại sao”.", targets: ["why"], supportAllowed: false },
    { id: "why-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu có lý do, nhanh dần.", targets: ["because", "i think", "i know"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "because", independent: true, changedContext: true, delayed: true },
    { chunk: "i think", independent: true, changedContext: true, delayed: false },
  ],
};

export const A1_YESTERDAY: FoundationUnit = {
  id: "a1-yesterday",
  cefr: "A1",
  canDo: {
    vi: "Kể lại một việc đã xảy ra.",
    en: "Can say what happened.",
  },
  communicativeFunction: "Kể chuyện đã qua",
  prerequisites: ["a1-why-because"],
  targetChunks: [
    { text: "it was", vi: "nó đã là" },
    { text: "they were", vi: "họ đã là" },
    { text: "i worked", vi: "tôi đã làm" },
    { text: "yesterday", vi: "hôm qua" },
  ],
  grammarFeatures: ["past of be", "past simple"],
  // CEFR-J A1.3: past of be, past simple of lexical verbs.
  grammarCodes: ["TA.PAST.be.AFF", "TA.PAST.do.AFF"],
  inputScenes: [
    { id: "was-good", speaker: "Mai", text: "It was good.", vi: "Nó ổn." },
    { id: "were-here", speaker: "Tom", text: "They were here yesterday.", vi: "Hôm qua họ có ở đây." },
    { id: "worked-late", speaker: "Mai", text: "I worked late yesterday.", vi: "Hôm qua tôi làm muộn." },
    { id: "was-busy", speaker: "Tom", text: "It was a busy day.", vi: "Đó là một ngày bận." },
  ],
  activities: [
    { id: "past-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Chuyện xảy ra khi nào?", targets: ["it was", "yesterday"], supportAllowed: true },
    { id: "past-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["it was"], supportAllowed: false },
    { id: "past-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["they were"], supportAllowed: false },
    { id: "past-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi đã làm”.", targets: ["i worked"], supportAllowed: false },
    { id: "past-use-standup", strand: "meaning_focused_output", skill: "speaking", promptVi: "Họp đầu ngày: kể hai việc bạn đã làm hôm qua.", targets: ["i worked", "yesterday", "it was"], supportAllowed: false },
    { id: "past-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết từ tiếng Anh nghĩa là “hôm qua”.", targets: ["yesterday"], supportAllowed: false },
    { id: "past-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Kể bốn việc đã qua, nhanh dần.", targets: ["it was", "i worked", "yesterday"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "i worked", independent: true, changedContext: true, delayed: true },
    { chunk: "it was", independent: true, changedContext: true, delayed: false },
  ],
};

export const A1_HOW_OFTEN: FoundationUnit = {
  id: "a1-how-often",
  cefr: "A1",
  canDo: {
    vi: "Nói mình làm gì thường xuyên đến mức nào.",
    en: "Can say how often they do something.",
  },
  communicativeFunction: "Mức độ thường xuyên",
  prerequisites: ["a1-yesterday"],
  targetChunks: [
    { text: "always", vi: "luôn luôn" },
    { text: "usually", vi: "thường" },
    { text: "never", vi: "không bao giờ" },
    { text: "really", vi: "thật sự, rất" },
  ],
  grammarFeatures: ["frequency adverbs", "never", "intensifiers"],
  // CEFR-J: frequency and negation adverbs (A1.2), intensifiers (A1.1).
  grammarCodes: ["RB.FRQ", "RB.NEG", "RB.INT"],
  inputScenes: [
    { id: "always-morning", speaker: "Mai", text: "I always work in the morning.", vi: "Tôi luôn làm việc buổi sáng." },
    { id: "usually-late", speaker: "Tom", text: "I usually start late.", vi: "Tôi thường bắt đầu muộn." },
    { id: "never-weekend", speaker: "Mai", text: "I never work at the weekend.", vi: "Tôi không bao giờ làm cuối tuần." },
    { id: "really-good", speaker: "Tom", text: "It is really good.", vi: "Nó thật sự tốt." },
  ],
  activities: [
    { id: "often-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Ai làm việc thường xuyên hơn?", targets: ["always", "usually"], supportAllowed: true },
    { id: "often-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["never"], supportAllowed: false },
    { id: "often-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["really"], supportAllowed: false },
    { id: "often-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói từ tiếng Anh nghĩa là “luôn luôn”.", targets: ["always"], supportAllowed: false },
    { id: "often-use-routine", strand: "meaning_focused_output", skill: "speaking", promptVi: "Kể ba thói quen làm việc của bạn, mỗi câu một mức độ khác nhau.", targets: ["always", "usually", "never"], supportAllowed: false },
    { id: "often-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết từ tiếng Anh nghĩa là “không bao giờ”.", targets: ["never"], supportAllowed: false },
    { id: "often-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu về thói quen, nhanh dần.", targets: ["always", "usually", "never"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "always", independent: true, changedContext: true, delayed: false },
    { chunk: "never", independent: true, changedContext: true, delayed: true },
  ],
};
