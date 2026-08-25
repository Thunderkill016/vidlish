import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { shelfTextById } from "@/adapters/reading/shelf";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";

import { PassageReader } from "../_components/passage-reader";

export const dynamic = "force-dynamic";

export default async function ReadTextPage({
  params,
}: {
  params: Promise<{ textId: string }>;
}) {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const { textId } = await params;
  const text = shelfTextById(textId);
  if (!text) notFound();

  const known = await (await createBeginnerProgressRepository()).knownWords(access.userId);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/read"
          className="text-sm font-semibold text-[var(--primary)]"
        >
          ← Kệ sách
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{text.title}</h1>
      </div>

      <PassageReader paragraphs={text.paragraphs} known={known} learning={[]} />

      {/* Attribution ships with the text rather than being remembered later:
          Simple English Wikipedia is CC BY-SA 4.0, verified against the site's
          own API, and that licence requires it. */}
      <p className="text-xs leading-6 text-[var(--muted-foreground)]">
        Nguồn:{" "}
        <a
          href={text.source.url}
          className="font-semibold text-[var(--primary)]"
          target="_blank"
          rel="noreferrer"
        >
          {text.title} — Simple English Wikipedia
        </a>
        {text.source.revision ? ` (bản ${text.source.revision})` : null}. Giấy phép{" "}
        <a
          href={text.source.licence.url}
          className="font-semibold text-[var(--primary)]"
          target="_blank"
          rel="noreferrer"
        >
          {text.source.licence.name}
        </a>
        . Nội dung giữ nguyên, không sửa.
      </p>
    </div>
  );
}
