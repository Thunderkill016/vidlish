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

test("a learner starting from zero hears a sentence and their evidence is kept", async ({
  page,
}, testInfo) => {
  // A per-project email, or the two Playwright projects share one learner and
  // the second one starts with words the first taught.
  await login(page, `beginner-${testInfo.project.name}@example.com`);

  await page.goto("/start");
  await expect(page.getByRole("heading", { name: "Bắt đầu từ số 0" })).toBeVisible();

  // Nothing has been produced unaided yet, so the count that decides what comes
  // next is zero — not a session count, not a streak.
  const known = page.getByText("Số từ bạn đã tự nói ra được, không mở trợ giúp");
  await expect(known).toBeVisible();

  await page.getByRole("button", { name: "Bắt đầu nghe" }).click();

  // At zero known words no sentence can satisfy i+1, so the first word arrives
  // on its own. This is arithmetic, not a missing feature.
  await expect(
    page.getByText("Từ đầu tiên không đến trong một câu"),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Nói được", exact: true }).click();
  // The confirmation only appears once the save has come back. It used to
  // appear immediately, which meant a learner who closed the tab was told they
  // had made progress the next session could not see.
  await expect(page.getByText(/Đã ghi lại/)).toBeVisible();

  // The evidence has to survive a reload, or nothing decided the next word.
  await page.reload();
  await expect(known).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();

  // With one word banked there is something real to ask about, so the check
  // that makes self-reports mean anything becomes available.
  await page.getByRole("button", { name: "Làm kiểm tra" }).click();

  // Say "biết" to everything, including the words that do not exist. The
  // product must refuse to bank that rather than reward it.
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

  // An authenticated learner cannot invent a challenge and manufacture an
  // independent word. This is the route-level proof complementary to pgTAP's
  // direct-RPC denial.
  const randomChallenge = await postJson(page, "/api/beginner/attempt", {
    kind: "introduce_word",
    challengeId: "00000000-0000-4000-8000-000000000000",
    usedSupport: false,
    claimedIndependent: true,
  });
  expect(randomChallenge.status).not.toBe(201);

  // The old exploit supplied its own target/answer-key fields. Strict request
  // parsing rejects them rather than silently letting client-owned truth back
  // into the evidence path. Rejection must not consume the real challenge.
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

  // The same server-issued fact can create evidence once only. A retry/replay
  // after the atomic consume must fail instead of incrementing retrievals.
  const replay = await postJson(page, "/api/beginner/attempt", {
    kind: "introduce_word",
    challengeId: introduction.challengeId,
    usedSupport: false,
    claimedIndependent: true,
  });
  expect(replay.status).not.toBe(201);

  // The learner's current calibration set is built from durable known words.
  // Seeing the issued target here — and never the forged client word — proves
  // the banked evidence followed server challenge authority end to end.
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
