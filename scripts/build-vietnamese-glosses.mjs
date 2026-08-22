/**
 * Builds the Vietnamese gloss artifact from English Wiktionary.
 *
 * Why not a model: the first words a learner meets are the ones they have no
 * way to check. A wrong gloss there is not a small error — it is a wrong belief
 * that every later sentence reinforces. Wiktionary glosses were written and
 * revised by people, they carry an edit history, and they can be read back.
 *
 * Translations live in two places on English Wiktionary: inline for short
 * entries, and on a `<word>/translations` subpage once the table grows. Both
 * are fetched, because taking only the inline one silently returns the wrong
 * sense — `water` inline gives `tưới`, the verb, while the noun everyone means
 * is on the subpage.
 *
 * Licence: Wiktionary content is CC BY-SA 4.0 and GFDL. Attribution is by page
 * title, which every row keeps.
 *
 * Run: node scripts/build-vietnamese-glosses.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const CATALOGUE = "src/adapters/vocabulary/cefrj-a1-a2.json";
const OUT = "src/adapters/vocabulary/vietnamese-glosses.json";

/** The API accepts 50 titles per call; anything larger is silently truncated. */
const TITLES_PER_CALL = 50;
/**
 * Wikimedia rate-limits anonymous bursts and answered 429 immediately at 200ms.
 * This is their infrastructure paying for our artifact, so the run is slow on
 * purpose and retries with backoff rather than hammering.
 */
const PAUSE_MS = 1_200;
const MAX_RETRIES = 5;
/** More than this and the gloss stops being a gloss and becomes a paragraph. */
const MAX_SENSES = 3;

const VI_TEMPLATE = /\{\{tt?\+?\|vi\|([^|}]+)/g;
const LATIN_ONLY = /^[A-Za-z\u00C0-\u1EFF\u0300-\u036F\s'\u2019.-]+$/;

async function fetchWikitext(titles) {
  const url = new URL("https://en.wiktionary.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: titles.join("|"),
    format: "json",
    formatversion: "2",
  }).toString();

  let response;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    response = await fetch(url, {
      headers: {
        // Wikimedia's policy asks for a contact in the agent string. A run that
        // nobody can trace back is a run they are right to block.
        "User-Agent":
          "vidlish-glosses/1.0 (https://github.com/Thunderkill016/vidlish)",
        "Accept-Encoding": "gzip",
      },
    });
    if (response.ok) break;
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`Wiktionary returned ${response.status}`);
    }
    const after = Number(response.headers.get("retry-after") ?? 0);
    const wait = after > 0 ? after * 1000 : PAUSE_MS * 2 ** attempt;
    process.stderr.write(`\n  ${response.status}, waiting ${wait}ms\n`);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  if (!response?.ok) {
    throw new Error(`Wiktionary kept returning ${response?.status}`);
  }
  const body = await response.json();
  const pages = new Map();
  for (const page of body.query?.pages ?? []) {
    const text = page.revisions?.[0]?.slots?.main?.content ?? "";
    pages.set(page.title, text);
  }
  return pages;
}

function vietnameseSenses(wikitext) {
  const seen = new Set();
  for (const match of wikitext.matchAll(VI_TEMPLATE)) {
    const value = match[1].trim();
    // Wiktionary marks "this language does not use a word here" rather than
    // leaving the row out. Treating that as a gloss would teach a placeholder.
    if (!value || value.startsWith("{{") || value.includes("[[")) continue;
    // Vietnamese is written in Latin script. Wiktionary also carries Chu Nom
    // for some entries, and a learner shown a different writing system has
    // been handed a puzzle rather than a translation.
    if (!LATIN_ONLY.test(value)) continue;
    seen.add(value);
    if (seen.size >= MAX_SENSES) break;
  }
  return [...seen];
}

const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8"));
const words = catalogue.map((entry) => entry.word);

const inline = new Map();
const subpage = new Map();

for (let at = 0; at < words.length; at += TITLES_PER_CALL) {
  const batch = words.slice(at, at + TITLES_PER_CALL);
  const direct = await fetchWikitext(batch);
  for (const [title, text] of direct) inline.set(title, text);
  await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

  const subs = await fetchWikitext(batch.map((word) => `${word}/translations`));
  for (const [title, text] of subs) {
    subpage.set(title.replace(/\/translations$/, ""), text);
  }
  await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

  process.stderr.write(`\r${Math.min(at + TITLES_PER_CALL, words.length)}/${words.length}`);
}
process.stderr.write("\n");

const glosses = {};
let missing = 0;
for (const word of words) {
  // Subpage first: once a translation table has moved there, the inline
  // remainder is whichever sense was left behind, not the main one.
  const senses = [
    ...vietnameseSenses(subpage.get(word) ?? ""),
    ...vietnameseSenses(inline.get(word) ?? ""),
  ];
  const unique = [...new Set(senses)].slice(0, MAX_SENSES);
  if (unique.length === 0) {
    missing += 1;
    continue;
  }
  glosses[word] = unique;
}

writeFileSync(OUT, `${JSON.stringify(glosses, null, 0)}\n`);
console.log(
  `${Object.keys(glosses).length} of ${words.length} words glossed, ${missing} without a Vietnamese translation`,
);
