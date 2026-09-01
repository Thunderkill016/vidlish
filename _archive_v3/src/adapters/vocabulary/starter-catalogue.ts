import type { VocabularyEntry } from "@/modules/learning/application/select-next-vocabulary";

/**
 * The reviewed first footholds for a Vietnamese adult starting at A0.
 *
 * Each item either arrives alone because no honest i+1 sentence can exist yet,
 * or carries three authored sentences that add only that item to the words
 * introduced before it. This keeps the first thirty items offline, inspectable
 * and independent of a model/provider.
 */

export const STARTER_CATALOGUE_PROVENANCE =
  "Nếp Starter Catalogue v0.2 — authored and reviewed for the A0 path";

/**
 * Gemini generates these fixed A0 prompts only after the catalogue has been
 * reviewed. The browser voice stays available for an outage, but it is never
 * presented as equivalent source audio: its voice differs by device.
 */
export const STARTER_AUDIO_PROVENANCE = {
  kind: "gemini_tts_source_with_browser_fallback",
  locale: "en-US",
  status: "source_audio_when_available",
  learnerNoticeVi:
    "Nếp ưu tiên giọng AI tạo riêng từ văn bản A0 đã kiểm duyệt. Nếu không tải được, Nếp dùng giọng thiết bị làm phương án nghe thử; hai loại giọng này không được xem là như nhau.",
} as const;

export type StarterChoice = {
  readonly id: string;
  readonly textVi: string;
};

/** A meaning attempt that happens before the English form is shown. */
export type StarterRecognition = {
  readonly promptVi: string;
  readonly options: readonly StarterChoice[];
  readonly correctOptionId: string;
  readonly correctFeedbackVi: string;
  readonly incorrectFeedbackVi: string;
};

/**
 * A bounded changed-context use task. At A0 we ask for a spoken attempt then
 * show the model answer; it is practice, not a claim that speech was scored.
 */
export type StarterTransfer = {
  readonly situationVi: string;
  readonly promptVi: string;
  readonly expectedText: string;
  readonly expectedMeaningVi: string;
  readonly feedbackVi: string;
  /**
   * Omitted means this transfer may appear as soon as the target is introduced.
   * Function words such as `a` wait for the first useful phrase that contains
   * them, instead of forcing an unteachable standalone response.
   */
  readonly unlockAfterOrder?: number;
};

export type StarterLearningAsset = {
  /** A concrete scene for the first encounter, never just a dictionary gloss. */
  readonly microContextVi: string;
  readonly recognition: StarterRecognition;
  /** The cue may not contain the English form that the learner must retrieve. */
  readonly recallPromptVi: string;
  readonly transfer: StarterTransfer;
  readonly audio: typeof STARTER_AUDIO_PROVENANCE;
};

export type StarterSentence = {
  readonly text: string;
  readonly vi: string;
};

export type StarterItem = VocabularyEntry & {
  readonly curriculumOrder: number;
  readonly displayText: string;
  readonly meaningVi: string;
  readonly canDoVi: string;
  readonly pronunciationHintVi: string;
  /**
   * These items have no honest sentence using only earlier language. They are
   * introduced through audio, meaning and controlled imitation first.
   */
  readonly introduceOnItsOwn: boolean;
  readonly sentences: readonly StarterSentence[];
  readonly learningAsset: StarterLearningAsset;
};

/**
 * A0 cannot honestly be a stream of unrelated dictionary entries. These units
 * make the communicative job visible while keeping the item-level i+1 order
 * that the runtime needs. A checkpoint is guided practice, never a mastery or
 * pronunciation score.
 */
export type StarterLessonCheckpoint = {
  readonly situationVi: string;
  readonly promptVi: string;
  readonly expectedText: string;
  readonly expectedMeaningVi: string;
  readonly feedbackVi: string;
  /**
   * An immediate listening check for a completed lesson. It deliberately
   * comes before the English model is shown, so the learner can distinguish
   * "I recognised it just now" from merely rereading the answer.
   */
  readonly recognition?: StarterRecognition;
};

export type StarterLesson = {
  readonly id: string;
  readonly order: number;
  readonly titleVi: string;
  readonly canDoVi: string;
  readonly firstItemOrder: number;
  readonly lastItemOrder: number;
  readonly checkpoint: StarterLessonCheckpoint;
};

export type StarterLessonProgress = {
  readonly lesson: StarterLesson;
  /** One-based position, so it can be shown to a learner without conversion. */
  readonly itemPosition: number;
  readonly itemCount: number;
  readonly isFinalItem: boolean;
};

