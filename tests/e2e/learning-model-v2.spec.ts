import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

async function mockYouTubeIframeApi(
  page: import("@playwright/test").Page,
) {
  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        window.__vidlishYouTubeCalls = [];
        window.YT = {
          PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
          Player: function (element, options) {
            const iframe = document.createElement("iframe");
            iframe.dataset.mockYoutube = "true";
            element.replaceWith(iframe);
            const player = {
              cueVideoById(input) {
                window.__vidlishYouTubeCalls.push({ method: "cue", input });
              },
              loadVideoById(input) {
                window.__vidlishYouTubeCalls.push({ method: "load", input });
                options.events.onStateChange({ target: player, data: 1 });
              },
              pauseVideo() {
                window.__vidlishYouTubeCalls.push({ method: "pause" });
                options.events.onStateChange({ target: player, data: 2 });
              },
              destroy() { iframe.remove(); },
              getIframe() { return iframe; }
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

test("Learning Model v2 binds real media, requires attempts and resumes", async ({
  page,
}) => {
  await mockYouTubeIframeApi(page);
  await login(page);
  await page.goto("/learning-lab/v2");

  await expect(
    page.getByRole("heading", {
      name: "Không đọc một bài dài. Hãy hoàn thành một vòng học.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Sau phiên này, bạn có thể")).toBeVisible();
  await expect(page.getByText("Evidence từ transcript canonical")).toHaveCount(0);

  await page.getByRole("button", { name: "Bắt đầu với ý chính" }).click();
  await expect(page.getByText("Bước 1/5 · Nắm ý chính")).toBeVisible();
  await expect(page.getByTestId("youtube-player")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bật phụ đề" })).toHaveCount(0);
  await expect(page.getByText(/lượt nghe đầu ẩn phụ đề/i)).toBeVisible();

  await page.getByRole("button", { name: "Phát đoạn" }).click();
  await expect(page.getByText("Đang phát đoạn 0:16–0:24.")).toBeVisible();
  const mediaCall = await page.evaluate(() => {
    const calls = (
      window as typeof window & {
        __vidlishYouTubeCalls?: Array<{
          method: string;
          input?: { videoId: string; startSeconds: number; endSeconds: number };
        }>;
      }
    ).__vidlishYouTubeCalls;
    return calls?.find((call) => call.method === "load");
  });
  expect(mediaCall?.input).toEqual({
    videoId: "M7lc1UVf-VE",
    startSeconds: 16,
    endSeconds: 24,
  });

  await page
    .getByLabel("Các cách tùy chỉnh trình phát YouTube nhúng")
    .check();
  await page.getByRole("button", { name: "Gửi attempt" }).click();

  await expect(page.getByText("Đúng", { exact: true })).toBeVisible();
  await expect(page.getByText("Evidence từ transcript canonical")).toBeVisible();
  await expect(
    page.getByText(/different ways of customizing the YouTube-embedded player/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Bật phụ đề" })).toBeVisible();

  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();

  // Lab progress survives a page reload, while private free-text responses are
  // intentionally not written to local storage.
  await page.reload();
  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bật phụ đề" })).toBeVisible();

  await page.getByLabel("Giới thiệu người nói thuộc một đội").check();
  await page.getByRole("button", { name: "Gửi attempt" }).click();
  await expect(page.getByText("a member of", { exact: true })).toBeVisible();
  await expect(page.getByText(/Register: neutral/)).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 3/5 · Tự nhớ lại")).toBeVisible();
  await page
    .getByLabel("Complete: I'm ___ the Developer Relations team.")
    .fill("a member of");
  await page.getByRole("button", { name: "Gửi attempt" }).click();
  await expect(page.getByText("Bạn đã nhớ lại đúng toàn bộ cụm.")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(
    page.getByText("Bước 4/5 · Dùng trong tình huống mới"),
  ).toBeVisible();
  await page
    .getByLabel(
      "Viết một câu giới thiệu bạn là thành viên của nhóm bằng a member of.",
    )
    .fill("I'm a member of the release team.");
  await page.getByRole("button", { name: "Gửi attempt" }).click();
  await expect(page.getByText("Tự đối chiếu sau khi đã viết")).toBeVisible();
  await expect(
    page.getByText("Ví dụ mới, không phải câu trong video:"),
  ).toBeVisible();
  await expect(page.getByText("Đúng", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Chưa đúng", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 5/5 · Kết thúc")).toBeVisible();
  await page
    .getByLabel("Bạn cần nghe lại ý chính hay luyện dùng chunk thêm?")
    .fill("Tôi muốn luyện dùng chunk thêm trong một tình huống mới.");
  await page.getByRole("button", { name: "Gửi attempt" }).click();
  await expect(page.getByText(/không phải điểm năng lực khách quan/i)).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tất phiên" }).click();

  await expect(
    page.getByRole("heading", { name: "Bạn đã nghe, nhớ lại và vận dụng." }),
  ).toBeVisible();
  await expect(page.getByText(/không được coi là mastery/i)).toBeVisible();
});
