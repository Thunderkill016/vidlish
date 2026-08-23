import { expect, test, type Page } from "@playwright/test";

const SESSION_ID = "22222222-2222-4222-8222-222222222222";

async function login(page: Page) {
  const learnerEmail = `speaking-handoff-${test.info().project.name}@example.com`;
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill(learnerEmail);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

test("completed lesson UI hands the exact session to speaking practice", async ({
  page,
}) => {
  await login(page);
  await page.goto("/learning-lab/v2");

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Object.keys(window.localStorage).find((key) =>
            key.startsWith("vidlish:learning-lab:v4:"),
          ) ?? null,
      ),
    )
    .not.toBeNull();
  const storageKey = await page.evaluate(
    () =>
      Object.keys(window.localStorage).find((key) =>
        key.startsWith("vidlish:learning-lab:v4:"),
      ) ?? null,
  );
  expect(storageKey).toBeTruthy();

  await page.evaluate(
    ({ key, sessionId }) => {
      const state = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<
        string,
        unknown
      >;
      window.localStorage.setItem(
        key,
        JSON.stringify({
          ...state,
          started: true,
          completed: true,
          sessionId,
        }),
      );
    },
    { key: storageKey!, sessionId: SESSION_ID },
  );

  const link = page.getByRole("link", { name: "Nói lại bằng giọng thật" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute(
    "href",
    `/learning-lab/v2/speaking?session=${SESSION_ID}`,
  );
});
