import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * The third batch, written against the gaps the content check named.
 *
 * The order is the profile's own, not a guess: `pnpm curriculum --next` prints
 * what is still owed in CEFR-J teaching order, and these four units take the
 * top of that list. That is the whole point of having the check — an author
 * stops deciding what feels important and answers what is actually missing.
 */

export const A1_JOINING_IDEAS: FoundationUnit = {
  id: "a1-joining-ideas",
  cefr: "A1",
  canDo: {
    vi: "Nối hai ý thành một câu thay vì nói hai câu rời.",
    en: "Can join two ideas into one sentence instead of two separate ones.",
  },
  communicativeFunction: "Nối ý",
  prerequisites: ["a1-how-often"],
  targetChunks: [
    { text: "and", vi: "và" },
    { text: "but", vi: "nhưng" },
    { text: "or", vi: "hoặc" },
    { text: "so", vi: "nên, vậy nên" },
  ],
  grammarFeatures: ["coordinating conjunctions"],
  // CEFR-J A1.1: coordinating conjunctions.
  grammarCodes: ["CC"],
  inputScenes: [
    { id: "join-and", speaker: "Mai", text: "I read the file and I sent it.", vi: "Tôi đọc file và tôi gửi đi rồi." },
    { id: "join-but", speaker: "Tom", text: "It is ready but it is late.", vi: "Nó xong rồi nhưng muộn." },
    { id: "join-or", speaker: "Mai", text: "We can meet today or tomorrow.", vi: "Ta gặp hôm nay hoặc mai." },
    { id: "join-so", speaker: "Tom", text: "There is a problem so I need help.", vi: "Có vấn đề nên tôi cần giúp." },
  ],
  activities: [
    { id: "join-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Hai ý nào được nối với nhau?", targets: ["and", "but"], supportAllowed: true },
    { id: "join-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["but"], supportAllowed: false },
    { id: "join-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["so"], supportAllowed: false },
    { id: "join-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói từ tiếng Anh nghĩa là “hoặc”.", targets: ["or"], supportAllowed: false },
    { id: "join-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Nói ba câu về hôm nay, mỗi câu nối hai ý.", targets: ["and", "but", "so"], supportAllowed: false },
    { id: "join-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết từ tiếng Anh nghĩa là “nhưng”.", targets: ["but"], supportAllowed: false },
    { id: "join-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu nối ý, nhanh dần.", targets: ["and", "but", "or", "so"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "but", independent: true, changedContext: true, delayed: false },
    { chunk: "so", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_COMPARING: FoundationUnit = {
  id: "a1-comparing",
  cefr: "A1",
  canDo: {
    vi: "So sánh hai thứ, và nói cái nào nhất.",
    en: "Can compare two things, and say which is the most.",
  },
  communicativeFunction: "So sánh",
  prerequisites: ["a1-joining-ideas"],
  targetChunks: [
    { text: "faster", vi: "nhanh hơn" },
    { text: "harder", vi: "khó hơn" },
    { text: "the fastest", vi: "nhanh nhất" },
    { text: "than", vi: "hơn (trong so sánh)" },
  ],
  grammarFeatures: ["comparative -er", "superlative -est"],
  // CEFR-J: superlative (A1.1), comparative (A1.3).
  grammarCodes: ["COMP.JJS.RBS.est", "COMP.JJR.RBR.er"],
  inputScenes: [
    { id: "cmp-faster", speaker: "Mai", text: "This one is faster than the old one.", vi: "Cái này nhanh hơn cái cũ." },
    { id: "cmp-harder", speaker: "Tom", text: "The second part is harder.", vi: "Phần hai khó hơn." },
    { id: "cmp-fastest", speaker: "Mai", text: "This is the fastest way.", vi: "Đây là cách nhanh nhất." },
  ],
  activities: [
    { id: "cmp-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Cái nào nhanh hơn?", targets: ["faster", "than"], supportAllowed: true },
    { id: "cmp-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["faster"], supportAllowed: false },
    { id: "cmp-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["the fastest"], supportAllowed: false },
    { id: "cmp-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói từ tiếng Anh nghĩa là “khó hơn”.", targets: ["harder"], supportAllowed: false },
    { id: "cmp-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "So sánh hai công cụ bạn dùng trong công việc. Hai câu.", targets: ["faster", "than", "harder"], supportAllowed: false },
    { id: "cmp-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “nhanh nhất”.", targets: ["the fastest"], supportAllowed: false },
    { id: "cmp-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu so sánh, nhanh dần.", targets: ["faster", "harder", "the fastest"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "faster", independent: true, changedContext: true, delayed: false },
    { chunk: "the fastest", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_HOW_MUCH: FoundationUnit = {
  id: "a1-how-much",
  cefr: "A1",
  canDo: {
    vi: "Hỏi bao nhiêu, bao lâu, và rủ cùng làm.",
    en: "Can ask how much and how long, and suggest doing something together.",
  },
  communicativeFunction: "Hỏi mức độ và rủ rê",
  prerequisites: ["a1-comparing"],
  targetChunks: [
    { text: "how long", vi: "bao lâu" },
    { text: "how many", vi: "bao nhiêu (đếm được)" },
    { text: "let's", vi: "chúng ta hãy" },
    { text: "let's start", vi: "bắt đầu thôi" },
  ],
  grammarFeatures: ["How ADJ/ADV questions", "let's"],
  // CEFR-J: How ADJ/ADV (A1.1), let's (A1.3).
  grammarCodes: ["INT.how_JJ.RB", "IMP.let's_V.AFF"],
  inputScenes: [
    { id: "how-long", speaker: "Mai", text: "How long does it take?", vi: "Mất bao lâu?" },
    { id: "how-many", speaker: "Tom", text: "How many people are here?", vi: "Có bao nhiêu người ở đây?" },
    { id: "lets-start", speaker: "Mai", text: "Let's start.", vi: "Bắt đầu thôi." },
    { id: "lets-meet", speaker: "Tom", text: "Let's meet tomorrow.", vi: "Mai gặp nhé." },
  ],
  activities: [
    { id: "how-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Người này hỏi những gì?", targets: ["how long", "how many"], supportAllowed: true },
    { id: "how-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["how long"], supportAllowed: false },
    { id: "how-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["let's start"], supportAllowed: false },
    { id: "how-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Hỏi bằng tiếng Anh xem việc mất bao lâu.", targets: ["how long"], supportAllowed: false },
    { id: "how-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Bắt đầu một cuộc họp nhanh: rủ mọi người vào việc, rồi hỏi hai câu.", targets: ["let's", "how long", "how many"], supportAllowed: false },
    { id: "how-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “bao nhiêu (đếm được)”.", targets: ["how many"], supportAllowed: false },
    { id: "how-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu hỏi và rủ, nhanh dần.", targets: ["how long", "how many", "let's"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "how long", independent: true, changedContext: true, delayed: true },
    { chunk: "let's", independent: true, changedContext: false, delayed: false },
  ],
};

export const A1_DOING_NOW: FoundationUnit = {
  id: "a1-doing-now",
  cefr: "A1",
  canDo: {
    vi: "Nói việc đang làm, và nói mình thích làm gì.",
    en: "Can say what they are doing, and what they like doing.",
  },
  communicativeFunction: "Việc đang diễn ra",
  prerequisites: ["a1-how-much"],
  targetChunks: [
    { text: "working", vi: "đang làm việc" },
    { text: "i like reading", vi: "tôi thích đọc" },
    { text: "before starting", vi: "trước khi bắt đầu" },
    { text: "keep going", vi: "cứ tiếp tục" },
  ],
  grammarFeatures: ["V-ing", "verb + V-ing", "prep + V-ing", "phrasal verb"],
  // CEFR-J: V-ing (A1.1), verb V-ing (A1.2), prep+V-ing (A1.3), phrasal verb (A1.1).
  grammarCodes: ["VG", "VG.VV_VG", "VG.PREP_VG", "PHV.V_PART"],
  inputScenes: [
    { id: "ing-working", speaker: "Mai", text: "I am working on it now.", vi: "Tôi đang làm việc đó." },
    { id: "ing-like", speaker: "Tom", text: "I like reading the documentation.", vi: "Tôi thích đọc tài liệu." },
    { id: "ing-before", speaker: "Mai", text: "Read it before starting.", vi: "Đọc trước khi bắt đầu." },
    { id: "ing-keep", speaker: "Tom", text: "Keep going, it is nearly done.", vi: "Cứ tiếp tục, gần xong rồi." },
  ],
  activities: [
    { id: "ing-listen", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe cả đoạn. Ai đang làm gì?", targets: ["working", "i like reading"], supportAllowed: true },
    { id: "ing-listen-write", strand: "meaning_focused_input", skill: "listening", promptVi: "Nghe rồi gõ lại đúng phần bạn nghe được. Không nhìn chữ.", targets: ["working"], supportAllowed: false },
    { id: "ing-read", strand: "meaning_focused_input", skill: "reading", promptVi: "Đọc câu tiếng Anh dưới đây. Nó nghĩa là gì?", targets: ["keep going"], supportAllowed: false },
    { id: "ing-recall", strand: "language_focused", skill: "speaking", promptVi: "Không nhìn chữ. Nói câu tiếng Anh nghĩa là “tôi thích đọc”.", targets: ["i like reading"], supportAllowed: false },
    { id: "ing-use", strand: "meaning_focused_output", skill: "speaking", promptVi: "Ai đó hỏi bạn đang làm gì. Trả lời hai câu.", targets: ["working", "i like reading"], supportAllowed: false },
    { id: "ing-write", strand: "meaning_focused_output", skill: "writing", promptVi: "Viết cụm tiếng Anh nghĩa là “trước khi bắt đầu”.", targets: ["before starting"], supportAllowed: false },
    { id: "ing-fluency", strand: "fluency_development", skill: "speaking", promptVi: "Nói bốn câu về việc đang làm, nhanh dần.", targets: ["working", "keep going", "i like reading"], supportAllowed: true },
  ],
  evidenceCriteria: [
    { chunk: "working", independent: true, changedContext: true, delayed: false },
    { chunk: "i like reading", independent: true, changedContext: true, delayed: true },
  ],
};
