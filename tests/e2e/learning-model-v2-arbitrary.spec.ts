import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ retries: 0 });
test.skip(
  process.env.LEARNING_SESSION_REPOSITORY !== "supabase",
  "Reserved for the isolated Supabase-backed CI job.",
);

/**
 * VLR-004, browser half.
 *
 * The durable journey proves the Golden shape well, and only the Golden shape:
 * every id in it — `activity_gist`, `a-member-of` — is a name some layer could
 * be quietly depending on. That is precisely what VLR-001 through VLR-003
 * turned out to be.
 *
 * This drives the learner's own lesson route on a blueprint whose ids nothing
 * recognises, through the real session APIs over HTTP.
 */

const JOB_ID = "b0000000-0000-4000-8000-000000000001";

async function login(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("learning-preview@example.com");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("a long enough password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/start$/);
  await page.goto("/create");
}

async function mockYouTubeIframeApi(page: Page) {
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
            const player = {
              cueVideoById() {},
              loadVideoById() {
                options.events.onStateChange({ target: player, data: 1 });
              },
              playVideo() {},
              pauseVideo() {},
              seekTo() {},
              getCurrentTime: () => 0,
              getPlayerState: () => 1,
              setPlaybackRate() {},
              getAvailablePlaybackRates: () => [0.5, 0.75, 1],
              destroy() {},
            };
            setTimeout(() => options.events.onReady({ target: player }), 0);
            return player;
          },
        };
        window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();
      `,
    });
  });
}

test("a learner studies a lesson whose ids nothing recognises", async ({
  page,
}) => {
  await mockYouTubeIframeApi(page);
  await login(page);

  // The learner's own route, resolved by job id — not the demo lab.
  await page.goto(`/lessons/${JOB_ID}/session`);

  // Rendering at all proves the page parsed a database blueprint through the
  // schema, derived playable media from the transcript, and derived a runtime
  // policy that the blueprint accepted. Any of those failing is a thrown error,
  // not a degraded page.
  await expect(page).toHaveURL(new RegExp(`/lessons/${JOB_ID}/session$`));

  // A session opened over HTTP against the learner's own lesson version: the
  // server resolves which row that is from the job id, the browser never names
  // it. Nothing opens a session on mount — the learner starts it, the same as
  // in the lab — and the listener is armed before the click so the response
  // cannot land first.
  const sessionResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/learning-lab/v2/sessions") &&
      response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page
    .getByRole("button", { name: "Bắt đầu nghe không phụ đề" })
    .click();

  const sessionResponse = await sessionResponsePromise;
  expect([200, 201]).toContain(sessionResponse.status());

  // The first activity is this blueprint's own, not a remembered fixture name.
  const body = (await sessionResponse.json()) as {
    session: { currentActivityId: string };
  };
  expect(body.session.currentActivityId).toMatch(/^step_zq0_/);
  expect(body.session.currentActivityId).not.toBe("activity_gist");
});
