import { expect, test, type Page, type Request } from "@playwright/test";

import { signIn } from "./_sign-in";

async function mockYouTubeWithManualEnd(page: Page) {
  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        window.YT = {
          PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
          Player: function (element, options) {
            const iframe = document.createElement("iframe");
            iframe.dataset.mockYoutube = "true";
            element.replaceWith(iframe);
            let rate = 1;
            const player = {
              cueVideoById() {},
              loadVideoById() {
                options.events.onStateChange({ target: player, data: 1 });
              },
              pauseVideo() {
                options.events.onStateChange({ target: player, data: 2 });
              },
              destroy() { iframe.remove(); },
              getIframe() { return iframe; },
              getAvailablePlaybackRates() { return [0.5, 0.75, 1, 1.5, 2]; },
              getPlaybackRate() { return rate; },
              setPlaybackRate(next) {
                rate = next;
                options.events.onPlaybackRateChange?.({ target: player, data: next });
              }
            };
            window.__vidlishFinishCurrentClip = function () {
              options.events.onStateChange({ target: player, data: 0 });
            };
            setTimeout(() => options.events.onReady({ target: player }), 0);
            return player;
          }
        };
        setTimeout(() => window.onYouTubeIframeAPIReady?.(), 0);
      `,
    });
  });
}

function postBody(request: Request): Record<string, unknown> {
  return request.postDataJSON() as Record<string, unknown>;
}

function productEventResponse(
  page: Page,
  eventKind: "source_play_completed" | "correction_shown",
) {
  return page.waitForResponse((response) => {
    if (!response.url().endsWith("/api/learning-lab/v2/product-events")) {
      return false;
    }
    const request = response.request();
    if (request.method() !== "POST") return false;
    try {
      return postBody(request).eventKind === eventKind;
    } catch {
      return false;
    }
  });
}

test("Golden measurement separates play start, confirmed end and rendered correction without learner content", async ({
  page,
}) => {
  await mockYouTubeWithManualEnd(page);
  await signIn(page, "invited@example.com");

  const productBodies: Record<string, unknown>[] = [];
  const supportBodies: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    try {
      if (
        request.method() === "POST" &&
        request.url().endsWith("/api/learning-lab/v2/product-events")
      ) {
        productBodies.push(postBody(request));
      }
      if (
        request.method() === "POST" &&
        request.url().endsWith("/api/learning-lab/v2/support-events")
      ) {
        supportBodies.push(postBody(request));
      }
    } catch {
      // Malformed request bodies are asserted by route/contract tests, not by
      // this browser observer.
    }
  });

  await page.goto("/learning-lab/v2");
  await page
    .getByRole("button", { name: "Bắt đầu nghe không phụ đề" })
    .click();
  await expect(page.getByText("Bước 1/5 · Nắm ý chính")).toBeVisible();

  const playbackResponse = page.waitForResponse((response) => {
    if (!response.url().endsWith("/api/learning-lab/v2/support-events")) {
      return false;
    }
    try {
      return postBody(response.request()).eventKind === "playback";
    } catch {
      return false;
    }
  });
  await page.getByRole("button", { name: "Phát đoạn" }).click();
  expect((await playbackResponse).ok()).toBe(true);

  // A play click proves only that playback started. There must still be no
  // source-completed product fact until the player itself reports ENDED.
  expect(
    productBodies.some((body) => body.eventKind === "source_play_completed"),
  ).toBe(false);
  expect(
    supportBodies.some((body) => body.eventKind === "playback"),
  ).toBe(true);

  const completedResponse = productEventResponse(page, "source_play_completed");
  await page.evaluate(() => {
    const finish = (
      window as typeof window & { __vidlishFinishCurrentClip?: () => void }
    ).__vidlishFinishCurrentClip;
    if (!finish) throw new Error("Mock YouTube player has no finish callback.");
    finish();
  });
  expect((await completedResponse).ok()).toBe(true);

  // Now deliberately produce an incorrect durable attempt. `correction_shown`
  // is emitted by a React effect after the result panel commits, not inferred
  // just because an incorrect attempt exists in the database.
  await page.getByLabel("Cách chọn phần cứng quay video").check();
  const correctionResponse = productEventResponse(page, "correction_shown");
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(page.getByText("Chưa đúng", { exact: true })).toBeVisible();
  expect((await correctionResponse).ok()).toBe(true);

  expect(productBodies.map((body) => body.eventKind)).toEqual(
    expect.arrayContaining(["source_play_completed", "correction_shown"]),
  );

  for (const body of productBodies) {
    expect(Object.keys(body).sort()).toEqual(
      expect.arrayContaining([
        "activityId",
        "eventKind",
        "idempotencyKey",
        "sessionId",
      ]),
    );
    expect(body).not.toHaveProperty("text");
    expect(body).not.toHaveProperty("response");
    expect(body).not.toHaveProperty("message");
    expect(body).not.toHaveProperty("caption");
    expect(body).not.toHaveProperty("transcript");
    expect(JSON.stringify(body)).not.toContain(
      "Đoạn mở đầu không nói về phần cứng quay phim",
    );
    expect(JSON.stringify(body)).not.toContain(
      "I'm a member of the Developer Relations team.",
    );
  }
});