export const STARTER_LESSONS: readonly StarterLesson[] = [
  {
    id: "first-contact",
    order: 1,
    titleVi: "Gặp mặt lần đầu",
    canDoVi: "Chào một người và báo rằng mình đang có mặt.",
    firstItemOrder: 1,
    lastItemOrder: 4,
    checkpoint: {
      situationVi: "Bạn vừa vào một cuộc gọi nhỏ và muốn chào mọi người trước khi bắt đầu.",
      promptVi: "Không nhìn mẫu, hãy chào và nói rằng bạn đang có mặt.",
      expectedText: "Hello. I am here.",
      expectedMeaningVi: "Xin chào. Tôi ở đây.",
      feedbackVi:
        "Bạn vừa ghép lời chào với một thông tin rất ngắn về bản thân. Đây là thực hành có hướng dẫn, chưa phải điểm nói.",
      recognition: {
        promptVi: "Sau khi nghe, người đó đang làm gì?",
        options: [
          { id: "greeting-and-presence", textVi: "Chào và báo rằng mình đang có mặt" },
          { id: "asking-for-help", textVi: "Nhờ người khác giúp mình" },
          { id: "ending-a-call", textVi: "Chào tạm biệt để kết thúc cuộc gọi" },
        ],
        correctOptionId: "greeting-and-presence",
        correctFeedbackVi:
          "Đúng. Bạn vừa nhận ra cả lời chào lẫn ý “tôi ở đây” khi chỉ nghe âm thanh.",
        incorrectFeedbackVi:
          "Chưa đúng. Nghe lại cả câu, rồi chú ý xem người đó mới vào hay đang kết thúc cuộc gọi.",
      },
    },
  },
  {
    id: "seeing-each-other",
    order: 2,
    titleVi: "Nhìn thấy người đối diện",
    canDoVi: "Nói rằng mình nhìn thấy người đối diện trong một cuộc gặp ngắn.",
    firstItemOrder: 5,
    lastItemOrder: 6,
    checkpoint: {
      situationVi: "Bạn vừa gặp lại một người bạn khi cánh cửa mở ra.",
      promptVi: "Không nhìn mẫu, hãy nói rằng bạn nhìn thấy họ.",
      expectedText: "I see you.",
      expectedMeaningVi: "Tôi thấy bạn.",
      feedbackVi:
        "Bạn vừa dùng câu ngắn để xác nhận mình đã nhìn thấy người đối diện. Câu này sẽ quay lại ở tình huống khác.",
    },
  },
  {
    id: "short-responses",
    order: 3,
    titleVi: "Phản hồi ngắn và cảm xúc",
    canDoVi: "Trả lời có/không và nói đơn giản mình đang thế nào.",
    firstItemOrder: 7,
    lastItemOrder: 14,
    checkpoint: {
      situationVi: "Một đồng nghiệp hỏi bạn có ổn không sau khi cuộc gọi bắt đầu.",
      promptVi: "Không nhìn mẫu, hãy trả lời đồng ý và nói rằng bạn ổn.",
      expectedText: "Yes. I am good.",
      expectedMeaningVi: "Vâng. Tôi ổn.",
      feedbackVi:
        "Câu này cho phép bạn phản hồi và nói trạng thái của mình. Hãy quay lại nó ở buổi ôn sau để kiểm tra trí nhớ.",
    },
  },
  {
    id: "objects-and-identity",
    order: 4,
    titleVi: "Chỉ và gọi một đồ vật",
    canDoVi: "Chỉ một thứ gần mình và gọi tên nó bằng câu ngắn.",
    firstItemOrder: 15,
    lastItemOrder: 23,
    checkpoint: {
      situationVi: "Bạn đang cầm một quyển sách và muốn cho người đối diện biết đó là gì.",
      promptVi: "Không nhìn mẫu, hãy chỉ quyển sách ở gần bạn và gọi tên nó.",
      expectedText: "This is a book.",
      expectedMeaningVi: "Đây là một quyển sách.",
      feedbackVi:
        "Bạn đang dùng một mẫu câu để chỉ và giới thiệu đồ vật. Mẫu này sẽ quay lại với đồ vật khác, không chỉ với book.",
    },
  },
  {
    id: "needs-and-politeness",
    order: 5,
    titleVi: "Nhu cầu và phép lịch sự",
    canDoVi: "Yêu cầu sự giúp đỡ bằng một câu lịch sự ngắn.",
    firstItemOrder: 24,
    lastItemOrder: 30,
    checkpoint: {
      situationVi: "Bạn không biết phải làm bước tiếp theo trong một cuộc gọi và cần nhờ người kia giúp.",
      promptVi: "Không nhìn mẫu, hãy nhờ giúp một cách lịch sự.",
      expectedText: "Please help me.",
      expectedMeaningVi: "Làm ơn giúp tôi.",
      feedbackVi:
        "Đây là yêu cầu ngắn, lịch sự và có thể dùng trong nhiều tình huống. Nó cần được kiểm tra lại ở ngữ cảnh mới hơn trước khi gọi là dùng được.",
    },
  },
];

const STARTER_RECOGNITION_FEEDBACK = {
  correct: "Đúng. Giờ mới mở chữ để nối âm, nghĩa và cách viết với nhau.",
  incorrect:
    "Chưa đúng. Nghe lại, nghĩ về cảnh vừa gặp, rồi chọn lại trước khi xem chữ.",
} as const;

function choices(
  correct: string,
  firstDistractor: string,
  secondDistractor: string,
): readonly StarterChoice[] {
  return [
    { id: "answer", textVi: correct },
    { id: "other_1", textVi: firstDistractor },
    { id: "other_2", textVi: secondDistractor },
  ];
}

function starterAsset(input: {
  readonly microContextVi: string;
  readonly meaning: string;
  readonly distractors: readonly [string, string];
  readonly recallPromptVi: string;
  readonly transferSituationVi: string;
  readonly transferPromptVi: string;
  readonly expectedText: string;
  readonly expectedMeaningVi: string;
  readonly feedbackVi: string;
  readonly transferUnlockAfterOrder?: number;
}): StarterLearningAsset {
  return {
    microContextVi: input.microContextVi,
    recognition: {
      promptVi: "Âm vừa nghe hợp với ý nào nhất?",
      options: choices(input.meaning, ...input.distractors),
      correctOptionId: "answer",
      correctFeedbackVi: STARTER_RECOGNITION_FEEDBACK.correct,
      incorrectFeedbackVi: STARTER_RECOGNITION_FEEDBACK.incorrect,
    },
    recallPromptVi: input.recallPromptVi,
    transfer: {
      situationVi: input.transferSituationVi,
      promptVi: input.transferPromptVi,
      expectedText: input.expectedText,
      expectedMeaningVi: input.expectedMeaningVi,
      feedbackVi: input.feedbackVi,
      ...(input.transferUnlockAfterOrder === undefined
        ? {}
        : { unlockAfterOrder: input.transferUnlockAfterOrder }),
    },
    audio: STARTER_AUDIO_PROVENANCE,
  };
}

/**
 * The actual A0 lesson material. Keeping it beside the vocabulary order makes
 * a missing scene, recognition attempt, recall cue or transfer prompt fail
 * deterministically instead of falling back to a generic flashcard.
 */
