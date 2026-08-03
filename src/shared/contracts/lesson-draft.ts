import { z } from "zod";

import { videoIdSchema } from "@/shared/contracts/video";

export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1"]);

export type CefrLevel = z.infer<typeof cefrLevelSchema>;

export const cefrOptions: ReadonlyArray<{
  level: CefrLevel;
  labelVi: string;
  descriptionVi: string;
}> = [
  { level: "A1", labelVi: "A1", descriptionVi: "Mới bắt đầu" },
  { level: "A2", labelVi: "A2", descriptionVi: "Cơ bản" },
  { level: "B1", labelVi: "B1", descriptionVi: "Trung cấp" },
  { level: "B2", labelVi: "B2", descriptionVi: "Trung cấp cao" },
  { level: "C1", labelVi: "C1", descriptionVi: "Nâng cao" },
];

export const confirmedLessonDraftSchema = z
  .object({
    videoId: videoIdSchema,
    cefrLevel: cefrLevelSchema,
    metadataVersion: z.string().min(1).max(256),
  })
  .strict();

export type ConfirmedLessonDraft = z.infer<typeof confirmedLessonDraftSchema>;
