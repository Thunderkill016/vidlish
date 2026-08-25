import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * The A1 core, written against the published inventory rather than invented.
 *
 * The syllabus used to be four units somebody thought were useful, and the
 * question "how much of A1 does this cover?" had no answer because nothing said
 * what A1 consists of. The CEFR-J Grammar Profile does say: 63 items, ordered
 * by sub-level. These units are written to close named gaps in it, and the
 * coverage test prints the fraction that remains.
 *
 * Order follows the profile's own sub-levels, which is a teaching order and not
 * a difficulty ranking: `this is` before `he is not`, statements before
 * questions, present before past.
 */

export const A1_THIS_IS: FoundationUnit = {
  id: "a1-this-is",
  cefr: "A1",
  canDo: {
    vi: "Chỉ vào một vật và nói nó là cái gì.",
    en: "Can point at something and say what it is.",
  },
  communicativeFunction: "Gọi tên đồ vật quanh mình",
  prerequisites: ["pre-a1-introduce-yourself"],
  targetChunks: [
    { text: "this is", vi: "đây là" },
    { text: "that is", vi: "kia là" },
    { text: "it is", vi: "nó là" },
    { text: "a computer", vi: "một cái máy tính" },
    { text: "the phone", vi: "cái điện thoại (đã nhắc tới)" },
  ],
  grammarFeatures: ["this/that is", "it is", "a/an", "the"],
  // CEFR-J A1.1: This/That is, It is, indefinite and definite articles.
  grammarCodes: ["DT.this.that_is", "PP.it_is", "DT.a.an", "DT.the"],
  inputScenes: [
    { id: "this-computer", speaker: "Mai", text: "This is a computer.", vi: "Đây là một cái máy tính." },
    { id: "that-phone", speaker: "Tom", text: "That is the phone.", vi: "Kia là cái điện thoại." },
    { id: "it-new", speaker: "Mai", text: "It is new.", vi: "Nó mới." },
    { id: "which-one", speaker: "Tom", text: "This is a computer, and that is the phone.", vi: "Đây là máy tính, còn kia là điện thoại." },
  ],
  activities: [
    {
      id: "this-listen",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe cả đoạn. Người này đang chỉ vào những thứ gì?",
      targets: ["this is", "that is"],
      supportAllowed: true,
    },
    {
      id: "this-listen-write",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.",
      targets: ["this is"],
      supportAllowed: false,
    },
    {
      id: "this-read-meaning",
      strand: "meaning_focused_input",
      skill: "reading",
      promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?",
      targets: ["it is"],
      supportAllowed: false,
    },
    {
      id: "this-recall",
      strand: "language_focused",
      skill: "speaking",
      promptVi: "Không nhìn chữ. Chỉ vào máy tính của bạn và nói bằng tiếng Anh.",
      targets: ["this is", "a computer"],
      supportAllowed: false,
    },
    {
      id: "this-use-desk",
      strand: "meaning_focused_output",
      skill: "speaking",
      promptVi: "Nhìn quanh bàn làm việc của bạn. Gọi tên ba thứ, mỗi thứ một câu.",
      targets: ["this is", "that is", "a computer", "the phone"],
      supportAllowed: false,
    },
    {
      id: "this-write",
      strand: "meaning_focused_output",
      skill: "writing",
      promptVi: "Viết câu tiếng Anh nghĩa là “đây là một cái máy tính”.",
      targets: ["a computer"],
      supportAllowed: false,
    },
    {
      id: "this-fluency",
      strand: "fluency_development",
      skill: "speaking",
      promptVi:
        "Nói năm câu liên tiếp, mỗi câu chỉ vào một vật khác. Không từ nào mới — mục tiêu là bật ra ngay.",
      targets: ["this is", "that is", "it is"],
      supportAllowed: true,
    },
  ],
  evidenceCriteria: [
    { chunk: "this is", independent: true, changedContext: true, delayed: false },
    { chunk: "it is", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_OTHER_PEOPLE: FoundationUnit = {
  id: "a1-other-people",
  cefr: "A1",
  canDo: {
    vi: "Nói về người khác, không chỉ về bản thân mình.",
    en: "Can talk about other people, not only themselves.",
  },
  communicativeFunction: "Giới thiệu và nhắc tới người khác",
  prerequisites: ["a1-this-is"],
  targetChunks: [
    { text: "he is", vi: "anh ấy là" },
    { text: "she is", vi: "cô ấy là" },
    { text: "we are", vi: "chúng tôi là" },
    { text: "they are", vi: "họ là" },
    { text: "with him", vi: "với anh ấy" },
    { text: "with her", vi: "với cô ấy" },
  ],
  grammarFeatures: ["he/she is", "we/they are", "object pronouns"],
  // CEFR-J A1.1: third-person and plural be, object pronouns.
  grammarCodes: ["PP.he.she_is", "PP.we_are", "PP.they_are", "PPO"],
  inputScenes: [
    { id: "he-engineer", speaker: "Mai", text: "He is an engineer.", vi: "Anh ấy là kỹ sư." },
    { id: "she-manager", speaker: "Tom", text: "She is my manager.", vi: "Cô ấy là quản lý của tôi." },
    { id: "we-team", speaker: "Mai", text: "We are a small team.", vi: "Chúng tôi là một nhóm nhỏ." },
    { id: "they-new", speaker: "Tom", text: "They are new here.", vi: "Họ mới tới đây." },
    { id: "work-with", speaker: "Mai", text: "I work with him and with her.", vi: "Tôi làm việc với anh ấy và với cô ấy." },
  ],
  activities: [
    {
      id: "people-listen",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe cả đoạn. Có mấy người được nhắc tới?",
      targets: ["he is", "she is"],
      supportAllowed: true,
    },
    {
      id: "people-listen-write",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.",
      targets: ["they are"],
      supportAllowed: false,
    },
    {
      id: "people-read",
      strand: "meaning_focused_input",
      skill: "reading",
      promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?",
      targets: ["she is"],
      supportAllowed: false,
    },
    {
      id: "people-recall",
      strand: "language_focused",
      skill: "speaking",
      promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “chúng tôi là một nhóm nhỏ”.",
      targets: ["we are"],
      supportAllowed: false,
    },
    {
      id: "people-use-team",
      strand: "meaning_focused_output",
      skill: "speaking",
      promptVi: "Giới thiệu hai người trong nhóm bạn, mỗi người một câu.",
      targets: ["he is", "she is", "they are"],
      supportAllowed: false,
    },
    {
      id: "people-write",
      strand: "meaning_focused_output",
      skill: "writing",
      promptVi: "Viết câu tiếng Anh nghĩa là “với anh ấy”.",
      targets: ["with him"],
      supportAllowed: false,
    },
    {
      id: "people-fluency",
      strand: "fluency_development",
      skill: "speaking",
      promptVi: "Nói bốn câu liên tiếp về bốn người khác nhau. Nhanh dần mỗi lượt.",
      targets: ["he is", "she is", "we are", "they are"],
      supportAllowed: true,
    },
  ],
  evidenceCriteria: [
    { chunk: "he is", independent: true, changedContext: true, delayed: false },
    { chunk: "they are", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_SAYING_NO: FoundationUnit = {
  id: "a1-saying-no",
  cefr: "A1",
  canDo: {
    vi: "Nói rằng một điều gì đó không đúng.",
    en: "Can say that something is not the case.",
  },
  communicativeFunction: "Phủ định với động từ be",
  prerequisites: ["a1-other-people"],
  targetChunks: [
    { text: "i am not", vi: "tôi không phải" },
    { text: "it is not", vi: "nó không phải" },
    { text: "he is not", vi: "anh ấy không phải" },
    { text: "not sure", vi: "không chắc" },
  ],
  grammarFeatures: ["be affirmative and negative"],
  // CEFR-J A1.1: present of be, affirmative and negative.
  grammarCodes: ["PP.I_am_not", "TA.PRESENT.be.AFF", "TA.PRESENT.be.NEG"],
  inputScenes: [
    { id: "not-manager", speaker: "Mai", text: "I am not a manager.", vi: "Tôi không phải quản lý." },
    { id: "not-ready", speaker: "Tom", text: "It is not ready.", vi: "Nó chưa xong." },
    { id: "not-here", speaker: "Mai", text: "He is not here today.", vi: "Hôm nay anh ấy không có ở đây." },
    { id: "not-sure", speaker: "Tom", text: "I am not sure.", vi: "Tôi không chắc." },
  ],
  activities: [
    {
      id: "no-listen",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe cả đoạn. Điều gì đang bị phủ nhận?",
      targets: ["i am not", "it is not"],
      supportAllowed: true,
    },
    {
      id: "no-listen-write",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.",
      targets: ["it is not"],
      supportAllowed: false,
    },
    {
      id: "no-read",
      strand: "meaning_focused_input",
      skill: "reading",
      promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?",
      targets: ["not sure"],
      supportAllowed: false,
    },
    {
      id: "no-recall",
      strand: "language_focused",
      skill: "speaking",
      promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi không chắc”.",
      targets: ["i am not", "not sure"],
      supportAllowed: false,
    },
    {
      id: "no-use-meeting",
      strand: "meaning_focused_output",
      skill: "speaking",
      promptVi:
        "Trong một cuộc họp có người hỏi bạn một việc bạn chưa nắm. Nói hai câu để không phải gật bừa.",
      targets: ["i am not", "not sure", "it is not"],
      supportAllowed: false,
    },
    {
      id: "no-write",
      strand: "meaning_focused_output",
      skill: "writing",
      promptVi: "Viết câu tiếng Anh nghĩa là “anh ấy không phải”.",
      targets: ["he is not"],
      supportAllowed: false,
    },
    {
      id: "no-fluency",
      strand: "fluency_development",
      skill: "speaking",
      promptVi: "Nói bốn câu phủ định liên tiếp, nhanh dần. Đây là thứ cần bật ra ngay khi cần.",
      targets: ["i am not", "it is not", "he is not"],
      supportAllowed: true,
    },
  ],
  evidenceCriteria: [
    { chunk: "i am not", independent: true, changedContext: true, delayed: true },
    { chunk: "not sure", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_ASKING_WITH_BE: FoundationUnit = {
  id: "a1-asking-with-be",
  cefr: "A1",
  canDo: {
    vi: "Hỏi người khác một câu bằng động từ be, và hỏi cái gì đó ở đâu.",
    en: "Can ask a question with be, and ask where something is.",
  },
  communicativeFunction: "Đặt câu hỏi",
  prerequisites: ["a1-saying-no"],
  targetChunks: [
    { text: "are you", vi: "bạn có… không" },
    { text: "is it", vi: "nó có… không" },
    { text: "where is", vi: "… ở đâu" },
    { text: "in the office", vi: "ở văn phòng" },
  ],
  grammarFeatures: ["be questions", "where", "prepositions"],
  // CEFR-J: be interrogative (A1.1), Are you (A1.3), Where (A1.3), prepositions (A1.1).
  grammarCodes: [
    "TA.PRESENT.be.INT.AFF",
    "PP.are_you",
    "INT.where",
    "IN.PREP.GENERAL",
  ],
  inputScenes: [
    { id: "are-you-ready", speaker: "Mai", text: "Are you ready?", vi: "Bạn sẵn sàng chưa?" },
    { id: "is-it-done", speaker: "Tom", text: "Is it done?", vi: "Xong chưa?" },
    { id: "where-file", speaker: "Mai", text: "Where is the file?", vi: "Cái file ở đâu?" },
    { id: "in-office", speaker: "Tom", text: "It is in the office.", vi: "Nó ở văn phòng." },
  ],
  activities: [
    {
      id: "ask-listen",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe cả đoạn. Người này đang hỏi gì?",
      targets: ["are you", "is it"],
      supportAllowed: true,
    },
    {
      id: "ask-listen-write",
      strand: "meaning_focused_input",
      skill: "listening",
      promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.",
      targets: ["where is"],
      supportAllowed: false,
    },
    {
      id: "ask-read",
      strand: "meaning_focused_input",
      skill: "reading",
      promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?",
      targets: ["in the office"],
      supportAllowed: false,
    },
    {
      id: "ask-recall",
      strand: "language_focused",
      skill: "speaking",
      promptVi: "Không nhìn chữ. Hỏi bằng tiếng Anh xem một thứ đang ở đâu.",
      targets: ["where is"],
      supportAllowed: false,
    },
    {
      id: "ask-use-standup",
      strand: "meaning_focused_output",
      skill: "speaking",
      promptVi:
        "Bạn đang họp nhanh đầu ngày. Hỏi đồng nghiệp hai câu để biết việc đã xong chưa.",
      targets: ["are you", "is it"],
      supportAllowed: false,
    },
    {
      id: "ask-write",
      strand: "meaning_focused_output",
      skill: "writing",
      promptVi: "Viết câu hỏi tiếng Anh nghĩa là “nó có… không”.",
      targets: ["is it"],
      supportAllowed: false,
    },
    {
      id: "ask-fluency",
      strand: "fluency_development",
      skill: "speaking",
      promptVi: "Hỏi bốn câu liên tiếp, nhanh dần. Câu hỏi phải bật ra được, không kịp nghĩ.",
      targets: ["are you", "is it", "where is"],
      supportAllowed: true,
    },
  ],
  evidenceCriteria: [
    { chunk: "are you", independent: true, changedContext: true, delayed: false },
    { chunk: "where is", independent: true, changedContext: true, delayed: true },
  ],
};
