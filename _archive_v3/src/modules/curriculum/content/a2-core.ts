import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * A2.1, written against `pnpm curriculum --next`.
 *
 * A2 is where a learner stops answering and starts holding a conversation:
 * past tense in the negative and the question, the future, the present perfect,
 * reported speech, and the modals that carry politeness. All ordinary at work
 * and all impossible with A1 alone.
 */

export const A2_YESTERDAY_QUESTIONS: FoundationUnit = {
  id: "a2-yesterday-questions",
  cefr: "A2",
  canDo: {
    vi: "Hỏi và phủ định về việc đã qua, không chỉ kể lại.",
    en: "Can ask about and deny past events, not only report them.",
  },
  communicativeFunction: "Hỏi và phủ định thì quá khứ",
  prerequisites: ["a1-did-you"],
  targetChunks: [
    { text: "did you finish", vi: "bạn xong chưa" },
    { text: "i didn't see", vi: "tôi không thấy" },
    { text: "it wasn't", vi: "nó không phải" },
    { text: "i was working", vi: "lúc đó tôi đang làm" },
  ],
  grammarFeatures: ["past interrogative", "past negative", "past progressive"],
  // CEFR-J A2.1: past interrogative and negative, past of be negative,
  // past progressive.
  grammarCodes: [
    "TA.PAST.do.INT.AFF",
    "TA.PAST.do.NEG",
    "TA.PAST.be.NEG",
    "TA.PASTPRG.AFF",
  ],
  inputScenes: [
    { id: "a2q-finish", speaker: "Mai", text: "Did you finish the report?", vi: "Bạn làm xong báo cáo chưa?" },
    { id: "a2q-didnt", speaker: "Tom", text: "I didn't see the message.", vi: "Tôi không thấy tin nhắn." },
    { id: "a2q-wasnt", speaker: "Mai", text: "It wasn't ready yesterday.", vi: "Hôm qua nó chưa xong." },
    { id: "a2q-working", speaker: "Tom", text: "I was working on something else.", vi: "Lúc đó tôi đang làm việc khác." },
  ],
  activities: [
    { id: "a2q-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Việc gì đã không xảy ra?", targets: ["i didn't see", "it wasn't"], supportAllowed: true },
    { id: "a2q-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["did you finish"], supportAllowed: false },
    { id: "a2q-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["i was working"], supportAllowed: false },
    { id: "a2q-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi không thấy”.", targets: ["i didn't see"], supportAllowed: false },
    { id: "a2q-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Có người hỏi sao hôm qua bạn không trả lời. Giải thích hai câu.", targets: ["i didn't see", "i was working"], supportAllowed: false },
    { id: "a2q-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết câu hỏi tiếng Anh nghĩa là “bạn xong chưa”.", targets: ["did you finish"], supportAllowed: false },
    { id: "a2q-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu về hôm qua, nhanh dần.", targets: ["did you finish", "i didn't see", "i was working"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "did you finish", independent: true, changedContext: true, delayed: true },
    { chunk: "i didn't see", independent: true, changedContext: true, delayed: false },
  ],
};

export const A2_WHAT_HAPPENS_NEXT: FoundationUnit = {
  id: "a2-what-happens-next",
  cefr: "A2",
  canDo: {
    vi: "Nói việc sắp làm, và việc đã làm xong tính tới giờ.",
    en: "Can say what will happen, and what has been done so far.",
  },
  communicativeFunction: "Tương lai và hiện tại hoàn thành",
  prerequisites: ["a2-yesterday-questions"],
  targetChunks: [
    { text: "i will send", vi: "tôi sẽ gửi" },
    { text: "i'm going to", vi: "tôi định" },
    { text: "i have finished", vi: "tôi đã xong" },
    { text: "i have to", vi: "tôi phải" },
  ],
  grammarFeatures: ["future", "will", "be going to", "present perfect", "have to"],
  // CEFR-J: future and present perfect (A2.1); will, be going to, have to (A2.2).
  grammarCodes: [
    "TA.FUT.AFF",
    "TA.PRPF.AFF",
    "MD.will.AFF",
    "MD.be_going_to.AFF",
    "MD.have_to.AFF",
  ],
  inputScenes: [
    { id: "a2f-will", speaker: "Mai", text: "I will send it this evening.", vi: "Tối nay tôi sẽ gửi." },
    { id: "a2f-going", speaker: "Tom", text: "I'm going to check it first.", vi: "Tôi định kiểm tra trước đã." },
    { id: "a2f-perfect", speaker: "Mai", text: "I have finished the first part.", vi: "Tôi đã xong phần đầu." },
    { id: "a2f-haveto", speaker: "Tom", text: "I have to leave at five.", vi: "Năm giờ tôi phải đi." },
  ],
  activities: [
    { id: "a2f-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Việc gì sắp làm, việc gì đã xong?", targets: ["i will send", "i have finished"], supportAllowed: true },
    { id: "a2f-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["i will send"], supportAllowed: false },
    { id: "a2f-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["i'm going to"], supportAllowed: false },
    { id: "a2f-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi đã xong”.", targets: ["i have finished"], supportAllowed: false },
    { id: "a2f-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Họp cuối ngày: nói bạn đã xong gì và sắp làm gì. Ba câu.", targets: ["i have finished", "i will send", "i'm going to"], supportAllowed: false },
    { id: "a2f-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “tôi phải”.", targets: ["i have to"], supportAllowed: false },
    { id: "a2f-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu về kế hoạch, nhanh dần.", targets: ["i will send", "i'm going to", "i have to"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "i have finished", independent: true, changedContext: true, delayed: true },
    { chunk: "i will send", independent: true, changedContext: true, delayed: false },
  ],
};

export const A2_POLITE: FoundationUnit = {
  id: "a2-polite",
  cefr: "A2",
  canDo: {
    vi: "Đề nghị và nhờ vả một cách lịch sự.",
    en: "Can advise and request politely.",
  },
  communicativeFunction: "Lịch sự và đề nghị",
  prerequisites: ["a2-what-happens-next"],
  targetChunks: [
    { text: "you should", vi: "bạn nên" },
    { text: "i would", vi: "tôi sẽ (lịch sự)" },
    { text: "can you check", vi: "bạn kiểm tra giúp được không" },
    { text: "have a look", vi: "xem qua một chút" },
  ],
  grammarFeatures: ["should", "would", "Can you ...?", "phrasal verb V+NP+particle"],
  // CEFR-J A2.1: should, would, functional Can you, V+NP+particle.
  grammarCodes: ["MD.should.AFF", "MD.would.AFF", "INTF.can_you", "PHV.V_NP_PART"],
  inputScenes: [
    { id: "a2p-should", speaker: "Mai", text: "You should read it first.", vi: "Bạn nên đọc trước đã." },
    { id: "a2p-would", speaker: "Tom", text: "I would start with the small one.", vi: "Tôi thì sẽ bắt đầu từ cái nhỏ." },
    { id: "a2p-can", speaker: "Mai", text: "Can you check this for me?", vi: "Bạn kiểm tra giúp tôi cái này được không?" },
    { id: "a2p-look", speaker: "Tom", text: "Have a look and turn it off.", vi: "Xem qua rồi tắt nó đi." },
  ],
  activities: [
    { id: "a2p-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Họ khuyên nhau điều gì?", targets: ["you should", "i would"], supportAllowed: true },
    { id: "a2p-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["you should"], supportAllowed: false },
    { id: "a2p-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["have a look"], supportAllowed: false },
    { id: "a2p-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nhờ ai đó kiểm tra giúp, bằng tiếng Anh.", targets: ["can you check"], supportAllowed: false },
    { id: "a2p-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Đồng nghiệp đang kẹt. Khuyên một câu và nhờ một câu.", targets: ["you should", "can you check"], supportAllowed: false },
    { id: "a2p-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “tôi sẽ (lịch sự)”.", targets: ["i would"], supportAllowed: false },
    { id: "a2p-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu khuyên và nhờ, nhanh dần.", targets: ["you should", "can you check", "have a look"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "you should", independent: true, changedContext: true, delayed: true },
    { chunk: "can you check", independent: true, changedContext: true, delayed: false },
  ],
};
