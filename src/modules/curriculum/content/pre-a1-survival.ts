import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * The units that come before anything else is useful.
 *
 * Chosen for this learner rather than for a generic syllabus. They study
 * programming, watch live streamers and listen to interview podcasts — all of
 * it far above their level and none of it slowing down for them. The single
 * most valuable thing a beginner can do with fast English is not understand
 * more of it; it is be able to say that they did not, and ask for it again.
 *
 * So `ask-for-repeat` comes second, before anything descriptive. A learner who
 * can say "sorry, again please" can survive a conversation they understand a
 * tenth of. One who cannot will nod, lose the thread, and stop.
 */

export const PRE_A1_ASK_FOR_REPEAT: FoundationUnit = {
  id: "pre-a1-ask-for-repeat",
  cefr: "Pre-A1",
  canDo: {
    vi: "Nói được rằng mình chưa hiểu, và xin người ta nói lại.",
    en: "Can say they did not understand, and ask for it again.",
  },
  communicativeFunction: "Xin nhắc lại khi chưa nghe kịp",
  prerequisites: ["pre-a1-introduce-yourself"],
  targetChunks: [
    { text: "i don't understand", vi: "tôi không hiểu" },
    { text: "again please", vi: "nói lại giúp tôi" },
    { text: "sorry", vi: "xin lỗi / gì cơ" },
    { text: "slowly please", vi: "nói chậm thôi" },
  ],
  grammarFeatures: ["negative with don't"],
  inputScenes: [
    { id: "repeat-fast", speaker: "Mai", text: "Sorry, I don't understand.", vi: "Xin lỗi, tôi không hiểu." },
    { id: "repeat-ask", speaker: "Mai", text: "Again please.", vi: "Nói lại giúp tôi." },
    { id: "repeat-slow", speaker: "Mai", text: "Slowly please.", vi: "Nói chậm thôi." },
    { id: "repeat-ok", speaker: "Tom", text: "Sorry. My name is Tom.", vi: "Xin lỗi. Tên tôi là Tom." },
  ],
  activities: [
    {
      id: "repeat-listen-scene",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe cả đoạn. Người này đang gặp vấn đề gì?",
      targets: ["i don't understand"],
      supportAllowed: true,
    },
    {
      id: "repeat-listen-again",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe lại. Họ xin người kia làm gì?",
      targets: ["again please", "slowly please"],
      supportAllowed: true,
    },
    {
      id: "repeat-recall-not-understand",
      strand: "language_focused",
      skill: "speaking",
      promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi không hiểu”.",
      targets: ["i don't understand"],
      supportAllowed: false,
    },
    {
      id: "repeat-use-in-video",
      strand: "meaning_focused_output",
      skill: "speaking",
      promptVi:
        "Bạn đang xem một video tiếng Anh nói quá nhanh. Nói ra ba câu bạn sẽ dùng nếu người đó đang ngồi trước mặt bạn.",
      targets: ["sorry", "i don't understand", "again please", "slowly please"],
      supportAllowed: false,
    },
    {
      // Listening had seven activities and not one of them was graded: every
      // single one allowed support, so the product never once checked whether
      // the learner heard anything. This is the dictation the measurement rules
      // call for — heard, then written down, with nothing on screen to copy.
      id: "repeat-listen-and-write",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.",
      targets: ["again please"],
      supportAllowed: false,
    },
    {
      // Reading is the one skill the syllabus claimed and never once exercised.
      // The English is shown and never spoken here: play it and this becomes a
      // listening item wearing a reading label.
      id: "repeat-read-meaning",
      strand: "meaning_focused_input",
      skill: "reading",
      promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?",
      targets: ["again please"],
      supportAllowed: false,
    },
    {
      // Writing without audio. With the sentence playing in your ears this
      // would be copying, which measures typing.
      id: "repeat-write-message",
      strand: "meaning_focused_output",
      skill: "writing",
      promptVi:
        "Bạn nhắn tin cho người vừa nói quá nhanh. Viết câu tiếng Anh nghĩa là “nói lại giúp tôi”.",
      targets: ["again please"],
      supportAllowed: false,
    },
    {
      id: "repeat-fluency",
      strand: "fluency_development",
      skill: "speaking",
      promptVi:
        "Nói ba câu này năm lần, mỗi lần nhanh hơn. Không có chữ nào mới — mục tiêu là bật ra được ngay, vì lúc cần thì bạn không có thời gian nghĩ.",
      targets: ["sorry", "again please", "slowly please"],
      supportAllowed: true,
    },
  ],
  evidenceCriteria: [
    { chunk: "i don't understand", independent: true, changedContext: true, delayed: true },
    { chunk: "again please", independent: true, changedContext: false, delayed: true },
    { chunk: "slowly please", independent: true, changedContext: false, delayed: true },
  ],
};

