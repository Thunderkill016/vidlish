import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.describe.configure({ retries: 0 });
test.skip(
  process.env.LEARNING_SESSION_REPOSITORY !== "supabase",
  "This specification is reserved for the isolated Supabase-backed CI job.",
);

async function login(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByLabel("Email được mời")
    .fill("learning-preview@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
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

test("Golden Session UI persists retry transfer completion and privacy-safe evidence", async ({
  page,
}) => {
  await mockYouTubeIframeApi(page);
  await login(page);
  await page.goto("/learning-lab/v2");

  await page
    .getByRole("button", { name: "Bắt đầu nghe không phụ đề" })
    .click();
  await expect(page.getByText("Bước 1/5 · Nắm ý chính")).toBeVisible();

  await page.getByLabel("Cách chọn phần cứng quay video").check();
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(page.getByText("Chưa đúng", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();

  await page.getByRole("button", { name: "Thử lại" }).click();
  await page
    .getByLabel("Các cách tùy chỉnh trình phát YouTube nhúng")
    .check();
  await page.getByRole("button", { name: "Gửi lần thử lại" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();

  await page.getByLabel("Giới thiệu người nói thuộc một đội").check();
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

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
  await expect(
    page.getByText("Đã xác nhận đủ tiêu chí cho lần thử này."),
  ).toBeVisible();
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

  const localState = await page.evaluate(() =>
    Object.values(localStorage).join("\n"),
  );
  expect(localState).not.toContain("I'm a member of the release team.");
  expect(localState).not.toContain("a member of\"");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  expect(supabaseUrl).toBeTruthy();
  expect(serviceKey).toBeTruthy();
  const admin = createClient(supabaseUrl!, serviceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: sessions, error: sessionsError } = await admin
    .from("lesson_sessions")
    .select("id,status,current_phase,current_activity_id,completed_at")
    .eq("owner_user_id", "133f314f-4bfd-46aa-8fc6-b6a33252232b")
    .eq("lesson_version_id", "77777777-7777-4777-8777-777777777777");
  expect(sessionsError).toBeNull();
  expect(sessions).toHaveLength(1);
  expect(sessions?.[0]).toMatchObject({
    status: "completed",
    current_phase: "completed",
    current_activity_id: "activity_exit",
  });
  expect(sessions?.[0]?.completed_at).toBeTruthy();

  const sessionId = sessions?.[0]?.id as string;
  const { data: attempts, error: attemptsError } = await admin
    .from("activity_attempts")
    .select("activity_id,attempt_number,response,evaluation")
    .eq("session_id", sessionId)
    .order("submitted_at", { ascending: true });

  expect(attemptsError).toBeNull();
  expect(
    attempts?.map((attempt) => [
      attempt.activity_id,
      attempt.attempt_number,
      (attempt.evaluation as { verdict?: string }).verdict,
    ]),
  ).toEqual([
    ["activity_gist", 1, "incorrect"],
    ["activity_gist", 2, "correct"],
    ["activity_meaning", 1, "correct"],
    ["activity_recall", 1, "correct"],
    ["activity_transfer", 1, "self_check"],
    ["activity_transfer", 2, "self_check"],
    ["activity_exit", 1, "unscored"],
  ]);

  for (const attempt of attempts ?? []) {
    const response = attempt.response as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(response, "text")).toBe(false);
  }
  expect(attempts?.[4]?.response).toMatchObject({
    kind: "self_check",
    checkedCriteria: [],
  });
  expect(attempts?.[5]?.response).toMatchObject({
    kind: "self_check",
    checkedCriteria: [0, 1, 2],
  });
});
