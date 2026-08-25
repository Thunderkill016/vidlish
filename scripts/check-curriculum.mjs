/**
 * One command for everything a new unit needs before it can teach anyone.
 *
 * Authoring a unit used to mean running three unrelated things and computing the
 * fourth by hand: parse the syllabus through a vitest file, render audio with a
 * second script, and work out remaining CEFR-J coverage with a throwaway node
 * one-liner written fresh each time. Nothing told an author what to write next,
 * so "what is still missing from A1" was answered by whoever last bothered.
 *
 * The idea is taken from Earthworm's course-data pipeline — a project that
 * proved a content step belongs in the toolchain rather than in someone's head.
 * None of its code is used: it is AGPL-3.0, and this product does not open its
 * source. What is borrowed is the shape of the command.
 *
 * Its gamification is deliberately *not* borrowed. Points and leaderboards are
 * "seductive detail", and removing seductive detail is the single largest effect
 * in the multimedia-learning literature (g = 1.00) — they hold attention and
 * cost comprehension.
 *
 *   node scripts/check-curriculum.mjs            # validate + report
 *   node scripts/check-curriculum.mjs --audio    # also render missing audio
 *   node scripts/check-curriculum.mjs --next 8   # what to write next
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BUNDLE = path.normalize("node_modules/.cache/curriculum-check.mjs");
const ENTRY = path.normalize("node_modules/.cache/curriculum-check.ts");

const args = process.argv.slice(2);
const wantAudio = args.includes("--audio");
const nextIndex = args.indexOf("--next");
const nextCount = nextIndex > -1 ? Number(args[nextIndex + 1] ?? 10) : 0;

function bundle() {
  mkdirSync(path.dirname(BUNDLE), { recursive: true });
  writeFileSync(
    ENTRY,
    [
      'export { FOUNDATION_UNITS } from "@/modules/curriculum/content";',
      'export { GRAMMAR_INVENTORY, grammarCoverageFor, unknownGrammarCodes } from "@/modules/curriculum/application/grammar-coverage";',
      'export { curriculumAudioFor } from "@/adapters/audio/curriculum-audio";',
    ].join("\n"),
  );
  execFileSync(
    path.normalize("node_modules/.bin/esbuild"),
    [
      ENTRY,
      "--bundle",
      "--format=esm",
      "--platform=node",
      `--alias:@=${path.resolve("src")}`,
      `--outfile=${BUNDLE}`,
      "--loader:.json=json",
      "--log-level=warning",
    ],
    { stdio: "inherit" },
  );
  return import(pathToFileURL(path.resolve(BUNDLE)).href);
}

// The syllabus parses itself at module load, so a schema violation throws here
// with the unit and field named. That is the validation step: there is no second
// copy of the rules to drift from.
let loaded;
try {
  loaded = await bundle();
} catch (error) {
  console.error("\n✘ Chương trình học không hợp lệ:\n");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const { FOUNDATION_UNITS, GRAMMAR_INVENTORY, grammarCoverageFor, unknownGrammarCodes, curriculumAudioFor } = loaded;

let failed = false;
const problem = (message) => {
  failed = true;
  console.error(`  ✘ ${message}`);
};

console.log(`${FOUNDATION_UNITS.length} unit\n`);

// 1. Grammar codes must exist in the published inventory.
const unknown = unknownGrammarCodes(FOUNDATION_UNITS);
if (unknown.length > 0) {
  problem(`mã ngữ pháp không có trong danh mục CEFR-J: ${unknown.join(", ")}`);
}

// 2. Every English line a unit speaks needs a recording, or the learner is told
//    to listen and hears the browser's robot voice instead.
const silent = [];
for (const unit of FOUNDATION_UNITS) {
  for (const scene of unit.inputScenes) {
    if (!curriculumAudioFor(scene.text)) silent.push(`${unit.id}: "${scene.text}"`);
  }
  for (const chunk of unit.targetChunks) {
    if (!curriculumAudioFor(chunk.text)) silent.push(`${unit.id}: "${chunk.text}"`);
  }
}

if (silent.length > 0 && wantAudio) {
  console.log(`${silent.length} dòng chưa có tiếng — đang dựng…\n`);
  execFileSync("node", ["scripts/build-curriculum-audio.mjs"], { stdio: "inherit" });
  console.log("");
} else if (silent.length > 0) {
  problem(`${silent.length} dòng chưa có tiếng. Chạy lại với --audio để dựng:`);
  for (const line of silent.slice(0, 6)) console.error(`      ${line}`);
  if (silent.length > 6) console.error(`      … và ${silent.length - 6} dòng nữa`);
}

// 3. Every skill must be exercised and graded somewhere, or it is a label.
for (const skill of ["listening", "speaking", "reading", "writing"]) {
  const graded = FOUNDATION_UNITS.flatMap((unit) =>
    unit.activities.filter((a) => a.skill === skill && !a.supportAllowed),
  );
  if (graded.length === 0) problem(`không có hoạt động ${skill} nào được chấm`);
}

// 4. Coverage, which is the only honest answer to "is this comprehensive".
console.log("Độ phủ ngữ pháp, theo CEFR-J Grammar Profile:\n");
let band = { total: 0, covered: 0 };
const missingByLevel = new Map();
for (const level of ["A1.1", "A1.2", "A1.3", "A2.1", "A2.2"]) {
  const coverage = grammarCoverageFor(FOUNDATION_UNITS, level);
  if (coverage.total === 0) continue;
  const percent = Math.round((coverage.covered / coverage.total) * 100);
  const bar = "█".repeat(Math.round(percent / 5)).padEnd(20, "░");
  console.log(
    `  ${level.padEnd(5)} ${bar} ${String(coverage.covered).padStart(2)}/${String(coverage.total).padEnd(2)}  ${percent}%`,
  );
  missingByLevel.set(level, coverage.missing);
  if (level.startsWith("A1")) {
    band.total += coverage.total;
    band.covered += coverage.covered;
  }
}
console.log(
  `\n  A1 tổng: ${band.covered}/${band.total} = ${Math.round((band.covered / band.total) * 100)}%\n`,
);

// 5. What to write next, in the profile's own teaching order.
if (nextCount > 0) {
  console.log(`${nextCount} mục nên viết tiếp, theo thứ tự dạy của chính danh mục:\n`);
  const queue = [...missingByLevel.entries()].flatMap(([level, missing]) =>
    missing.map((item) => ({ level, ...item })),
  );
  for (const item of queue.slice(0, nextCount)) {
    console.log(`  ${item.level.padEnd(5)} ${item.code.padEnd(26)} ${item.item.slice(0, 58)}`);
  }
  console.log("");
}

rmSync(BUNDLE, { force: true });
rmSync(ENTRY, { force: true });

if (failed) {
  console.error("✘ Chương trình học chưa sẵn sàng dạy.\n");
  process.exit(1);
}
console.log("✓ Mọi unit hợp lệ, có tiếng, và bốn kỹ năng đều được chấm.\n");