const STARTER_LEARNING_ASSETS: Readonly<Record<string, StarterLearningAsset>> = {
  hello: starterAsset({
    microContextVi: "Bạn vừa vào một cuộc gọi và thấy một người chưa quen đang chờ.",
    meaning: "xin chào",
    distractors: ["tạm biệt", "xin lỗi"],
    recallPromptVi: "Không nhìn chữ, thử nói lời đầu tiên khi bắt đầu gặp một người.",
    transferSituationVi: "Sáng hôm sau, bạn gặp một đồng nghiệp mới ở cửa thang máy.",
    transferPromptVi: "Không nhìn mẫu, hãy chào người đó bằng một tiếng Anh ngắn.",
    expectedText: "Hello.",
    expectedMeaningVi: "Xin chào.",
    feedbackVi: "Đây là lời chào trung tính để mở một cuộc gặp ngắn.",
  }),
  i: starterAsset({
    microContextVi: "Bạn chỉ vào mình khi người khác đang nhìn hai người trong cuộc gọi.",
    meaning: "tôi / mình",
    distractors: ["bạn", "nó"],
    recallPromptVi: "Không nhìn chữ, nói từ dùng để nhắc đến chính mình.",
    transferSituationVi: "Bạn muốn phân biệt mình với người đang ngồi cạnh trong một bức ảnh.",
    transferPromptVi: "Không nhìn mẫu, hãy nói từ chỉ chính bạn.",
    expectedText: "I.",
    expectedMeaningVi: "Tôi / mình.",
    feedbackVi: "Từ này luôn viết hoa khi đứng một mình trong tiếng Anh.",
  }),
  am: starterAsset({
    microContextVi: "Bạn đã biết từ chỉ mình và chuẩn bị nói một điều rất ngắn về bản thân.",
    meaning: "là / đang; đi với I",
    distractors: ["là / đang; đi với you", "muốn"],
    recallPromptVi: "Không nhìn chữ, nói từ đứng sau I khi bạn nói về mình ở hiện tại.",
    transferSituationVi: "Bạn đang điểm danh trong một phòng học trực tuyến.",
    transferPromptVi: "Nói cụm hai từ mở đầu để nói bạn đang có mặt.",
    expectedText: "I am.",
    expectedMeaningVi: "Tôi là / tôi đang.",
    feedbackVi: "Cụm này mở đầu cho thông tin về chính bạn.",
  }),
  here: starterAsset({
    microContextVi: "Người chủ trì gọi tên bạn trong cuộc họp, và bạn muốn báo rằng mình có mặt.",
    meaning: "ở đây",
    distractors: ["ở xa", "vui"],
    recallPromptVi: "Không nhìn chữ, nói câu ngắn để báo bạn đang có mặt.",
    transferSituationVi: "Bạn bè đang tìm bạn ở quán và vừa nhìn thấy bạn.",
    transferPromptVi: "Hãy nói câu ngắn để cho họ biết vị trí của bạn.",
    expectedText: "I am here.",
    expectedMeaningVi: "Tôi ở đây.",
    feedbackVi: "Dùng câu này khi vị trí hiện tại là điều quan trọng.",
  }),
  you: starterAsset({
    microContextVi: "Bạn đang nhìn trực tiếp vào người đối diện và muốn nói về họ.",
    meaning: "bạn",
    distractors: ["tôi / mình", "của tôi"],
    recallPromptVi: "Không nhìn chữ, nói từ chỉ người đối diện.",
    transferSituationVi: "Bạn đang chọn giữa việc nói về mình và nói với người trước mặt.",
    transferPromptVi: "Hãy nói từ dùng cho người trước mặt.",
    expectedText: "You.",
    expectedMeaningVi: "Bạn.",
    feedbackVi: "Tiếng Anh dùng cùng một từ này cho một người hoặc nhiều người nghe.",
  }),
  see: starterAsset({
    microContextVi: "Trong cuộc gọi, cuối cùng hình của người đối diện đã hiện lên màn hình.",
    meaning: "thấy / nhìn thấy",
    distractors: ["muốn", "thích"],
    recallPromptVi: "Không nhìn chữ, nói câu ngắn để báo bạn nhìn thấy người đối diện.",
    transferSituationVi: "Bạn gặp lại người bạn ở xa khi cửa mở ra.",
    transferPromptVi: "Hãy nói câu ngắn để cho họ biết bạn nhìn thấy họ.",
    expectedText: "I see you.",
    expectedMeaningVi: "Tôi thấy bạn.",
    feedbackVi: "Câu này dùng khi bạn đã nhìn thấy người đang nói với mình.",
  }),
  yes: starterAsset({
    microContextVi: "Người kia hỏi bạn có nghe rõ họ không, và câu trả lời là có.",
    meaning: "có / vâng",
    distractors: ["không", "xin lỗi"],
    recallPromptVi: "Không nhìn chữ, nói câu trả lời đồng ý ngắn nhất.",
    transferSituationVi: "Một đồng nghiệp hỏi bạn đã sẵn sàng chưa.",
    transferPromptVi: "Hãy trả lời đồng ý bằng một tiếng Anh ngắn.",
    expectedText: "Yes.",
    expectedMeaningVi: "Có / vâng.",
    feedbackVi: "Có thể dùng từ này một mình khi câu hỏi đã rõ.",
  }),
  me: starterAsset({
    microContextVi: "Người đối diện đang nhìn vào bạn và muốn xác nhận họ thấy đúng người.",
    meaning: "tôi / mình (sau động từ)",
    distractors: ["bạn", "của tôi"],
    recallPromptVi: "Không nhìn chữ, nói câu để xác nhận người kia đang thấy bạn.",
    transferSituationVi: "Bạn xuất hiện trong ảnh nhóm và bạn bè nói họ nhận ra bạn.",
    transferPromptVi: "Hãy nói câu ngắn xác nhận họ đang nhìn thấy bạn.",
    expectedText: "You see me.",
    expectedMeaningVi: "Bạn thấy tôi.",
    feedbackVi: "Dạng này đứng sau động từ, khác với từ mở đầu câu nói về bản thân.",
  }),
  no: starterAsset({
    microContextVi: "Người kia hỏi âm thanh có rõ không, nhưng bạn vẫn chưa nghe được.",
    meaning: "không",
    distractors: ["có / vâng", "cảm ơn"],
    recallPromptVi: "Không nhìn chữ, nói câu trả lời phủ định ngắn nhất.",
    transferSituationVi: "Bạn được hỏi có nhìn thấy màn hình chưa, nhưng chưa thấy.",
    transferPromptVi: "Hãy trả lời phủ định bằng một tiếng Anh ngắn.",
    expectedText: "No.",
    expectedMeaningVi: "Không.",
    feedbackVi: "Từ này trả lời một câu hỏi có/không khi điều đúng là phủ định.",
  }),
  are: starterAsset({
    microContextVi: "Bạn thấy người kia đã vào cuộc gọi và muốn xác nhận họ có mặt.",
    meaning: "là / đang; đi với you",
    distractors: ["là / đang; đi với I", "ở đây"],
    recallPromptVi: "Không nhìn chữ, nói câu ngắn xác nhận người đối diện đang có mặt.",
    transferSituationVi: "Bạn bè vừa xuất hiện ở điểm hẹn sau khi bạn đã chờ.",
    transferPromptVi: "Hãy nói câu xác nhận họ đã ở đó.",
    expectedText: "You are here.",
    expectedMeaningVi: "Bạn ở đây.",
    feedbackVi: "Sau you, dùng dạng này để nói về hiện tại.",
  }),
  good: starterAsset({
    microContextVi: "Người đối diện hỏi tình hình của bạn, và bạn đang ổn.",
    meaning: "tốt / ổn",
    distractors: ["buồn", "xin lỗi"],
    recallPromptVi: "Không nhìn chữ, trả lời ngắn rằng bạn đang ổn.",
    transferSituationVi: "Sau một buổi làm việc, đồng nghiệp hỏi bạn có ổn không.",
    transferPromptVi: "Hãy nói câu ngắn để cho biết bạn ổn.",
    expectedText: "I am good.",
    expectedMeaningVi: "Tôi ổn.",
    feedbackVi: "Đây là một cách trả lời thông dụng khi nói mình ổn.",
  }),
  okay: starterAsset({
    microContextVi: "Bạn nghe được đề nghị thay đổi lịch và thấy việc đó được.",
    meaning: "ổn / được",
    distractors: ["không", "muốn"],
    recallPromptVi: "Không nhìn chữ, nói câu ngắn rằng mọi việc vẫn ổn.",
    transferSituationVi: "Người kia hỏi bạn có ổn với một lựa chọn vừa nói không.",
    transferPromptVi: "Hãy đáp ngắn rằng bạn ổn.",
    expectedText: "I am okay.",
    expectedMeaningVi: "Tôi ổn.",
    feedbackVi: "Từ này có sắc thái trung tính, dùng khi không cần nhấn mạnh là rất tốt.",
  }),
  happy: starterAsset({
    microContextVi: "Bạn vừa nhận được tin vui từ một người bạn.",
    meaning: "vui",
    distractors: ["buồn", "xin lỗi"],
    recallPromptVi: "Không nhìn chữ, nói câu ngắn về cảm xúc vui của bạn.",
    transferSituationVi: "Bạn vừa hoàn thành một việc khó và muốn nói cảm xúc của mình.",
    transferPromptVi: "Hãy nói câu ngắn cho biết bạn vui.",
    expectedText: "I am happy.",
    expectedMeaningVi: "Tôi vui.",
    feedbackVi: "Dùng câu này khi cảm xúc vui là điều bạn muốn nói rõ.",
  }),
  sad: starterAsset({
    microContextVi: "Bạn vừa nhận tin không vui và người đối diện hỏi bạn thế nào.",
    meaning: "buồn",
    distractors: ["vui", "tốt / ổn"],
    recallPromptVi: "Không nhìn chữ, nói câu ngắn về cảm xúc buồn của bạn.",
    transferSituationVi: "Bạn phải hủy một kế hoạch mình rất thích.",
    transferPromptVi: "Hãy nói câu ngắn cho biết bạn buồn.",
    expectedText: "I am sad.",
    expectedMeaningVi: "Tôi buồn.",
    feedbackVi: "Câu này nói trực tiếp về cảm xúc hiện tại.",
  }),
  it: starterAsset({
    microContextVi: "Cả hai người đang nhìn vào cùng một đồ vật, nên không cần nhắc lại tên đồ vật.",
    meaning: "nó / việc đó",
    distractors: ["bạn", "của tôi"],
    recallPromptVi: "Không nhìn chữ, nói từ thay cho một đồ vật cả hai người đều đang nhìn.",
    transferSituationVi: "Một chiếc điện thoại trên bàn đã rõ là chiếc nào trong cuộc nói chuyện.",
    transferPromptVi: "Hãy nói từ thay cho chiếc điện thoại đó.",
    expectedText: "It.",
    expectedMeaningVi: "Nó / việc đó.",
    feedbackVi: "Dùng khi vật hoặc việc đang nói tới đã rõ trong ngữ cảnh.",
  }),
  is: starterAsset({
    microContextVi: "Bạn đang chỉ vào ảnh đại diện của mình để xác nhận danh tính.",
    meaning: "là / đang; đi với it, this, that",
    distractors: ["là / đang; đi với I", "muốn"],
    recallPromptVi: "Không nhìn chữ, nói câu xác nhận ảnh đó là bạn.",
    transferSituationVi: "Bạn bè chỉ vào một người trong ảnh và hỏi có phải bạn không.",
    transferPromptVi: "Hãy nói câu ngắn xác nhận đó là bạn.",
    expectedText: "It is me.",
    expectedMeaningVi: "Đó là tôi.",
    feedbackVi: "Dạng này nối một vật hay điều đã rõ với thông tin về nó.",
  }),
  this: starterAsset({
    microContextVi: "Bạn cầm một đồ vật ngay gần tay và muốn chỉ cho người kia xem.",
    meaning: "đây / cái này",
    distractors: ["đó / cái đó", "của tôi"],
    recallPromptVi: "Không nhìn chữ, nói câu để chỉ thứ đang ở gần bạn.",
    transferSituationVi: "Bạn đang cầm thẻ tên của mình để giới thiệu với người đối diện.",
    transferPromptVi: "Hãy nói câu ngắn chỉ thứ ở gần bạn.",
    expectedText: "This is it.",
    expectedMeaningVi: "Đây là nó.",
    feedbackVi: "Dùng từ này cho điều ở gần người nói.",
  }),
  that: starterAsset({
    microContextVi: "Bạn thấy một vật ở phía bên kia phòng và muốn chỉ cho người kia.",
    meaning: "đó / cái đó",
    distractors: ["đây / cái này", "của tôi"],
    recallPromptVi: "Không nhìn chữ, nói câu để chỉ thứ ở xa hơn bạn.",
    transferSituationVi: "Trên màn hình có một nút ở góc xa, và bạn muốn chỉ vào nó.",
    transferPromptVi: "Hãy nói câu ngắn chỉ thứ ở xa hơn.",
    expectedText: "That is it.",
    expectedMeaningVi: "Đó là nó.",
    feedbackVi: "Dùng từ này khi điều được chỉ không ở ngay gần người nói.",
  }),
  my: starterAsset({
    microContextVi: "Bạn cầm đồ của mình và muốn cho người khác biết nó thuộc về bạn.",
    meaning: "của tôi",
    distractors: ["tôi / mình", "bạn"],
    recallPromptVi: "Không nhìn chữ, nói từ đứng trước một đồ vật để nói nó thuộc về bạn.",
    transferSituationVi: "Trong một đống đồ giống nhau, bạn cần nhận chiếc của mình.",
    transferPromptVi: "Hãy nói từ dùng để đánh dấu đồ đó là của bạn.",
    expectedText: "My.",
    expectedMeaningVi: "Của tôi.",
    feedbackVi: "Từ này thường đứng trước tên đồ vật, không đứng một mình để kết thúc ý.",
  }),
  name: starterAsset({
    microContextVi: "Bạn nhìn vào ô giới thiệu bản thân trong một biểu mẫu đơn giản.",
    meaning: "tên",
    distractors: ["sách", "nước"],
    recallPromptVi: "Không nhìn chữ, nói từ gọi phần dùng để giới thiệu tên của một người.",
    transferSituationVi: "Một người mới đưa thẻ giới thiệu và chỉ vào dòng có tên của họ.",
    transferPromptVi: "Hãy nói từ gọi thông tin đó.",
    expectedText: "Name.",
    expectedMeaningVi: "Tên.",
    feedbackVi: "Từ này sẽ được dùng trong lời giới thiệu đầy đủ ở pack sau.",
  }),
  a: starterAsset({
    microContextVi: "Bạn thấy một đồ vật bất kỳ lần đầu trong cuộc nói chuyện.",
    meaning: "một (trước danh từ số ít)",
    distractors: ["của tôi", "đây / cái này"],
    recallPromptVi: "Không nhìn chữ, nói từ rất ngắn đứng trước một đồ vật bất kỳ.",
    transferSituationVi: "Bạn cần nói về một quyển sách bất kỳ, chưa phải quyển sách cụ thể.",
    transferPromptVi: "Hãy nói cụm mở đầu trước từ book.",
    expectedText: "A book.",
    expectedMeaningVi: "Một quyển sách.",
    feedbackVi: "Trong nói tự nhiên, từ này thường rất ngắn và dính vào từ đứng sau.",
    transferUnlockAfterOrder: 22,
  }),
  book: starterAsset({
    microContextVi: "Trên bàn có một quyển sách và bạn muốn chỉ cho người kia xem.",
    meaning: "quyển sách",
    distractors: ["nước", "tên"],
    recallPromptVi: "Không nhìn chữ, nói câu chỉ vào quyển sách gần bạn.",
    transferSituationVi: "Một quyển sách ở đầu kia bàn, không phải quyển bạn đang cầm.",
    transferPromptVi: "Hãy nói câu chỉ vào quyển sách đó.",
    expectedText: "That is a book.",
    expectedMeaningVi: "Đó là một quyển sách.",
    feedbackVi: "Bạn vừa đổi từ chỉ gần sang chỉ xa nhưng vẫn gọi đúng đồ vật.",
  }),
  water: starterAsset({
    microContextVi: "Bạn nhìn thấy cốc nước trên bàn và muốn gọi tên thứ trong cốc.",
    meaning: "nước",
    distractors: ["quyển sách", "giúp đỡ"],
    recallPromptVi: "Không nhìn chữ, nói câu chỉ vào cốc nước ở gần.",
    transferSituationVi: "Bạn đang nhìn thấy nước ở vòi phía bên kia phòng.",
    transferPromptVi: "Hãy nói câu ngắn gọi tên thứ bạn đang thấy.",
    expectedText: "I see water.",
    expectedMeaningVi: "Tôi thấy nước.",
    feedbackVi: "Từ này nói về chất lỏng; thường không cần a ở trước.",
  }),
  want: starterAsset({
    microContextVi: "Bạn khát nước và muốn nói rõ điều mình cần.",
    meaning: "muốn",
    distractors: ["thấy", "thích"],
    recallPromptVi: "Không nhìn chữ, nói câu ngắn để xin thứ bạn đang cần.",
    transferSituationVi: "Bạn muốn mượn một quyển sách thay vì uống nước.",
    transferPromptVi: "Hãy nói câu ngắn về thứ bạn muốn.",
    expectedText: "I want a book.",
    expectedMeaningVi: "Tôi muốn một quyển sách.",
    feedbackVi: "Cấu trúc này đổi được đồ vật ở cuối câu.",
  }),
  help: starterAsset({
    microContextVi: "Bạn đang gặp khó với một việc đơn giản và muốn nhờ người đối diện.",
    meaning: "giúp đỡ",
    distractors: ["cảm ơn", "xin lỗi"],
    recallPromptVi: "Không nhìn chữ, nói lời nhờ giúp ngắn nhất.",
    transferSituationVi: "Bạn không mở được cửa và có người đứng ngay cạnh.",
    transferPromptVi: "Hãy nói lời nhờ giúp trực tiếp.",
    expectedText: "Help me.",
    expectedMeaningVi: "Giúp tôi với.",
    feedbackVi: "Đây là lời nhờ ngắn, sẽ lịch sự hơn khi thêm please ở bước sau.",
  }),
  please: starterAsset({
    microContextVi: "Bạn cần nhờ ai đó giúp nhưng muốn câu nói mềm và lịch sự hơn.",
    meaning: "làm ơn",
    distractors: ["cảm ơn", "tạm biệt"],
    recallPromptVi: "Không nhìn chữ, nói lời nhờ giúp một cách lịch sự.",
    transferSituationVi: "Bạn cần nước trong lúc đang chờ họp và muốn hỏi lịch sự.",
    transferPromptVi: "Hãy nói câu ngắn xin nước có thêm từ lịch sự.",
    expectedText: "Please, I want water.",
    expectedMeaningVi: "Làm ơn, tôi muốn nước.",
    feedbackVi: "Từ lịch sự này có thể đứng đầu hoặc cuối lời nhờ.",
  }),
  thank: starterAsset({
    microContextVi: "Người kia vừa giúp bạn mở cửa và bạn muốn đáp lại.",
    meaning: "cảm ơn",
    distractors: ["xin lỗi", "làm ơn"],
    recallPromptVi: "Không nhìn chữ, nói lời cảm ơn ngắn cho người đối diện.",
    transferSituationVi: "Một đồng nghiệp vừa đưa cho bạn cốc nước bạn đã xin.",
    transferPromptVi: "Hãy nói lời cảm ơn họ.",
    expectedText: "Thank you.",
    expectedMeaningVi: "Cảm ơn bạn.",
    feedbackVi: "Đây là một lời cảm ơn đầy đủ và trung tính.",
  }),
  sorry: starterAsset({
    microContextVi: "Bạn lỡ làm gián đoạn người khác và muốn mở đầu một lời xin lỗi.",
    meaning: "xin lỗi / buồn vì điều gì đó",
    distractors: ["cảm ơn", "tạm biệt"],
    recallPromptVi: "Không nhìn chữ, nói lời xin lỗi ngắn nhất.",
    transferSituationVi: "Bạn đến muộn vào cuộc gọi và cần mở đầu lời nói của mình.",
    transferPromptVi: "Hãy nói lời xin lỗi ngắn.",
    expectedText: "Sorry.",
    expectedMeaningVi: "Xin lỗi.",
    feedbackVi: "Từ này mở đầu một lời xin lỗi; pack sau sẽ thêm lý do khi bạn đã có đủ từ.",
  }),
  bye: starterAsset({
    microContextVi: "Cuộc gọi ngắn đã kết thúc và bạn chuẩn bị rời đi.",
    meaning: "tạm biệt",
    distractors: ["xin chào", "cảm ơn"],
    recallPromptVi: "Không nhìn chữ, nói lời cuối khi kết thúc một cuộc gặp ngắn.",
    transferSituationVi: "Bạn rời thang máy sau khi nói chuyện xong với người quen.",
    transferPromptVi: "Hãy nói lời tạm biệt bằng một tiếng Anh ngắn.",
    expectedText: "Bye.",
    expectedMeaningVi: "Tạm biệt.",
    feedbackVi: "Đây là lời tạm biệt thân mật, phù hợp với một cuộc gặp ngắn.",
  }),
  like: starterAsset({
    microContextVi: "Bạn uống nước và muốn nói rằng mình thích nó.",
    meaning: "thích",
    distractors: ["muốn", "thấy"],
    recallPromptVi: "Không nhìn chữ, nói câu ngắn về thứ bạn thích.",
    transferSituationVi: "Bạn muốn nói cảm tình với người đang nói chuyện cùng mình.",
    transferPromptVi: "Hãy nói câu ngắn cho người đó biết cảm tình của bạn.",
    expectedText: "I like you.",
    expectedMeaningVi: "Tôi thích bạn.",
    feedbackVi: "Cấu trúc này đổi được người hoặc thứ đứng sau nó.",
  }),
};

