import { videoIdSchema } from "@/shared/contracts/video";
import { videoErrors } from "@/shared/errors/product-error";

const watchHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

function validateId(value: string | null | undefined): string {
  const parsed = videoIdSchema.safeParse(value);
  if (!parsed.success) throw videoErrors.invalidUrl();
  return parsed.data;
}

function meaningfulSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

export function parseYouTubeUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw videoErrors.invalidUrl();
  }

  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username ||
    parsed.password
  ) {
    throw videoErrors.invalidUrl();
  }

  const host = parsed.hostname.toLowerCase();
  const segments = meaningfulSegments(parsed.pathname);

  if (host === "youtu.be") {
    if (segments.length !== 1) throw videoErrors.invalidUrl();
    return validateId(segments[0]);
  }

  if (!watchHosts.has(host)) throw videoErrors.invalidUrl();

  if (segments.length === 1 && segments[0] === "watch") {
    const candidates = parsed.searchParams.getAll("v");
    if (candidates.length !== 1) throw videoErrors.invalidUrl();
    return validateId(candidates[0]);
  }

  if (
    segments.length === 2 &&
    (segments[0] === "shorts" || segments[0] === "embed")
  ) {
    return validateId(segments[1]);
  }

  throw videoErrors.invalidUrl();
}
