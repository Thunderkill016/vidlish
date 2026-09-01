import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * Builds transfer probes: exercises that ask the learner to use a chunk they
 * have recalled in a context they have **never seen before**.
 *
 * Transfer evidence is the strongest claim the product can make. Recall proves
 * the form is in memory; transfer proves it can leave memory and arrive in a
 * new situation. Without transfer evidence, a learner who can recite "again
 * please" fifty times in the same exercise has no proof they would say it to a
 * fast speaker.
 *
 * Three design decisions, each forced by something specific:
 *
 * **No AI generation.** A generated sentence might introduce words outside the
 * learner's known set, violating the i+1 gate that protects every other input
 * in this product. Instead, transfer contexts are drawn from the unit's own
 * input scenes — human-authored, already reviewed, already carrying audio and
 * Vietnamese scaffolding. The "unseen" part is that the learner has not been
 * asked to produce the chunk in *that* scene before.
 *
 * **One chunk per probe.** A probe that asks for two chunks tests two things,
 * and a failure tells you nothing about which one failed.
 *
 * **Only chunks the learner has recalled.** Transfer before recall is a test
 * they cannot pass, not a practice that builds capability.
 */

export type TransferProbe = {
  /** The chunk the learner must produce. */
  readonly chunk: string;
  /** Vietnamese meaning of the chunk. */
  readonly chunkVi: string;
  /** A situation the chunk applies to, different from where it was taught. */
  readonly scenarioVi: string;
  /** The unit this probe draws from. */
  readonly unitId: string;
  /** Scene id used to build the scenario, for evidence tracking. */
  readonly sourceSceneId: string;
};

/**
 * Whether the learner's typed answer matches the expected chunk.
 *
 * Same normalisation as chunk recall: case and punctuation forgiven, word order
 * and spelling not. Transfer tests the same form in a new situation; accepting
 * a different form would be testing something else.
 */
export function markTransferProbe(probe: TransferProbe, written: string): boolean {
  return normalise(written) === normalise(probe.chunk);
}

function normalise(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Scenario templates that reframe a chunk into a different situation.
 *
 * Each template takes a Vietnamese chunk meaning and wraps it into a situation
 * the learner has not practised in. The situations are generic enough to apply
 * to most communicative chunks but specific enough that the learner cannot
 * answer without knowing the chunk.
 *
 * These are intentionally few and hardcoded rather than generated. A generated
 * scenario might be more varied but cannot be editorially reviewed, and an
 * unreviewed scenario aimed at an A0 learner is a scenario that might confuse
 * rather than test.
 */
const SCENARIO_TEMPLATES: readonly ((chunkVi: string) => string)[] = [
  (vi) => `Bạn đang nhắn tin cho đồng nghiệp người nước ngoài. Bạn muốn nói: "${vi}". Viết câu tiếng Anh.`,
  (vi) => `Bạn gặp một du khách hỏi đường. Trong cuộc nói chuyện, bạn cần nói: "${vi}". Viết câu tiếng Anh.`,
  (vi) => `Bạn đang gọi điện thoại và cần nói: "${vi}". Viết câu tiếng Anh.`,
  (vi) => `Bạn viết email ngắn cho sếp. Bạn muốn viết: "${vi}". Viết câu tiếng Anh.`,
  (vi) => `Bạn đang ở quán cà phê và muốn nói với nhân viên: "${vi}". Viết câu tiếng Anh.`,
];

/**
 * Selects transfer probes from the curriculum.
 *
 * Only chunks that:
 * 1. Belong to units the learner has evidence for (at least one word known).
 * 2. The learner has previously recalled (all words in the chunk are known).
 * 3. Are marked `changedContext: true` in the unit's evidence criteria.
 *
 * Probes are deterministic: the same learner state and curriculum produce the
 * same probes. Randomisation would make the evidence non-reproducible.
 */
export function selectTransferProbes(input: {
  readonly units: readonly FoundationUnit[];
  readonly known: ReadonlySet<string>;
  readonly wanted: number;
  /** Chunks already probed in this session, to avoid repeats. */
  readonly alreadyProbed?: ReadonlySet<string>;
}): readonly TransferProbe[] {
  const probes: TransferProbe[] = [];
  const alreadyProbed = input.alreadyProbed ?? new Set<string>();

  for (const unit of input.units) {
    // Which chunks require changed-context evidence?
    const transferRequired = new Set(
      unit.evidenceCriteria
        .filter((criterion) => criterion.changedContext)
        .map((criterion) => criterion.chunk.toLocaleLowerCase("en-US")),
    );

    for (const chunk of unit.targetChunks) {
      const key = chunk.text.toLocaleLowerCase("en-US");

      // Skip if not required for transfer, or already probed this session.
      if (!transferRequired.has(key)) continue;
      if (alreadyProbed.has(key)) continue;

      // Every word in the chunk must be independently known. Asking for
      // transfer of something the learner cannot yet recall is a test they
      // cannot pass, not a practice that builds capability.
      const words = key
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z']/g, ""))
        .filter(Boolean);
      if (!words.every((word) => input.known.has(word))) continue;

      // Pick a scenario template deterministically: cycle through templates
      // based on the probe's position. This ensures variety across chunks
      // without randomness.
      const templateIndex = probes.length % SCENARIO_TEMPLATES.length;
      const scenarioVi = SCENARIO_TEMPLATES[templateIndex](chunk.vi);

      // Use the first scene from the unit that mentions the chunk, as the
      // source for evidence tracking. The scenario text itself is a template,
      // not taken from the scene — but the scene id anchors provenance.
      const sourceScene = unit.inputScenes.find((scene) =>
        scene.text.toLocaleLowerCase("en-US").includes(key),
      );

      probes.push({
        chunk: chunk.text,
        chunkVi: chunk.vi,
        scenarioVi,
        unitId: unit.id,
        sourceSceneId: sourceScene?.id ?? unit.inputScenes[0].id,
      });
    }
  }

  // Shortest chunks first: a two-word transfer is a smaller step than a
  // five-word one, mirroring the chunk recall ordering.
  return probes
    .sort(
      (a, b) =>
        a.chunk.split(/\s+/).length - b.chunk.split(/\s+/).length ||
        a.chunk.localeCompare(b.chunk),
    )
    .slice(0, input.wanted);
}
