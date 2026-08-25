import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * The first unit, authored rather than generated.
 *
 * It exists partly as content and partly as the worked example the schema was
 * designed against: if the first real unit could not satisfy the balance rules,
 * the rules would have been decoration.
 */
export const PRE_A1_INTRODUCE_YOURSELF: FoundationUnit = {
  id: "pre-a1-introduce-yourself",
  cefr: "Pre-A1",
  canDo: {
    vi: "Nói được tên mình khi gặp người mới, và hỏi lại tên người ta.",
    en: "Can say their own name when meeting someone, and ask for theirs.",
  },
  communicativeFunction: "Giới thiệu bản thân và hỏi tên",
  prerequisites: [],
  targetChunks: [
    { text: "my name is", vi: "tên tôi là" },
    { text: "what's your name", vi: "bạn tên gì" },
    { text: "nice to meet you", vi: "rất vui được gặp bạn" },
    { text: "i'm", vi: "tôi là" },
  ],
  grammarFeatures: ["be + noun in first person"],
  // CEFR-J A1.1: I am, What ...?, my/your.
  grammarCodes: ["PP.I_am", "INT.what", "PGEN"],
  inputScenes: [
    { id: "scene-hello-anna", speaker: "Anna", text: "Hi, I'm Anna.", vi: "Chào, tôi là Anna." },
    {
      id: "scene-ask-name",
      speaker: "Anna",
      text: "What's your name?",
      vi: "Bạn tên gì?",
    },
    {
      id: "scene-answer-name",
      speaker: "David",
      text: "My name is David.",
      vi: "Tên tôi là David.",
    },
    {
      id: "scene-nice",
      speaker: "Anna",
      text: "Nice to meet you, David.",
      vi: "Rất vui được gặp bạn, David.",
    },
  ],
  activities: [
    {
      id: "listen-whole-exchange",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi:
        "Nghe hết đoạn hội thoại. Chưa cần hiểu từng chữ — hai người này đang làm gì với nhau?",
      targets: ["my name is"],
      supportAllowed: true,
    },
    {
      id: "listen-again-for-names",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe lại. Hai người tên gì?",
      targets: ["my name is", "i'm"],
      supportAllowed: true,
    },
    {
      id: "recall-say-your-name",
      strand: "language_focused",
      skill: "speaking",
      promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tên tôi là …”.",
      targets: ["my name is"],
      supportAllowed: false,
    },
    {
      id: "recall-ask-name",
      strand: "language_focused",
      skill: "speaking",
      promptVi: "Không nhìn chữ. Hỏi tên người đối diện bằng tiếng Anh.",
      targets: ["what's your name"],
      supportAllowed: false,
    },
    {
      id: "use-meet-someone",
      strand: "meaning_focused_output",
      skill: "speaking",
      promptVi:
        "Bạn vừa vào một lớp học mới. Tự giới thiệu và hỏi tên một người. Nói cả ba câu liền nhau.",
      targets: ["i'm", "what's your name", "nice to meet you"],
      supportAllowed: false,
    },
    {
      id: "write-a-message",
      strand: "meaning_focused_output",
      skill: "writing",
      promptVi:
        "Viết một tin nhắn ngắn cho một người bạn mới trên mạng: tên bạn, và hỏi tên họ.",
      targets: ["my name is", "what's your name"],
      supportAllowed: false,
    },
    {
      // Listening had seven activities and not one of them was graded: every
      // single one allowed support, so the product never once checked whether
      // the learner heard anything. This is the dictation the measurement rules
      // call for — heard, then written down, with nothing on screen to copy.
      id: "listen-and-write-it-down",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.",
      targets: ["my name is"],
      supportAllowed: false,
    },
    {
      // Reading is the one skill the syllabus claimed and never once exercised.
      // The English is shown and never spoken here: play it and this becomes a
      // listening item wearing a reading label.
      id: "read-what-it-means",
      strand: "meaning_focused_input",
      skill: "reading",
      promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?",
      targets: ["my name is"],
      supportAllowed: false,
    },
    {
      id: "fluency-say-it-fast",
      strand: "fluency_development",
      skill: "speaking",
      promptVi:
        "Nói lại ba câu này năm lần, mỗi lần nhanh hơn một chút. Không có chữ nào mới — mục tiêu là nói trôi, không phải nói đúng thêm.",
      targets: ["i'm", "my name is", "nice to meet you"],
      supportAllowed: true,
    },
  ],
  evidenceCriteria: [
    { chunk: "my name is", independent: true, changedContext: true, delayed: true },
    { chunk: "what's your name", independent: true, changedContext: true, delayed: true },
    { chunk: "nice to meet you", independent: true, changedContext: false, delayed: true },
  ],
};
