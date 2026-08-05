/**
 * The whole chain with nothing faked except persistence: YouTube Data API for
 * metadata, Supadata for the real caption track, franc for the language gate,
 * Gemini for the lesson.
 *
 * Skipped unless all three keys are present, so CI never touches a paid API.
 */
import { describe, expect, it } from "vitest";

import { createGenerationRuntime } from "@/platform/generation/create-generation-runtime";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { createVideoMetadataProvider } from "@/platform/video/create-video-metadata-provider";

const ready = Boolean(
  process.env.GEMINI_API_KEY &&
    process.env.SUPADATA_API_KEY &&
    process.env.YOUTUBE_DATA_API_KEY,
);

// A real, public, English-spoken video with a real caption track.
const VIDEO_ID = process.env.REAL_VIDEO_ID ?? "dQw4w9WgXcQ";

describe.skipIf(!ready)("the whole chain against real services", () => {
  it("turns a real YouTube link into a grounded lesson", async () => {
    const runtime = createGenerationRuntime();
    const ownerUserId = crypto.randomUUID();

    const metadata = await createVideoMetadataProvider().lookup(VIDEO_ID);
    console.log("metadata:", JSON.stringify(metadata));
    expect(metadata).toBeTruthy();

    const { job } = await runtime.repository.createOrReuse({
      ownerUserId,
      cefrLevel: "B1",
      pipelineVersion: "generation-pipeline:v1",
      metadata,
    } as never);

    await runtime.dispatcher.sendRequested({ jobId: job.id, ownerUserId } as never);

    const after = await runtime.repository.findOwnedById(job.id, ownerUserId);
    console.log("job status:", after?.status, "| error:", after?.safeErrorCode);

    const transcriptRuntime = createTranscriptRuntime(runtime.repository);
    const transcript = await transcriptRuntime.repository.findCanonicalForJob(
      ownerUserId,
      job.id,
    );
    console.log(
      "transcript:",
      transcript?.segments?.length ?? 0,
      "segments |",
      transcript?.provider,
      transcript?.sourceType,
    );

    const lesson = await createLessonRepository(
      runtime.repository,
      transcriptRuntime.repository,
    ).findOwnedByJobId(job.id, ownerUserId);

    if (lesson) {
      console.log(
        JSON.stringify(
          {
            titleVi: lesson.draft.titleVi,
            estimatedLevel: lesson.draft.estimatedLevel,
            counts: {
              vocabulary: lesson.draft.vocabulary.length,
              phrases: lesson.draft.phrases.length,
              grammar: lesson.draft.grammarPoints.length,
              questions: lesson.draft.comprehensionQuestions.length,
              cloze: lesson.draft.clozeItems.length,
              citations: lesson.citations.length,
            },
            model: lesson.provenance.modelId,
            firstCitation: lesson.citations[0],
            firstVocabulary: lesson.draft.vocabulary[0],
          },
          null,
          2,
        ),
      );
    }

    expect(after?.status).toBe("completed");
    expect(lesson).toBeTruthy();
  }, 300_000);
});
