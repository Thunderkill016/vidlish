/**
 * Searches ERIC and downloads the full text of what it finds.
 *
 * The reason this exists: the best single source of teaching documents found
 * for this product — Paul Nation's resource page at Victoria University — is
 * behind an IP-level block that returns 403 to anything that is not a browser.
 * No attempt was made to get round it; it is their infrastructure and the block
 * is deliberate.
 *
 * ERIC is the way in. It is the US Department of Education's index of education
 * research, its API needs no key, and `files.eric.ed.gov` serves full-text PDFs
 * openly. Almost every meta-analysis this product's rules rest on has a record
 * there.
 *
 * The point is not convenience. Twice today a conclusion was drawn from a
 * README or a summary and turned out to be wrong when the source was opened —
 * a repository that "uses spaced repetition" and has none, and a vocabulary
 * figure this codebase computed itself and then quoted as if it were published.
 * A command that fetches the actual paper is what stops that happening again.
 *
 *   node scripts/research/eric.mjs "extensive reading meta-analysis"
 *   node scripts/research/eric.mjs --get EJ1479870
 *
 * Downloads land in `docs/research/` and are git-ignored: they are sources to
 * read, not artifacts to ship. Quote them with their ERIC id so the next reader
 * can fetch the same file.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.normalize("docs/research");
const UA = "Nep-LearningResearch/1.0 (English learning app; contact via repository)";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/research/eric.mjs "<query>" | --get <ERIC id>');
  process.exit(1);
}

/**
 * ERIC's API answers 504 to perfectly valid queries often enough that a single
 * attempt reads as "no such research". Backing off and retrying is the
 * difference between finding a paper and inventing a number.
 */
async function fetchText(url, attempts = 4) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      const wait = 2000 * 2 ** (attempt - 1);
      console.error(`  … ${lastStatus}, thử lại sau ${wait / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    const response = await fetch(url, { headers: { "User-Agent": UA } });
    if (response.ok) return response.text();
    lastStatus = response.status;
    // A 4xx is our fault and will not fix itself.
    if (response.status < 500) break;
  }
  throw new Error(`${lastStatus} ${url}`);
}

/** Full text is only ever fetched from ERIC's own open file host. */
async function download(id) {
  mkdirSync(OUT, { recursive: true });
  const pdf = path.join(OUT, `${id}.pdf`);
  const txt = path.join(OUT, `${id}.txt`);

  if (!existsSync(pdf)) {
    const response = await fetch(`https://files.eric.ed.gov/fulltext/${id}.pdf`, {
      headers: { "User-Agent": UA },
    });
    if (!response.ok) {
      console.error(`  ✘ ${id}: không có toàn văn mở (${response.status})`);
      return null;
    }
    writeFileSync(pdf, Buffer.from(await response.arrayBuffer()));
  }

  // `pdftotext -layout` keeps tables readable, which is the whole reason to
  // fetch a paper rather than a summary of it.
  execFileSync("pdftotext", ["-layout", pdf, txt]);
  console.log(`  ✓ ${txt}`);
  return txt;
}

if (args[0] === "--get") {
  for (const id of args.slice(1)) await download(id);
} else {
  const query = args.join(" ");
  // Plain keywords. The fielded form (`title:"..."`) silently returns nothing
  // on this API, which reads as "no such research" rather than "bad query" —
  // the failure mode that would send the next reader off to invent a figure.
  const url =
    "https://api.ies.ed.gov/eric/?search=" +
    encodeURIComponent(query) +
    "&format=json&rows=12&fields=id,title,author,publicationdateyear,source";

  const body = JSON.parse(await fetchText(url));

  const docs = body?.response?.docs ?? [];
  if (docs.length === 0) {
    console.log("không có kết quả");
    process.exit(0);
  }
  for (const doc of docs) {
    console.log(
      `${String(doc.id).padEnd(11)} ${String(doc.publicationdateyear ?? "").padEnd(5)} ${String(doc.title ?? "").slice(0, 84)}`,
    );
  }
  console.log(`\nTải toàn văn: node scripts/research/eric.mjs --get ${docs[0].id}`);
}
