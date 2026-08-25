/**
 * Builds the grammar inventory a course has to cover to be called A1.
 *
 * "Comprehensive" was a claim nobody could check. The syllabus had four units
 * and a free-text `grammarFeatures` field holding phrases like `negative with
 * don't`, which no test could compare against anything. So the honest question —
 * how much of A1 does this course actually teach? — had no answer.
 *
 * The CEFR-J Grammar Profile is that answer's other half: the published
 * inventory of grammatical items per CEFR sub-level, from the same laboratory
 * as the vocabulary profile. With it, coverage stops being a claim and becomes
 * a fraction a test can print.
 *
 * Source: CEFR-J Grammar Profile (2018-03-15), openlanguageprofiles/olp-en-cefrj.
 * Copyright Tono Laboratory, Tokyo University of Foreign Studies. Free for
 * research and commercial use with citation.
 *
 * Run: node scripts/build-cefrj-grammar-profile.mjs
 */
import { writeFileSync } from "node:fs";

const SOURCE =
  "https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-grammar-profile-20180315.csv";
const OUT = "src/adapters/vocabulary/cefrj-grammar-a1-a2.json";

/** Only the levels this product teaches. B1 upwards is not a course yet. */
const KEPT = /^(A1|A1\.1|A1\.2|A1\.3|A2|A2\.1|A2\.2)$/;

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`grammar profile fetch failed: ${response.status}`);
const csv = await response.text();

/** The file is comma-separated with quoted fields that contain commas. */
function splitRow(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (const character of line) {
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += character;
  }
  cells.push(cell);
  return cells;
}

const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
const header = splitRow(lines[0]).map((cell) => cell.trim());
const iCode = header.indexOf("Shorthand Code");
const iItem = header.indexOf("Grammatical Item");
const iType = header.indexOf("Sentence Type");
const iLevel = header.indexOf("CEFR-J Level");
if (iCode < 0 || iItem < 0 || iLevel < 0) {
  throw new Error(`unexpected grammar profile header: ${header.join(",")}`);
}

const items = [];
const seen = new Set();
for (const line of lines.slice(1)) {
  const cells = splitRow(line);
  const level = (cells[iLevel] ?? "").trim();
  if (!KEPT.test(level)) continue;
  const code = (cells[iCode] ?? "").trim();
  const item = (cells[iItem] ?? "").trim();
  if (!code || !item || seen.has(code)) continue;
  seen.add(code);
  items.push({
    code,
    item,
    sentenceType: (cells[iType] ?? "").trim(),
    // A1.1 / A1.2 / A1.3 collapse to the band the course plans in; the
    // sub-level is kept because it is the teaching order.
    band: level.split(".")[0],
    level,
  });
}

items.sort((left, right) =>
  left.level === right.level
    ? left.code.localeCompare(right.code, "en", { numeric: true })
    : left.level.localeCompare(right.level),
);

writeFileSync(OUT, `${JSON.stringify(items, null, 2)}\n`);

const perLevel = new Map();
for (const entry of items) perLevel.set(entry.level, (perLevel.get(entry.level) ?? 0) + 1);
console.log(`${items.length} mục ngữ pháp A1-A2`);
for (const [level, count] of [...perLevel.entries()].sort()) {
  console.log(`  ${level.padEnd(5)} ${count}`);
}
