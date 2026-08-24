import {
  goldenSessionUsabilityParticipantSchema,
  goldenSessionUsabilityStudySchema,
  type GoldenSessionUsabilityParticipant,
  type GoldenSessionUsabilityStudy,
} from "@/shared/contracts/golden-session-usability";

export const GOLDEN_SESSION_PARTICIPANT_FILE_MAX_BYTES = 1024 * 1024;

export type GoldenSessionParticipantLocalFile = {
  name: string;
  size: number;
  text(): Promise<string>;
};

export type GoldenSessionParticipantFileDescriptor = {
  fileName: string;
  mimeType: "application/json";
  content: string;
};

function firstSchemaIssue(
  result: ReturnType<typeof goldenSessionUsabilityParticipantSchema.safeParse> | ReturnType<typeof goldenSessionUsabilityStudySchema.safeParse>,
): string {
  if (result.success) return "";
  const issue = result.error.issues[0];
  const path = issue?.path.join(".");
  return `${path ? `${path}: ` : ""}${issue?.message ?? "Gate 5 JSON không hợp lệ."}`;
}

export function createGoldenSessionParticipantFile(
  participant: GoldenSessionUsabilityParticipant,
): GoldenSessionParticipantFileDescriptor {
  const parsed = goldenSessionUsabilityParticipantSchema.safeParse(participant);
  if (!parsed.success) {
    throw new Error(firstSchemaIssue(parsed));
  }

  return {
    fileName: `vidlish-gate5-${parsed.data.observation.participantCode}-${parsed.data.measurement.sessionId.slice(0, 8)}.json`,
    mimeType: "application/json",
    content: JSON.stringify(parsed.data, null, 2),
  };
}

export function parseGoldenSessionParticipantJson(
  text: string,
): GoldenSessionUsabilityParticipant {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Participant file không chứa JSON hợp lệ.");
  }

  const parsed = goldenSessionUsabilityParticipantSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(firstSchemaIssue(parsed));
  }
  return parsed.data;
}

/**
 * Read exactly the five local participant files required by the predeclared
 * Gate 5 protocol. Files are never uploaded or persisted by this helper. The
 * existing strict study schema remains the final authority for uniqueness and
 * exact participant count.
 */
export async function readGoldenSessionStudyFiles(
  files: readonly GoldenSessionParticipantLocalFile[],
): Promise<GoldenSessionUsabilityStudy> {
  if (files.length !== 5) {
    throw new Error("Chọn đúng 5 participant JSON của 5 người thật.");
  }

  const participants: GoldenSessionUsabilityParticipant[] = [];
  for (const file of files) {
    if (file.size > GOLDEN_SESSION_PARTICIPANT_FILE_MAX_BYTES) {
      throw new Error(`${file.name}: file vượt quá giới hạn 1 MiB.`);
    }
    participants.push(parseGoldenSessionParticipantJson(await file.text()));
  }

  const parsedStudy = goldenSessionUsabilityStudySchema.safeParse({ participants });
  if (!parsedStudy.success) {
    throw new Error(firstSchemaIssue(parsedStudy));
  }
  return parsedStudy.data;
}

export function serializeGoldenSessionStudy(
  study: GoldenSessionUsabilityStudy,
): string {
  const parsed = goldenSessionUsabilityStudySchema.safeParse(study);
  if (!parsed.success) {
    throw new Error(firstSchemaIssue(parsed));
  }
  return JSON.stringify(parsed.data, null, 2);
}
