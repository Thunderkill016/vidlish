import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill(email);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

async function postJson(
  page: Page,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> {
  return page.evaluate(
    async ({ requestPath, requestBody }) => {
      const response = await fetch(requestPath, {
        method: "POST",
        ...(requestBody
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            }
          : {}),
      });

      let responseBody: unknown = null;
      try {
        responseBody = await response.json();
      } catch {
        // A rejected product response may intentionally contain no JSON body.
      }
      return { status: response.status, body: responseBody };
    },
    { requestPath: path, requestBody: body },
  );
}

test("a learner starting from zero hears input and their independent evidence is kept", async ({
  page,
}, testInfo) => {
  // A per-project email, or the two Playwright projects share one learner and
  // the second one starts with words the first taught.
  await login(page, `beginner-${testInfo.project.name}@example.com`);

  await page.goto("/start");
  await expect(page.getByRole("heading", { name: "Bắt đầu từ số 0" })).toBeVisible();
  await expect(page.getByText(/policy bảo thủ/)).toBeVisible();

  // Nothing has been produced unaided yet, so the evidence set starts at zero.
  const known = page.getByText("Số từ bạn đã tự nói ra được, không mở trợ giúp");
  await expect(known).toBeVisible();

  await page.getByRole("button", { name: "Bắt đầu nghe" }).click();

  // With no independent lexical evidence, the current conservative policy
  // bootstraps a target rather than generating a sentence it would reject.
  await expect(
    page.getByText("Target đang được giới thiệu riêng"),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Nói được", exact: true }).click();
  await expect(page.getByText(/Đã ghi independent evidence/)).toBeVisible();
  await expect(page.getByText(/chưa phải bằng chứng rằng bạn nhớ lâu/)).toBeVisible();

  // The evidence has to survive a reload, or it cannot drive later input.
  await page.reload();
  await expect(known).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();

  // With one durable word there is something real to calibrate self-report
  // reliability against.
  await page.getByRole("button", { name: "Làm kiểm tra" }).click();

  // Say "biết" to everything, including nonwords. The product must refuse to
  // bank that claim rather than rewarding indiscriminate self-report.
  for (let index = 0; index < 4; index += 1) {
    await expect(page.getByTestId("calibration-question")).toBeVisible();
    await page.getByRole("button", { name: "Biết", exact: true }).click();
  }

  await expect(page.getByTestId("calibration-result")).toContainText(
    "Hôm nay chưa ghi được bằng chứng độc lập",
  );
});

test("beginner evidence follows only a single-use server challenge", async ({
  page,
}, testInfo) => {
  await login(page, `beginner-challenge-${testInfo.project.name}@example.com`);

  const issued = await postJson(page, "/api/beginner/session");
  expect(issued.status).toBe(200);
  expect(issued.body).toMatchObject({
    kind: "introduce_word",
    knownWordCount: 0,
  });

  const introduction = issued.body as {
    kind: "introduce_word";
    target: string;
    challengeId: string;
  };
  expect(introduction.challengeId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

  const randomChallenge = await postJson(page, "/api/beginner/attempt", {
    kind: "introduce_word",
    challengeId: "00000000-0000-4000-8000-000000000000",
    usedSupport: false,
    claimedIndependent: true,
  });
  expect(randomChallenge.status).not.toBe(201);

  const forgedLegacyAttempt = await postJson(page, "/api/beginner/attempt", {
    kind: "introduce_word",
    challengeId: introduction.challengeId,
    usedSupport: false,
    claimedIndependent: true,
    word: "forged-target",
    sentence: "forged-target",
  });
  expect(forgedLegacyAttempt.status).not.toBe(201);

  const validAttempt = await postJson(page, "/api/beginner/attempt", {
    kind: "introduce_word",
    challengeId: introduction.challengeId,
    usedSupport: false,
    claimedIndependent: true,
  });
  expect(validAttempt.status).toBe(201);
  expect(validAttempt.body).toMatchObject({
    word: introduction.target.toLocaleLowerCase("en-US"),
    successfulRetrievals: 1,
    known: true,
  });

  const replay = await postJson(page, "/api/beginner/attempt", {
    kind: "introduce_word",
    challengeId: introduction.challengeId,
    usedSupport: false,
    claimedIndependent: true,
  });
  expect(replay.status).not.toBe(201);

  const calibration = await page.evaluate(async () => {
    const response = await fetch("/api/beginner/calibration");
    return {
      status: response.status,
      body: (await response.json()) as { items?: string[] },
    };
  });
  expect(calibration.status).toBe(200);
  expect(calibration.body.items).toContain(
    introduction.target.toLocaleLowerCase("en-US"),
  );
  expect(calibration.body.items).not.toContain("forged-target");
});
