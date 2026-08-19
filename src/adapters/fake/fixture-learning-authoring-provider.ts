import {
  LearningAuthoringFailure,
  type AuthorLearningDraftInput,
  type DiagnoseLearningVideoInput,
  type LearningAuthoringProvider,
} from "@/modules/learning/ports/learning-authoring-provider";
import type { LearningAuthoringDraftV2 } from "@/shared/contracts/learning-authoring-draft-v2";
import type { ConstrainedDiagnosisProposal } from "@/shared/contracts/learning-generation-v2";

/**
 * A deterministic stand-in for the two authoring model calls.
 *
 * It exists so the whole chain — diagnose, gate, author, hydrate, publish — can
 * be exercised end to end without spending provider quota, and so a journey
 * test proves the wiring rather than the model's mood.
 *
 * It deliberately picks its phrase out of the real transcript instead of
 * inventing one. A fixture that returned a made-up phrase would sail past the
 * deterministic gate's source check only because the gate was never reached,
 * and the first real provider run would be the first time anyone learned the
 * gate rejects everything.
 */

const WORD = /^[a-z][a-z'’-]*$/;

/** Finds a run of three lowercase words that really occurs in the segment. */
function findTeachableChunk(text: string): string | null {
  const words = text.split(/\s+/).map((word) =>
    word.replace(/^[^\p{L}']+|[^\p{L}']+$/gu, "").toLocaleLowerCase("en-US"),
  );
  for (let index = 0; index + 2 < words.length; index += 1) {
    const run = words.slice(index, index + 3);
    if (run.every((word) => WORD.test(word))) return run.join(" ");
  }
  return null;
}

function slugify(value: string): string {
  const slug = value.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length >= 3 ? slug.slice(0, 60) : `item-${slug}`;
}

export class FixtureLearningAuthoringProvider
  implements LearningAuthoringProvider
{
  readonly modelId = "fixture-authoring-model";

  async diagnose(
    input: DiagnoseLearningVideoInput,
  ): Promise<{
    value: ConstrainedDiagnosisProposal;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
  }> {
    const window = input.profile.candidateWindows[0];
    if (!window) {
      throw new LearningAuthoringFailure(
        "Diagnosis received a video with no candidate window.",
        false,
      );
    }

    const segmentById = new Map(
      input.permittedSegments.map((segment) => [segment.id, segment] as const),
    );
    const sourceSegmentId = window.sourceSegmentIds.find((segmentId) => {
      const segment = segmentById.get(segmentId);
      return segment ? findTeachableChunk(segment.text) !== null : false;
    });
    const chunk = sourceSegmentId
      ? findTeachableChunk(segmentById.get(sourceSegmentId)!.text)
      : null;

    if (!sourceSegmentId || !chunk) {
      // Abstaining is a real outcome, not a failure: some videos have nothing
      // teachable in them, and pretending otherwise is how a lesson gets built
      // out of nothing.
      return {
        value: {
          proposalVersion: "learning-diagnosis-proposal:v2",
          abstainReason: "Không tìm được cụm nào đủ rõ để dạy trong nguồn.",
          windows: [],
        },
        modelId: this.modelId,
        inputTokens: 0,
        outputTokens: 0,
      };
    }

    const candidateId = `candidate_${slugify(chunk).replace(/-/g, "_")}`;
    return {
      value: {
        proposalVersion: "learning-diagnosis-proposal:v2",
        abstainReason: null,
        windows: [
          {
            windowId: window.id,
            gistVi: "Người nói trình bày ý chính của đoạn này.",
            discourseFunctionVi: "trình bày thông tin chính",
            outcomeCandidates: [
              {
                id: "outcome_main_point",
                canDoVi: "Nắm được ý chính của đoạn và cụm dùng để diễn đạt nó.",
                successEvidenceVi:
                  "Chọn đúng ý chính và dùng lại cụm trong tình huống mới.",
                confidence: 0.9,
              },
            ],
            itemCandidates: [
              {
                id: candidateId,
                key: slugify(chunk),
                surfaceForm: chunk,
                normalizedForm: chunk,
                sourceSegmentIds: [sourceSegmentId],
                outcomeIds: ["outcome_main_point"],
                kind: "chunk",
                contextualMeaningVi: "cụm người nói dùng trong ngữ cảnh này",
                communicativeFunctionVi: "diễn đạt ý chính của đoạn",
                register: "neutral",
                corpusFrequencyBand: "mid",
                evidenceConfidence: 0.9,
                properNounOrTrivia: false,
                generatedScenarioPossible: true,
                scoringHints: {
                  outcomeRelevance: 0.8,
                  transferValue: 0.75,
                  contextualClarity: 0.9,
                  pragmaticRegisterValue: 0.6,
                  acousticTeachability: 0.6,
                },
                rationaleVi:
                  "Cụm xuất hiện nguyên văn trong nguồn và dùng lại được.",
              },
            ],
          },
        ],
      },
      modelId: this.modelId,
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  async author(input: AuthorLearningDraftInput): Promise<{
    value: LearningAuthoringDraftV2;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
  }> {
    const window = input.brief.windows[0];
    const item = input.brief.targetItems[0];
    if (!window || !item) {
      throw new LearningAuthoringFailure(
        "Authoring brief arrived with no window or target item.",
        false,
      );
    }

    return {
      value: {
        draftVersion: "learning-authoring-draft:v2",
        challengeSummaryVi:
          "Đoạn này nói tốc độ vừa phải, ý chính nằm ngay ở câu đầu.",
        targetItemNotes: [
          {
            candidateId: item.id,
            communicativeFunctionVi: "dùng để diễn đạt ý chính của đoạn",
            pronunciationNoteVi: null,
          },
        ],
        activities: [
          {
            id: "activity_gist",
            phase: "gist",
            activityType: "gist_choice",
            outcomeIds: [input.brief.outcomes[0]!.id],
            instructionVi: "Nghe một lượt, chưa cần hiểu từng từ, rồi chọn ý chính.",
            evidenceWindowIds: [window.id],
            captionPolicy: "hidden_first",
            estimatedSeconds: 60,
            promptVi: "Đoạn này chủ yếu nói về điều gì?",
            options: [
              { id: "option_main", textVi: window.gistVi },
              { id: "option_other", textVi: "Một chủ đề không xuất hiện trong đoạn." },
            ],
            correctOptionId: "option_main",
            feedback: {
              goalVi: "Nắm ý chính trước khi soi vào từng từ.",
              correctEvidenceVi: "Đó đúng là điều người nói trình bày trong đoạn.",
              incorrectEvidenceVi: "Đoạn này không nhắc tới nội dung đó.",
              nextStepVi: "Nghe lại một lượt và chú ý câu mở đầu.",
            },
          },
          {
            id: "activity_recall",
            phase: "retrieve",
            activityType: "chunk_recall",
            outcomeIds: [input.brief.outcomes[0]!.id],
            instructionVi: "Nhớ lại cụm người nói đã dùng, đừng nhìn phụ đề.",
            evidenceWindowIds: [window.id],
            captionPolicy: "toggle",
            estimatedSeconds: 90,
            candidateId: item.id,
            promptVi: "Viết lại cụm người nói dùng để diễn đạt ý chính.",
            hintVi: null,
            accepted: [item.surfaceForm],
            revealAnswer: item.surfaceForm,
            revealExplanationVi:
              "Đây là cụm nguyên văn người nói dùng trong đoạn vừa nghe.",
            feedback: {
              goalVi: "Chủ động nhớ lại thay vì chỉ nhận ra.",
              correctEvidenceVi: "Đúng cụm xuất hiện trong nguồn.",
              incorrectEvidenceVi: "Chưa khớp cụm người nói đã dùng.",
              nextStepVi: "Nghe lại đoạn rồi thử viết lại lần nữa.",
            },
          },
          {
            id: "activity_exit",
            phase: "reflect",
            activityType: "exit_ticket",
            outcomeIds: [input.brief.outcomes[0]!.id],
            instructionVi: "Nhìn lại buổi học một chút.",
            estimatedSeconds: 30,
            promptVi: "Phần nào trong đoạn này khiến bạn thấy khó nhất?",
            feedback: {
              goalVi: "Biết chỗ khó để lần sau nhắm đúng vào đó.",
              nextStepVi: "Cụm vừa học sẽ quay lại khi tới hạn ôn.",
            },
          },
        ],
      },
      modelId: this.modelId,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}
