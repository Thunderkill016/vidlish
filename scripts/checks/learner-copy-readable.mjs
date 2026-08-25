/**
 * Refuses English jargon in the words a learner reads.
 *
 * This product teaches English to someone who does not yet have any. A page
 * that explains their progress using "projected evidence records", "aggregate
 * state" and "durable attempts" is asking them to read the language they came
 * here to learn, in order to find out whether they are learning it. That is not
 * a style problem; it is the page failing at its one job.
 *
 * It happened because the words were written by people thinking about the
 * system rather than about the reader, and nothing was watching. /progress
 * alone carried sixty-six of these.
 *
 * Two exemptions, both deliberate:
 *
 *   - The Golden Session study tooling is operated by whoever runs the study,
 *     not by a learner. It is exempt by path, listed below, so the exemption is
 *     visible rather than assumed.
 *   - English being *taught* is not jargon. Only prose containing Vietnamese
 *     letters is scanned, so an English word on its own — a vocabulary item, a
 *     sentence being practised — is never flagged.
 *
 *   node scripts/checks/learner-copy-readable.mjs
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

/** Operated by researchers, not learners. */
const EXEMPT = ["/learning-lab/v2/usability"];

const JARGON = [
  "evidence", "attempt", "attempts", "dictation", "objective", "aggregate",
  "durable", "projected", "stimulus", "canonical", "payload", "schema",
  "endpoint", "fallback", "runtime", "blueprint", "queue", "retrieval",
  "mastery", "privacy-safe", "capture", "receipt", "modality", "scheduler",
  "self-check", "completion", "independent evidence", "support events",
];

const VIETNAMESE =
  /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

const files = execSync("find src/app -name '*.tsx'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter((file) => !EXEMPT.some((path) => file.includes(path)));

const findings = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  source.split("\n").forEach((line, index) => {
    // Comments are for the next engineer, not the learner.
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

    // Only the pieces a reader actually sees: quoted strings and JSX text.
    // Identifiers are skipped, which is what made the first version of this
    // check report `record(true)` as prose.
    const strings = [...line.matchAll(/"([^"]{8,})"|'([^']{8,})'/g)].map(
      (match) => match[1] ?? match[2] ?? "",
    );
    // Quoted strings were already judged above; leaving them in the whole-line
    // pass makes a code constant like "ATTEMPT_REQUIRED" read as prose whenever
    // the same line also carries Vietnamese.
    const jsxText = line
      .replace(/"[^"]*"|'[^']*'/g, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\{[^}]*\}/g, " ");
    for (const text of [...strings, jsxText]) {
      if (!VIETNAMESE.test(text)) continue;
      for (const word of JARGON) {
        if (new RegExp(`(^|[^a-zA-Z-])${word}([^a-zA-Z-]|$)`, "i").test(text)) {
          findings.push({ file: file.replace("src/app/", ""), line: index + 1, word });
        }
      }
    }
  });
}

if (findings.length === 0) {
  console.log(`✓ ${files.length} tệp giao diện, không còn thuật ngữ tiếng Anh trong chữ người học đọc`);
  process.exit(0);
}

console.error(`✘ ${findings.length} chỗ dùng thuật ngữ tiếng Anh với người đang học tiếng Anh:\n`);
for (const finding of findings.slice(0, 60)) {
  console.error(`   ${finding.file}:${finding.line}  “${finding.word}”`);
}
if (findings.length > 60) console.error(`   … và ${findings.length - 60} chỗ nữa`);
process.exit(1);
