import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("fresh@example.com");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("a long enough password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/start$/);
  await page.goto("/create");
}

async function mockYouTubeIframeApi(
  page: import("@playwright/test").Page,
) {
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
              pauseVideo() {
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

async function submitAndContinue(
  page: import("@playwright/test").Page,
  label: string,
) {
  await page.getByLabel(label).check();
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
}

test("golden session remains usable without horizontal overflow on a narrow mobile viewport", async (
  { page },
  testInfo,
) => {
  test.skip(
    testInfo.project.name !== "mobile-chromium",
    "This is the dedicated journey for the real mobile-emulation project.",
  );

  await mockYouTubeIframeApi(page);
  await login(page);
  await page.goto("/learning-lab/v2");

  await page
    .getByRole("button", { name: "Bắt đầu nghe không phụ đề" })
    .click();
  await expect(page.getByText("Bước 1/5 · Nắm ý chính")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);

  await submitAndContinue(
    page,
    "Các cách tùy chỉnh trình phát YouTube nhúng",
  );
  await submitAndContinue(page, "Giới thiệu người nói thuộc một đội");

  await page
    .getByLabel("Complete: I'm ___ the Developer Relations team.")
    .fill("a member of");
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await page
    .getByLabel(
      "Viết một câu giới thiệu bạn là thành viên của nhóm bằng a member of.",
    )
    .fill("I'm a member of the release team.");
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  const criteria = page.locator('input[type="checkbox"]');
  await criteria.nth(0).check();
  await criteria.nth(1).check();
  await criteria.nth(2).check();
  await page.getByRole("button", { name: "Xác nhận đủ tiêu chí" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await page
    .getByLabel(
      "Không nhìn câu mẫu: bạn nghe được cách nói nào để giới thiệu người nói thuộc một nhóm?",
    )
    .fill("a member of");
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await page.getByRole("button", { name: "Hoàn tất phiên" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Bạn đã tạo được evidence cho lần học hôm nay.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
});
