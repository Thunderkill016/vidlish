/**
 * Searches the scholarly record, follows citation chains, and fetches full text.
 *
 * Why this exists, stated plainly: most of the "research" behind this repo's
 * rules was read off web-search summaries — a small model's paraphrase of titles
 * and snippets. That is a second-hand source. It produced usable numbers and it
 * also produced two wrong conclusions that only came apart when the actual paper
 * was opened: an extensive-reading effect size quoted from the wrong
 * meta-analysis, and a duration measured off a file instead of off speech.
 *
 * A summary cannot tell you what a paper's control condition was, whether its
 * design had a control group at all, or what cites it and says it was wrong.
 * Citation chains can. This walks them.
 *
 * OpenAlex is the backbone: 250M+ works, no API key, and it reports open-access
 * locations directly. ERIC (scripts/research/eric.mjs) stays for education
 * full texts; this covers everything else and, unlike ERIC, knows what cites
 * what.
 *
 *   node scripts/research/scholar.mjs "vocabulary coverage threshold"
 *   node scripts/research/scholar.mjs --since 2015 --oa "shadowing pronunciation"
 *   node scripts/research/scholar.mjs --cites W2145678901      # who cites it
 *   node scripts/research/scholar.mjs --refs  W2145678901      # what it cites
 *   node scripts/research/scholar.mjs --get   W2145678901      # full text
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const API = "https://api.openalex.org";
/** OpenAlex asks for a contact address to put callers in the faster pool. */
const MAILTO = "dinhbahoang1605@gmail.com";
const OUT_DIR = "docs/research";

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? null : args[at + 1];
};
const has = (name) => args.includes(name);

async function get(path) {
  let lastReason = "không rõ";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let response;
    try {
      response = await fetch(`${API}${path}${path.includes("?") ? "&" : "?"}mailto=${MAILTO}`);
    } catch (error) {
      // A dropped connection is not an HTTP status, and catching only statuses
      // let one timeout kill a whole citation walk. Same backoff, same ceiling.
      lastReason = error instanceof Error ? error.message : String(error);
      const wait = 2 ** attempt;
      process.stderr.write(`  … mạng lỗi, thử lại sau ${wait}s\n`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      lastReason = `HTTP ${response.status}`;
      const wait = 2 ** attempt;
      process.stderr.write(`  … ${response.status}, thử lại sau ${wait}s\n`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`OpenAlex ${response.status} cho ${path}`);
  }
  throw new Error(`OpenAlex không trả lời sau 4 lần (${lastReason})`);
}

const shortId = (url) => String(url ?? "").replace("https://openalex.org/", "");

function line(work) {
  const id = shortId(work.id).padEnd(12);
  const year = String(work.publication_year ?? "????");
  const cites = String(work.cited_by_count ?? 0).padStart(5);
  const oa = work.open_access?.is_oa ? "mở " : "   ";
  const venue = (work.primary_location?.source?.display_name ?? "").slice(0, 26).padEnd(26);
  const title = (work.title ?? "(không tên)").slice(0, 74);
  return `${id} ${year} ${cites}↑ ${oa}${venue} ${title}`;
}

/** Rebuilds the abstract OpenAlex stores as a word-position index. */
function abstractOf(work) {
  const index = work.abstract_inverted_index;
  if (!index) return null;
  const words = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) words[position] = word;
  }
  return words.join(" ");
}

async function search(query) {
  const filters = ["type:article"];
  const since = flag("--since");
  if (since) filters.push(`from_publication_date:${since}-01-01`);
  if (has("--oa")) filters.push("is_oa:true");

  const path =
    `/works?search=${encodeURIComponent(query)}` +
    `&filter=${filters.join(",")}` +
    `&sort=relevance_score:desc&per-page=${flag("--n") ?? 15}`;
  const data = await get(path);

  console.log(`${data.meta.count.toLocaleString("vi-VN")} kết quả · hiện ${data.results.length}\n`);
  for (const work of data.results) console.log(line(work));
  console.log(`\nToàn văn: node scripts/research/scholar.mjs --get <ID>`);
  console.log(`Ai trích dẫn: --cites <ID>   ·   Nó trích dẫn ai: --refs <ID>`);
}

async function citedBy(id) {
  const data = await get(
    `/works?filter=cites:${id},type:article&sort=cited_by_count:desc&per-page=${flag("--n") ?? 15}`,
  );
  console.log(`${data.meta.count} công trình trích dẫn ${id}\n`);
  for (const work of data.results) console.log(line(work));
}

async function references(id) {
  const work = await get(`/works/${id}`);
  const ids = (work.referenced_works ?? []).map(shortId);
  console.log(`"${work.title}" trích dẫn ${ids.length} công trình\n`);
  if (ids.length === 0) return;
  // OpenAlex takes a pipe-joined id list, capped well below the 100 limit.
  const batch = ids.slice(0, 50).join("|");
  const data = await get(`/works?filter=openalex_id:${batch}&per-page=50&sort=cited_by_count:desc`);
  for (const cited of data.results) console.log(line(cited));
}

async function fullText(id) {
  const work = await get(`/works/${id}`);
  console.log(`${work.title}\n${work.publication_year} · ${work.cited_by_count} trích dẫn\n`);

  const abstract = abstractOf(work);
  if (abstract) console.log(`TÓM TẮT\n${abstract}\n`);

  const pdf =
    work.best_oa_location?.pdf_url ??
    work.primary_location?.pdf_url ??
    work.open_access?.oa_url;
  if (!pdf) {
    console.log("Không có bản mở để tải. DOI:", work.doi ?? "(không có)");
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const stem = `${OUT_DIR}/${shortId(work.id)}`;
  if (existsSync(`${stem}.txt`)) {
    console.log(`Đã có: ${stem}.txt`);
    return;
  }

  const response = await fetch(pdf, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) {
    console.log(`Không tải được (${response.status}): ${pdf}`);
    return;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const isPdf = bytes.subarray(0, 4).toString() === "%PDF";
  writeFileSync(`${stem}${isPdf ? ".pdf" : ".html"}`, bytes);

  if (!isPdf) {
    console.log(`Không phải PDF, đã lưu: ${stem}.html`);
    return;
  }
  try {
    execFileSync("pdftotext", [`${stem}.pdf`, `${stem}.txt`]);
    console.log(`✓ ${stem}.txt`);
  } catch {
    console.log(`Đã lưu ${stem}.pdf nhưng không trích được chữ (thiếu pdftotext)`);
  }
}

const cites = flag("--cites");
const refs = flag("--refs");
const target = flag("--get");
const query = args.filter((a) => !a.startsWith("--")).filter((a, i, all) => {
  // Drop values that belong to a flag.
  const previous = args[args.indexOf(a) - 1];
  return !["--since", "--n", "--cites", "--refs", "--get"].includes(previous ?? "");
}).join(" ");

if (cites) await citedBy(cites);
else if (refs) await references(refs);
else if (target) await fullText(target);
else if (query) await search(query);
else console.log("Cần một truy vấn. Xem phần chú thích đầu tệp.");