export const PRE_A1_SAY_WHAT_YOU_DO: FoundationUnit = {
  id: "pre-a1-say-what-you-do",
  cefr: "Pre-A1",
  canDo: {
    vi: "Nói được mình làm gì và đang học gì.",
    en: "Can say what they do and what they are learning.",
  },
  communicativeFunction: "Nói về công việc và việc học của mình",
  prerequisites: ["pre-a1-introduce-yourself"],
  targetChunks: [
    { text: "i work with", vi: "tôi làm việc với" },
    { text: "i'm learning", vi: "tôi đang học" },
    { text: "i write code", vi: "tôi viết code" },
    { text: "what do you do", vi: "bạn làm nghề gì" },
  ],
  grammarFeatures: ["present simple for habits", "be + -ing for now"],
  inputScenes: [
    { id: "do-ask", speaker: "Anna", text: "What do you do?", vi: "Bạn làm nghề gì?" },
    { id: "do-answer", speaker: "Hoang", text: "I write code.", vi: "Tôi viết code." },
    { id: "do-detail", speaker: "Hoang", text: "I work with computers.", vi: "Tôi làm việc với máy tính." },
    { id: "do-learning", speaker: "Hoang", text: "I'm learning English.", vi: "Tôi đang học tiếng Anh." },
  ],
  activities: [
    {
      id: "do-listen",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe cả đoạn. Người kia làm nghề gì?",
      targets: ["i write code"],
      supportAllowed: true,
    },
    {
      id: "do-listen-learning",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe lại. Ngoài công việc, họ còn nói họ đang làm gì?",
      targets: ["i'm learning"],
      supportAllowed: true,
    },
    {
      id: "do-recall-work",
      strand: "language_focused",
      skill: "speaking",
      promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi viết code”.",
      targets: ["i write code"],
      supportAllowed: false,
    },
    {
      id: "do-use-about-you",
      strand: "meaning_focused_output",
      skill: "speaking",
      promptVi:
        "Một người trong phòng chat hỏi bạn làm gì. Trả lời bằng hai câu: bạn làm gì, và bạn đang học gì.",
      targets: ["i write code", "i'm learning"],
      supportAllowed: false,
    },
    {
      id: "do-ask-back",
      strand: "meaning_focused_output",
      skill: "speaking",
      promptVi:
        "Bạn vừa nói xong về mình. Hỏi lại người kia làm nghề gì, không nhìn chữ.",
      targets: ["what do you do"],
      supportAllowed: false,
    },
    {
      // Listening had seven activities and not one of them was graded: every
      // single one allowed support, so the product never once checked whether
      // the learner heard anything. This is the dictation the measurement rules
      // call for — heard, then written down, with nothing on screen to copy.
      id: "do-listen-and-write",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.",
      targets: ["i write code"],
      supportAllowed: false,
    },
    {
      // Reading is the one skill the syllabus claimed and never once exercised.
      // The English is shown and never spoken here: play it and this becomes a
      // listening item wearing a reading label.
      id: "do-read-meaning",
      strand: "meaning_focused_input",
      skill: "reading",
      promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?",
      targets: ["i write code"],
      supportAllowed: false,
    },
    {
      id: "do-write-bio",
      strand: "meaning_focused_output",
      skill: "writing",
      promptVi: "Viết một dòng giới thiệu cho hồ sơ GitHub của bạn.",
      targets: ["i write code", "i'm learning"],
      supportAllowed: false,
    },
  ],
  evidenceCriteria: [
    { chunk: "i write code", independent: true, changedContext: true, delayed: true },
    { chunk: "i'm learning", independent: true, changedContext: true, delayed: true },
    { chunk: "what do you do", independent: true, changedContext: false, delayed: false },
  ],
};

