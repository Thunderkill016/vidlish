/**
 * The staged progression a shadowing block runs through.
 *
 * Shadowing unstaged does not work for learners at this level. Kadota and Tamai
 * (2004) give four stages; Hamada (2012) adds the two comprehension scaffolds,
 * and Mu and Wasuntarasophit (2025) state plainly that those additions are
 * essential for students with limited English proficiency. This learner is
 * below the A2 of every study behind these numbers, so the scaffolds are
 * load-bearing rather than decoration.
 *
 * Only one stage is shadowing. Stages one to five prepare; stage six —
 * repeating with no script in front of you — is the technique the evidence is
 * about, and is the only stage this product measures or counts.
 *
 * The full argument, with effect sizes and their limitations, is in
 * docs/product/SHADOWING_SPEC.md.
 */

export type ShadowingStageId =
  | "listening"
  | "parallel_reading"
  | "mumbling"
  | "check_understanding"
  | "synchronized_reading"
  | "prosody_shadowing"
  | "check_details";

export type ShadowingStage = {
  readonly id: ShadowingStageId;
  readonly order: number;
  /** Vietnamese, because the instruction must not itself be a reading test. */
  readonly titleVi: string;
  readonly instructionVi: string;
  /** Whether the English text is on screen during this stage. */
  readonly showsScript: boolean;
  /** Whether the reference audio plays. */
  readonly playsAudio: boolean;
  /** How many times the learner goes through it. */
  readonly repetitions: number;
  /**
   * Whether an attempt here is recorded as evidence of speaking.
   *
   * True for exactly one stage. Banking evidence from the scripted stages
   * would be recording reading-aloud and calling it shadowing — the two were
   * compared head to head (Yavari & Shafiee 2019) and are not the same thing.
   */
  readonly isMeasured: boolean;
};

export const SHADOWING_STAGES: readonly ShadowingStage[] = [
  {
    id: "listening",
    order: 1,
    titleVi: "Nghe",
    instructionVi: "Nghe câu này. Chưa cần hiểu, chưa cần nói. Chỉ nghe.",
    showsScript: false,
    playsAudio: true,
    repetitions: 2,
    isMeasured: false,
  },
  {
    id: "parallel_reading",
    order: 2,
    titleVi: "Nhìn chữ và nói theo",
    instructionVi: "Câu hiện trên màn hình. Nói theo trong lúc nghe, mắt bám chữ.",
    showsScript: true,
    playsAudio: true,
    repetitions: 1,
    isMeasured: false,
  },
  {
    id: "mumbling",
    order: 3,
    titleVi: "Lẩm nhẩm",
    instructionVi:
      "Nói theo thật nhỏ, không cần rõ chữ. Lúc này chỉ bám âm thanh và nhịp, đúng sai chưa quan trọng.",
    showsScript: false,
    playsAudio: true,
    repetitions: 2,
    isMeasured: false,
  },
  {
    id: "check_understanding",
    order: 4,
    titleVi: "Hiểu nghĩa",
    instructionVi: "Đây là nghĩa của câu. Đọc cho chắc rồi mới đi tiếp.",
    showsScript: true,
    playsAudio: false,
    repetitions: 1,
    isMeasured: false,
  },
  {
    id: "synchronized_reading",
    order: 5,
    titleVi: "Đọc to cùng lúc",
    instructionVi: "Đọc to câu này cùng lúc với tiếng đọc mẫu. Cố bám sát từng nhịp.",
    showsScript: true,
    playsAudio: true,
    repetitions: 1,
    isMeasured: false,
  },
  {
    id: "prosody_shadowing",
    order: 6,
    titleVi: "Nói theo, không nhìn chữ",
    instructionVi:
      "Chữ biến mất. Nghe và nói theo ngay, bám sát nhất có thể. Đây là bước duy nhất được tính.",
    showsScript: false,
    playsAudio: true,
    repetitions: 1,
    isMeasured: true,
  },
  {
    id: "check_details",
    order: 7,
    titleVi: "Chỗ chưa nghe rõ",
    instructionVi: "Xem lại chữ và nghĩa. Chỗ nào vừa nãy trượt thì nghe lại chỗ đó.",
    showsScript: true,
    playsAudio: true,
    repetitions: 1,
    isMeasured: false,
  },
];

export const MEASURED_SHADOWING_STAGE: ShadowingStageId = "prosody_shadowing";

export function shadowingStage(id: ShadowingStageId): ShadowingStage {
  const stage = SHADOWING_STAGES.find((candidate) => candidate.id === id);
  if (!stage) throw new Error(`Unknown shadowing stage: ${id}`);
  return stage;
}

export function nextShadowingStage(id: ShadowingStageId): ShadowingStage | null {
  const current = shadowingStage(id);
  return SHADOWING_STAGES.find((stage) => stage.order === current.order + 1) ?? null;
}

/**
 * Minutes of shadowing per session, and sessions per week, that the studies
 * behind this feature actually delivered — Yavari and Shafiee ran fifteen
 * minutes, twice a week, for ten sessions.
 *
 * Kept here as data so the product can tell a learner they have not yet done
 * enough of this to expect the results, rather than implying every session
 * earns them.
 */
export const SHADOWING_DOSE = {
  minutesPerSession: 15,
  sessionsPerWeek: 2,
  sessionsInTheStudies: 10,
} as const;