const authoredItem = (
  item: Omit<StarterItem, "cefr" | "learningAsset"> & {
    readonly cefr?: string;
  },
): StarterItem => {
  const learningAsset = STARTER_LEARNING_ASSETS[item.word];
  if (!learningAsset) {
    throw new Error(`Missing reviewed starter learning asset for ${item.word}`);
  }
  return { ...item, cefr: item.cefr ?? "A1", learningAsset };
};

export const STARTER_CATALOGUE: readonly StarterItem[] = [
  authoredItem({
    curriculumOrder: 1,
    word: "hello",
    displayText: "hello",
    pos: "interjection",
    meaningVi: "xin chào",
    canDoVi: "Chào một người khi bắt đầu gặp.",
    pronunciationHintVi: "Nói nhẹ hai phần: he-llo.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 2,
    word: "i",
    displayText: "I",
    pos: "pronoun",
    meaningVi: "tôi / mình",
    canDoVi: "Nhắc đến chính mình trong một câu ngắn.",
    pronunciationHintVi: "Âm dài như chữ cái i trong tiếng Anh.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 3,
    word: "am",
    displayText: "am",
    pos: "auxiliary",
    meaningVi: "là / đang; đi với I",
    canDoVi: "Bắt đầu nói điều gì đó về bản thân bằng I am.",
    pronunciationHintVi: "Nói ngắn, không đọc thành từng chữ a-m.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 4,
    word: "here",
    displayText: "here",
    pos: "adverb",
    meaningVi: "ở đây",
    canDoVi: "Nói rằng mình đang ở đây.",
    pronunciationHintVi: "Kéo nhẹ âm cuối /r/ nếu bạn nghe được.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "I am here.", vi: "Tôi ở đây." },
      { text: "Hello. I am here.", vi: "Xin chào. Tôi ở đây." },
      { text: "I am here. Hello.", vi: "Tôi ở đây. Xin chào." },
    ],
  }),
  authoredItem({
    curriculumOrder: 5,
    word: "you",
    displayText: "you",
    pos: "pronoun",
    meaningVi: "bạn",
    canDoVi: "Nhắc đến người đối diện trong một câu ngắn.",
    pronunciationHintVi: "Bắt đầu bằng âm y nhẹ, nối liền thành một tiếng.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 6,
    word: "see",
    displayText: "see",
    pos: "verb",
    meaningVi: "thấy / nhìn thấy",
    canDoVi: "Nói rằng mình nhìn thấy một người.",
    pronunciationHintVi: "Âm dài như chữ cái c trong tiếng Anh.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "I see you.", vi: "Tôi thấy bạn." },
      { text: "Hello, I see you.", vi: "Xin chào, tôi thấy bạn." },
      { text: "I see you here.", vi: "Tôi thấy bạn ở đây." },
    ],
  }),
  authoredItem({
    curriculumOrder: 7,
    word: "yes",
    displayText: "yes",
    pos: "interjection",
    meaningVi: "có / vâng",
    canDoVi: "Đồng ý hoặc trả lời có.",
    pronunciationHintVi: "Kết thúc gọn ở âm s.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 8,
    word: "me",
    displayText: "me",
    pos: "pronoun",
    meaningVi: "tôi / mình (sau động từ)",
    canDoVi: "Nhận ra khi người khác nói đến mình.",
    pronunciationHintVi: "Âm dài như chữ cái e trong tiếng Anh.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "You see me.", vi: "Bạn thấy tôi." },
      { text: "You see me here.", vi: "Bạn thấy tôi ở đây." },
      { text: "Yes, you see me.", vi: "Đúng, bạn thấy tôi." },
    ],
  }),
  authoredItem({
    curriculumOrder: 9,
    word: "no",
    displayText: "no",
    pos: "interjection",
    meaningVi: "không",
    canDoVi: "Từ chối hoặc trả lời không.",
    pronunciationHintVi: "Bắt đầu nhẹ, giữ môi tròn ở âm cuối.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 10,
    word: "are",
    displayText: "are",
    pos: "auxiliary",
    meaningVi: "là / đang; đi với you",
    canDoVi: "Nói một điều đơn giản về người đối diện.",
    pronunciationHintVi: "Trong câu thường rất nhẹ, đừng cố đọc từng chữ cái.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "You are here.", vi: "Bạn ở đây." },
      { text: "Hello, you are here.", vi: "Xin chào, bạn ở đây." },
      { text: "Yes, you are here.", vi: "Đúng, bạn ở đây." },
    ],
  }),
  authoredItem({
    curriculumOrder: 11,
    word: "good",
    displayText: "good",
    pos: "adjective",
    meaningVi: "tốt / ổn",
    canDoVi: "Nói rằng mình hoặc người khác đang ổn.",
    pronunciationHintVi: "Âm /u/ ngắn, không kéo dài như food.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "I am good.", vi: "Tôi ổn." },
      { text: "You are good.", vi: "Bạn ổn." },
      { text: "Yes, I am good.", vi: "Đúng, tôi ổn." },
    ],
  }),
  authoredItem({
    curriculumOrder: 12,
    word: "okay",
    displayText: "okay",
    pos: "adjective",
    meaningVi: "ổn / được",
    canDoVi: "Trả lời ngắn rằng mình ổn.",
    pronunciationHintVi: "Nghe như ô-kây; nhấn nhẹ phần kây.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "I am okay.", vi: "Tôi ổn." },
      { text: "You are okay.", vi: "Bạn ổn." },
      { text: "Yes, I am okay.", vi: "Đúng, tôi ổn." },
    ],
  }),
  authoredItem({
    curriculumOrder: 13,
    word: "happy",
    displayText: "happy",
    pos: "adjective",
    meaningVi: "vui",
    canDoVi: "Nói một người đang vui.",
    pronunciationHintVi: "Nhấn phần đầu: HAP-py.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "I am happy.", vi: "Tôi vui." },
      { text: "You are happy.", vi: "Bạn vui." },
      { text: "Yes, I am happy.", vi: "Đúng, tôi vui." },
    ],
  }),
  authoredItem({
    curriculumOrder: 14,
    word: "sad",
    displayText: "sad",
    pos: "adjective",
    meaningVi: "buồn",
    canDoVi: "Nói một người đang buồn.",
    pronunciationHintVi: "Âm a ngắn như trong cat.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "I am sad.", vi: "Tôi buồn." },
      { text: "You are sad.", vi: "Bạn buồn." },
      { text: "No, I am sad.", vi: "Không, tôi buồn." },
    ],
  }),
  authoredItem({
    curriculumOrder: 15,
    word: "it",
    displayText: "it",
    pos: "pronoun",
    meaningVi: "nó / việc đó",
    canDoVi: "Nhắc đến một đồ vật hoặc việc đã rõ trong ngữ cảnh.",
    pronunciationHintVi: "Âm i ngắn, dứt ở t.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 16,
    word: "is",
    displayText: "is",
    pos: "auxiliary",
    meaningVi: "là / đang; đi với it, this, that",
    canDoVi: "Nói một điều đơn giản là ai.",
    pronunciationHintVi: "Trong câu thường nói rất ngắn và nhẹ.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "It is me.", vi: "Đó là tôi." },
      { text: "It is you.", vi: "Đó là bạn." },
      { text: "Yes, it is me.", vi: "Đúng, đó là tôi." },
    ],
  }),
  authoredItem({
    curriculumOrder: 17,
    word: "this",
    displayText: "this",
    pos: "determiner",
    meaningVi: "đây / cái này",
    canDoVi: "Chỉ một thứ ở gần.",
    pronunciationHintVi: "Đặt lưỡi nhẹ giữa răng cho âm đầu th.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "This is me.", vi: "Đây là tôi." },
      { text: "This is you.", vi: "Đây là bạn." },
      { text: "This is it.", vi: "Đây là nó." },
    ],
  }),
  authoredItem({
    curriculumOrder: 18,
    word: "that",
    displayText: "that",
    pos: "determiner",
    meaningVi: "đó / cái đó",
    canDoVi: "Chỉ một thứ ở xa hơn.",
    pronunciationHintVi: "Âm đầu giống this, âm a ngắn.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "That is me.", vi: "Đó là tôi." },
      { text: "That is you.", vi: "Đó là bạn." },
      { text: "That is it.", vi: "Đó là nó." },
    ],
  }),
  authoredItem({
    curriculumOrder: 19,
    word: "my",
    displayText: "my",
    pos: "determiner",
    meaningVi: "của tôi",
    canDoVi: "Nói một thứ thuộc về mình.",
    pronunciationHintVi: "Âm đầu m, phần cuối nghe gần như ai.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 20,
    word: "name",
    displayText: "name",
    pos: "noun",
    meaningVi: "tên",
    canDoVi: "Nhận ra từ name khi chuẩn bị giới thiệu tên.",
    pronunciationHintVi: "Âm cuối m khép môi, không thêm nguyên âm.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 21,
    word: "a",
    displayText: "a",
    pos: "determiner",
    meaningVi: "một (trước danh từ số ít)",
    canDoVi: "Nhận ra a đứng trước một đồ vật chưa xác định.",
    pronunciationHintVi: "Trong câu thường là âm rất ngắn /ə/.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 22,
    word: "book",
    displayText: "book",
    pos: "noun",
    meaningVi: "quyển sách",
    canDoVi: "Chỉ và gọi tên một quyển sách.",
    pronunciationHintVi: "Âm /u/ ngắn; không kéo dài như boot.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "This is a book.", vi: "Đây là một quyển sách." },
      { text: "That is a book.", vi: "Đó là một quyển sách." },
      { text: "My book is here.", vi: "Sách của tôi ở đây." },
    ],
  }),
  authoredItem({
    curriculumOrder: 23,
    word: "water",
    displayText: "water",
    pos: "noun",
    meaningVi: "nước",
    canDoVi: "Nhận ra và gọi nước trong một câu ngắn.",
    pronunciationHintVi: "Nghe phần đầu wa- rõ hơn phần cuối trong nói nhanh.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "Water is good.", vi: "Nước thì tốt." },
      { text: "This is water.", vi: "Đây là nước." },
      { text: "I see water.", vi: "Tôi thấy nước." },
    ],
  }),
  authoredItem({
    curriculumOrder: 24,
    word: "want",
    displayText: "want",
    pos: "verb",
    meaningVi: "muốn",
    canDoVi: "Nói mình hoặc người khác muốn một thứ đã biết.",
    pronunciationHintVi: "Nói gọn một tiếng; âm cuối t rõ nhẹ.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "I want water.", vi: "Tôi muốn nước." },
      { text: "You want water.", vi: "Bạn muốn nước." },
      { text: "I want a book.", vi: "Tôi muốn một quyển sách." },
    ],
  }),
  authoredItem({
    curriculumOrder: 25,
    word: "help",
    displayText: "help",
    pos: "verb",
    meaningVi: "giúp đỡ",
    canDoVi: "Nói rằng mình cần hoặc muốn sự giúp đỡ.",
    pronunciationHintVi: "Giữ âm p cuối ngắn, không đọc thành hep-pơ.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "I want help.", vi: "Tôi muốn được giúp." },
      { text: "You want help.", vi: "Bạn muốn được giúp." },
      { text: "Help me.", vi: "Giúp tôi với." },
    ],
  }),
  authoredItem({
    curriculumOrder: 26,
    word: "please",
    displayText: "please",
    pos: "adverb",
    meaningVi: "làm ơn",
    canDoVi: "Thêm please để lời yêu cầu lịch sự hơn.",
    pronunciationHintVi: "Âm cuối s nghe rõ, chỉ một tiếng.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "Please help me.", vi: "Làm ơn giúp tôi." },
      { text: "Please, I want water.", vi: "Làm ơn, tôi muốn nước." },
      { text: "Help me, please.", vi: "Giúp tôi với, làm ơn." },
    ],
  }),
  authoredItem({
    curriculumOrder: 27,
    word: "thank",
    displayText: "thank",
    pos: "verb",
    meaningVi: "cảm ơn",
    canDoVi: "Cảm ơn một người bằng thank you.",
    pronunciationHintVi: "Âm th đặt lưỡi nhẹ giữa răng, đừng đọc thành t.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "Thank you.", vi: "Cảm ơn bạn." },
      { text: "Thank you. You are good.", vi: "Cảm ơn bạn. Bạn thật tốt." },
      { text: "Thank you. I am happy.", vi: "Cảm ơn bạn. Tôi vui." },
    ],
  }),
  authoredItem({
    curriculumOrder: 28,
    word: "sorry",
    displayText: "sorry",
    pos: "adjective",
    meaningVi: "xin lỗi / buồn vì điều gì đó",
    canDoVi: "Mở đầu một lời xin lỗi ngắn.",
    pronunciationHintVi: "Nhấn phần đầu: SOR-ry.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "Sorry.", vi: "Xin lỗi." },
      { text: "I am sorry.", vi: "Tôi xin lỗi." },
      { text: "Sorry, I am sad.", vi: "Xin lỗi, tôi buồn." },
    ],
  }),
  authoredItem({
    curriculumOrder: 29,
    word: "bye",
    displayText: "bye",
    pos: "interjection",
    meaningVi: "tạm biệt",
    canDoVi: "Chào tạm biệt khi kết thúc một cuộc gặp ngắn.",
    pronunciationHintVi: "Âm cuối giống I trong tiếng Anh.",
    introduceOnItsOwn: true,
    sentences: [],
  }),
  authoredItem({
    curriculumOrder: 30,
    word: "like",
    displayText: "like",
    pos: "verb",
    meaningVi: "thích",
    canDoVi: "Nói mình hoặc người khác thích một người hay một thứ đã biết.",
    pronunciationHintVi: "Âm cuối k gọn, không thêm nguyên âm.",
    introduceOnItsOwn: false,
    sentences: [
      { text: "I like you.", vi: "Tôi thích bạn." },
      { text: "You like me.", vi: "Bạn thích tôi." },
      { text: "I like water.", vi: "Tôi thích nước." },
    ],
  }),
];

