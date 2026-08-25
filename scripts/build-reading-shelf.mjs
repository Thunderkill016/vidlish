/**
 * Builds the shelf of real English the learner reads.
 *
 * Two decisions here are not preferences, and both come from the same 2025
 * meta-analysis of extensive reading (34 studies, 3,942 learners): effects were
 * larger when learners' text choice was **limited** and when some form of
 * accountability was included. Every popular reading product says the opposite —
 * bring anything you like. So this ships a bounded shelf rather than a search box.
 *
 * The articles are grouped by topic on purpose too. Narrow reading — several
 * texts on one theme — repeats low-frequency vocabulary far more than texts
 * pulled from unrelated sources, and repetition is the scarce resource: more
 * than 8 encounters for a 50% chance of recognising a word's form, more than 14
 * for its meaning.
 *
 * Licence, checked against the API rather than assumed: Simple English Wikipedia
 * is CC BY-SA 4.0. That permits reproduction and requires attribution. Every
 * article therefore ships with its title, canonical URL, revision id and licence,
 * and the reader shows them. Nothing here is rewritten, so no adaptation is made.
 *
 *   node scripts/build-reading-shelf.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "src/adapters/reading/shelf.json";
const API = "https://simple.wikipedia.org/w/api.php";
const LICENCE = {
  name: "Creative Commons Attribution-Share Alike 4.0",
  url: "https://creativecommons.org/licenses/by-sa/4.0/",
};

/**
 * Bounded, and grouped so consecutive texts recycle the same words.
 *
 * Chosen around what this learner actually works on — software — because
 * interest is the one moderator no design substitutes for, and because the
 * authored syllabus already teaches much of this vocabulary.
 */
const SHELF = [
  {
    topic: "Máy tính và phần mềm",
    titles: ["Computer_programming", "Computer_program", "Software", "Computer", "Internet"],
  },
  {
    topic: "Đời sống hằng ngày",
    titles: ["Food", "Sleep", "Weather", "Money", "Family"],
  },
];

async function fetchArticle(title) {
  const url =
    `${API}?action=query&prop=extracts|revisions&explaintext=1&exsectionformat=plain` +
    `&rvprop=ids&format=json&formatversion=2&titles=${encodeURIComponent(title)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Nep-Reading-Shelf/1.0 (educational use)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const page = (await response.json()).query.pages[0];
  if (page.missing) throw new Error("không có bài này");

  // Keep only prose. Headings arrive as short lines with no full stop, and a
  // heading rendered as a paragraph reads to a beginner as a broken sentence.
  const paragraphs = String(page.extract ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes(".") && line.split(/\s+/).length >= 12);

  return {
    id: `simplewiki-${page.pageid}`,
    title: page.title,
    paragraphs,
    words: paragraphs.join(" ").split(/\s+/).length,
    source: {
      url: `https://simple.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      revision: page.revisions?.[0]?.revid ?? null,
      licence: LICENCE,
    },
  };
}

const shelf = [];
for (const group of SHELF) {
  const texts = [];
  for (const title of group.titles) {
    try {
      const article = await fetchArticle(title);
      if (article.paragraphs.length === 0) {
        console.log(`  · ${title}: không có đoạn văn xuôi nào, bỏ qua`);
        continue;
      }
      texts.push(article);
      console.log(`  ✓ ${article.title.padEnd(24)} ${String(article.words).padStart(5)} từ`);
    } catch (error) {
      // One unreachable article must not cost the whole shelf.
      console.log(`  ✘ ${title}: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (texts.length > 0) shelf.push({ topic: group.topic, texts });
}

mkdirSync("src/adapters/reading", { recursive: true });
writeFileSync(OUT, `${JSON.stringify(shelf, null, 2)}\n`);

const texts = shelf.flatMap((group) => group.texts);
const total = texts.reduce((sum, text) => sum + text.words, 0);
console.log(`\n${shelf.length} chủ đề · ${texts.length} bài · ${total.toLocaleString("vi-VN")} từ`);
console.log("Mốc để các mẫu bắt đầu lặp lại có ích: 60.000 từ");
