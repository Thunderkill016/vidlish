import Image from "next/image";

import type { PlayableVideoMetadata } from "@/modules/video";
import { Card } from "@/shared/ui/card";

function formatDuration(durationMs: number | undefined): string | null {
  if (durationMs === undefined) return null;
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VideoMetadataPreview({
  metadata,
}: {
  metadata: PlayableVideoMetadata;
}) {
  const duration = formatDuration(metadata.durationMs);

  return (
    <Card className="overflow-hidden p-0" data-testid="video-metadata-preview">
      <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
        {metadata.thumbnailUrl ? (
          <div className="relative aspect-video bg-[var(--muted)] sm:aspect-auto sm:min-h-32">
            <Image
              src={metadata.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 220px"
              className="object-cover"
              priority={false}
            />
          </div>
        ) : null}
        <div className="space-y-2 p-5">
          <p className="text-sm font-semibold text-[var(--accent)]">Video có thể tiếp tục</p>
          <h2 className="text-lg font-bold leading-snug">{metadata.title}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {metadata.channelName}
            {duration ? ` · ${duration}` : ""}
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Vidlish sẽ kiểm tra transcript và nội dung tiếng Anh ở các bước sau.
          </p>
        </div>
      </div>
    </Card>
  );
}