export const PRE_A1_ASK_WHAT_IT_MEANS: FoundationUnit = {
  id: "pre-a1-ask-what-it-means",
  cefr: "Pre-A1",
  canDo: {
    vi: "Hỏi được nghĩa của một từ, và nói được mình không biết.",
    en: "Can ask what a word means, and say they do not know.",
  },
  communicativeFunction: "Hỏi nghĩa và thừa nhận chưa biết",
  prerequisites: ["pre-a1-ask-for-repeat"],
  targetChunks: [
    { text: "what does it mean", vi: "nó nghĩa là gì" },
    { text: "i don't know", vi: "tôi không biết" },
    { text: "how do you say", vi: "nói thế nào" },
  ],
  grammarFeatures: ["wh- question with do/does"],
  inputScenes: [
    { id: "mean-ask", speaker: "Mai", text: "What does it mean?", vi: "Nó nghĩa là gì?" },
    { id: "mean-idk", speaker: "Tom", text: "I don't know.", vi: "Tôi không biết." },
    { id: "mean-how", speaker: "Mai", text: "How do you say this?", vi: "Cái này nói thế nào?" },
  ],
  activities: [
    {
      id: "mean-listen",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe đoạn này. Ai đang hỏi, ai đang trả lời?",
      targets: ["what does it mean"],
      supportAllowed: true,
    },
    {
      id: "mean-recall",
      strand: "language_focused",
      skill: "speaking",
      promptVi: "Không nhìn chữ. Hỏi nghĩa của một từ bằng tiếng Anh.",
      targets: ["what does it mean"],
      supportAllowed: false,
    },
    {
      id: "mean-use",
      strand: "meaning_focused_output",
      skill: "speaking",
      promptVi:
        "Bạn đang nghe podcast và gặp một từ lạ. Nói hai câu: hỏi nghĩa, và thừa nhận bạn chưa biết.",
      targets: ["what does it mean", "i don't know"],
      supportAllowed: false,
    },
    {
      // Reading is the one skill the syllabus claimed and never once exercised.
      // The English is shown and never spoken here: play it and this becomes a
      // listening item wearing a reading label.
      id: "mean-read-meaning",
      strand: "meaning_focused_input",
      skill: "reading",
      promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?",
      targets: ["what does it mean"],
      supportAllowed: false,
    },
    {
      id: "mean-write-question",
      strand: "meaning_focused_output",
      skill: "writing",
      promptVi:
        "Bạn gặp một từ lạ trong tài liệu. Viết câu tiếng Anh nghĩa là “nó nghĩa là gì”.",
      targets: ["what does it mean"],
      supportAllowed: false,
    },
    {
      id: "mean-fluency",
      strand: "fluency_development",
      skill: "speaking",
      promptVi: "Nói ba câu này liên tục cho tới khi không phải nghĩ nữa.",
      targets: ["what does it mean", "i don't know", "how do you say"],
      supportAllowed: true,
    },
  ],
  evidenceCriteria: [
    { chunk: "what does it mean", independent: true, changedContext: true, delayed: true },
    { chunk: "i don't know", independent: true, changedContext: true, delayed: true },
  ],
};
