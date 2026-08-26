import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { shelfTextById } from "@/adapters/reading/shelf";
import { passageFromCitations } from "@/modules/reading/application/passage-from-lesson";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import {
  countOccurrences,
  selectWordsToEnqueue,
} from "@/modules/reading/application/enqueue-met-words";
import { readPassage } from "@/modules/reading/application/read-passage";
import { startReview } from "@/modules/learning/application/review-scheduler";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

/**
 * Puts the words a learner tapped while reading onto their review calendar.
 *
 * This closes the only loop that makes reading pay off. Reading finds words at
 * about one in twelve, and a word needs more than eight encounters before its
 * form sticks and more than fourteen for its meaning — a volume no single
 * article supplies. Without this write, every word tapped on `/read` would be
 * looked up, understood, and lost.
 *
 * The browser sends which words were tapped and nothing else. The server holds
 * the text, so it counts occurrences itself: a client that could report its own
 * frequencies could put any word at the front of the queue.
 */

const requestSchema = z
  .object({
    textId: z.string().min(1).max(120),
    tapped: z.array(z.string().min(1).max(60)).max(400),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

    const parsed = requestSchema.safeParse(await readAuthJsonBody(request));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    // Two kinds of passage reach this route, and only one is on the shelf. A
    // reading step can also be built from the citations of the learner's own
    // video lesson, and those ids are prefixed. Handling only the shelf would
    // have made every word tapped in his own material fail to save — silently
    // from his side, since the page would just say it could not.
    const paragraphs = parsed.data.textId.startsWith("lesson-")
      ? await lessonParagraphs(parsed.data.textId.slice("lesson-".length), access.userId)
      : (shelfTextById(parsed.data.textId)?.paragraphs ?? null);
    if (!paragraphs) {
      return NextResponse.json({ error: "unknown_text" }, { status: 404 });
    }

    const progress = await createBeginnerProgressRepository();
    const tapped = [...new Set(parsed.data.tapped.map((word) => word.toLowerCase()))];

    // Which of these already have a calendar entry. Read before deciding,
    // because a word already scheduled must be left alone: a tap says the
    // learner met the word, not that they tried to recall it and failed.
    const scheduled = new Set<string>();
    for (const lemma of tapped) {
      const existing = await progress.reviewSchedule({
        ownerUserId: access.userId,
        itemKey: lemma,
      });
      if (existing?.nextReviewAt) scheduled.add(lemma);
    }

    const chosen = selectWordsToEnqueue({
      tapped,
      occurrences: countOccurrences(readPassage(paragraphs.join("\n"))),
      alreadyScheduled: scheduled,
      // Capped per request rather than per day, because nothing in the
      // repository counts how many new items a learner has already taken on
      // today. That count is owed: two long sessions in one evening can still
      // exceed the intake the scheduler says holds retention above 80%.
      newItemsToday: 0,
    });

    const now = new Date();
    for (const word of chosen) {
      const state = startReview(now);
      // Not `scheduleReview`: that is an UPDATE against a row the evidence
      // function created, and a word tapped while reading has no evidence
      // behind it by definition. Calling it here matched zero rows and wrote
      // nothing while this route reported success.
      await progress.recordReadingExposure({
        ownerUserId: access.userId,
        itemKey: word.lemma,
        reviewState: state,
        nextReviewAt: state.due,
      });
    }

    return NextResponse.json(
      {
        enqueued: chosen.map((word) => word.lemma),
        alreadyScheduled: [...scheduled],
        // Said out loud so the page can tell the learner why a word they tapped
        // is not coming back, rather than silently dropping it.
        skippedForCapacity: Math.max(0, tapped.length - scheduled.size - chosen.length),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return productErrorResponse(error);
  }
}

/**
 * The readable lines of a lesson the learner owns.
 *
 * Ownership is checked by the repository, not here: a job id in a request body
 * is a claim, and reading another learner's lesson would leak what they are
 * studying.
 */
async function lessonParagraphs(
  jobId: string,
  ownerUserId: string,
): Promise<readonly string[] | null> {
  const generation = createGenerationRepository();
  const transcripts = createTranscriptRuntime(generation);
  const lessons = createLessonRepository(generation, transcripts.repository);
  const lesson = await lessons.findOwnedByJobId(jobId, ownerUserId);
  if (!lesson) return null;
  const passage = passageFromCitations(lesson.citations);
  return passage.paragraphs.length > 0 ? passage.paragraphs : null;
}
