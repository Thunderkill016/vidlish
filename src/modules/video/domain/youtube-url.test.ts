import { describe, expect, it } from "vitest";

import { parseYouTubeUrl } from "@/modules/video/domain/youtube-url";

const id = "dQw4w9WgXcQ";

describe("parseYouTubeUrl", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${id}`, id],
    [`https://youtube.com/watch?v=${id}&list=PL123&t=42s`, id],
    [`https://m.youtube.com/watch?v=${id}&feature=share`, id],
    [`https://music.youtube.com/watch?v=${id}&si=tracking`, id],
    [`https://youtu.be/${id}?t=42`, id],
    [`http://youtu.be/${id}`, id],
    [`https://www.youtube.com/shorts/${id}?si=tracking`, id],
    [`https://www.youtube.com/embed/${id}#start=10`, id],
  ])("parses supported URL %s", (url, expected) => {
    expect(parseYouTubeUrl(url)).toBe(expected);
  });

  it.each([
    "",
    id,
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch",
    "https://youtube.com/watch?v=dQw4w9WgXcQ&v=aaaaaaaaaaa",
    "https://youtube.com/playlist?list=PL123",
    "https://youtube.com/channel/UC123",
    "https://youtube.com/live/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ/extra",
    "https://youtube.com/shorts/dQw4w9WgXcQ/extra",
    "https://youtube.com/watch?v=https://youtu.be/dQw4w9WgXcQ",
    "https://youtube.com/watch?v=%64Qw4w9WgXcQ",
    "javascript:alert(1)",
  ])("rejects unsupported or hostile URL %s", (url) => {
    expect(() => parseYouTubeUrl(url)).toThrowError(
      expect.objectContaining({ code: "VIDEO_URL_INVALID" }),
    );
  });
});