const BY_WORD = new Map(STARTER_CATALOGUE.map((item) => [item.word, item]));

/**
 * This allowlist is the cost and privacy boundary for Gemini TTS. A browser
 * can request only a sentence that is already part of the reviewed A0 path;
 * learner-entered text never reaches the TTS provider.
 */
const STARTER_AUDIO_TEXTS = new Set<string>([
  ...STARTER_CATALOGUE.flatMap((item) => [
    item.displayText,
    ...item.sentences.map((sentence) => sentence.text),
    item.learningAsset.transfer.expectedText,
  ]),
  ...STARTER_LESSONS.map((lesson) => lesson.checkpoint.expectedText),
]);

function lessonForItemOrder(curriculumOrder: number): StarterLesson | undefined {
  return STARTER_LESSONS.find(
    (lesson) =>
      curriculumOrder >= lesson.firstItemOrder &&
      curriculumOrder <= lesson.lastItemOrder,
  );
}

export function starterItemFor(word: string): StarterItem | undefined {
  return BY_WORD.get(word.toLocaleLowerCase("en-US"));
}

/** Returns the exact reviewed text that may be synthesized as A0 source audio. */
export function starterAudioTextFor(text: string): string | undefined {
  return STARTER_AUDIO_TEXTS.has(text) ? text : undefined;
}

/**
 * The API receives a word, while the learner needs to see the larger job it
 * belongs to. Keeping this mapping next to the catalogue prevents a generic UI
 * fallback from silently turning the A0 path back into flashcards.
 */
export function starterLessonProgressFor(word: string): StarterLessonProgress | undefined {
  const item = starterItemFor(word);
  if (!item) return undefined;

  const lesson = lessonForItemOrder(item.curriculumOrder);
  if (!lesson) {
    throw new Error(`Missing A0 lesson unit for starter item ${item.word}`);
  }

  const itemCount = lesson.lastItemOrder - lesson.firstItemOrder + 1;
  const itemPosition = item.curriculumOrder - lesson.firstItemOrder + 1;
  return {
    lesson,
    itemPosition,
    itemCount,
    isFinalItem: item.curriculumOrder === lesson.lastItemOrder,
  };
}

export function starterSentenceFor(
  target: string,
  text: string,
): StarterSentence | undefined {
  return starterItemFor(target)?.sentences.find(
    (sentence) => sentence.text === text,
  );
}
