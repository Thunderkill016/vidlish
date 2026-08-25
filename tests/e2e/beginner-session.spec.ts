import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./_sign-in";

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

async function beginFirstWord(page: Page) {
  const issuedPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/beginner/session") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Bắt đầu nghe" }).click();
  const issued = await issuedPromise;
  expect(issued.ok()).toBe(true);
  const introduction = (await issued.json()) as {
    kind: string;
    target: string;
    challengeId: string;
  };
  expect(introduction.kind).toBe("introduce_word");
  return introduction;
}

test("a learner starting from zero hears the first word before text and their independent evidence is kept", async ({
  page,
}, testInfo) => {
  // A per-project email, or the two Playwright projects share one learner and
  // the second one starts with words the first taught.
  await signIn(page, `beginner-${testInfo.project.name}@example.com`);

  await page.goto("/start");
  await expect(
    page.getByRole("heading", { name: "Hôm nay, nghe một câu để bắt đầu dùng tiếng Anh." }),
  ).toBeVisible();

  // Nothing has been produced unaided yet, so the count that decides what comes
  // next is zero — not a session count, not a streak.
  const known = page.getByText(
    "Số từ bạn đã tự nói ra được, không mở trợ giúp",
  );
  await expect(known).toBeVisible();

  const introduction = await beginFirstWord(page);

  // At zero known words no sentence can satisfy i+1, so the first word arrives
  // on its own. Crucially, it now follows the same listen-before-text boundary
  // as every later sentence: the target itself is not rendered yet.
  await expect(
    page.getByText("Từ đầu tiên sẽ đến một mình"),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("beginner-first-word-hidden")).toBeVisible();
  await expect(
    page.getByText(introduction.target, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cho tôi xem chữ" }),
  ).toBeVisible();

  // The learner can self-report that they reproduced the sound without ever
  // opening text. Only this path is eligible to become independent evidence.
  await page.getByRole("button", { name: "Nói được", exact: true }).click();
  await expect(page.getByText(/Đã ghi nhận lần bạn tự nói lại/)).toBeVisible();

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

test("revealing the first word is support and cannot bank it as independently known", async ({
  page,
}, testInfo) => {
  await signIn(page, `beginner-support-${testInfo.project.name}@example.com`);
  await page.goto("/start");

  const introduction = await beginFirstWord(page);
  await expect(
    page.getByText(introduction.target, { exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Cho tôi xem chữ" }).click();
  await expect(
    page.getByText(introduction.target, { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nói được", exact: true }).click();
  await expect(
    page.getByText(/chưa được tính là tự nhớ độc lập/),
  ).toBeVisible();

  // The supported success may be kept as a bounded attempt, but it must not
  // alter the durable independent-known count that drives progression.
  await page.reload();
  const knownCard = page
    .getByText("Số từ bạn đã tự nói ra được, không mở trợ giúp")
    .locator("..");
  await expect(knownCard.getByText("0", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Làm kiểm tra" })).toHaveCount(
    0,
  );
});

test("later beginner sentences hide both the target word and sentence until text support is opened", async ({
  page,
}, testInfo) => {
  await signIn(page, `beginner-later-${testInfo.project.name}@example.com`);

  // Seed exactly one independently known word through the same server-owned
  // challenge path. This gets the UI to the first true i+1 sentence without
  // depending on text that the test itself is meant to inspect.
  const issued = await postJson(page, "/api/beginner/session");
  expect(issued.status).toBe(200);
  const introduction = issued.body as {
    kind: "introduce_word";
    target: string;
    challengeId: string;
  };
  expect(introduction.kind).toBe("introduce_word");
  const banked = await postJson(page, "/api/beginner/attempt", {
    kind: "introduce_word",
    challengeId: introduction.challengeId,
    usedSupport: false,
    claimedIndependent: true,
  });
  expect(banked.status).toBe(201);
  expect(banked.body).toMatchObject({ known: true });

  await page.goto("/start");
  const sessionPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/beginner/session") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Bắt đầu nghe" }).click();
  const response = await sessionPromise;
  expect(response.ok()).toBe(true);
  const session = (await response.json()) as {
    target: string;
    sentences: Array<{ text: string; challengeId: string }>;
    knownWordCount: number;
  };
  expect(session.knownWordCount).toBeGreaterThanOrEqual(1);
  expect(session.sentences.length).toBeGreaterThan(0);

  await expect(
    page.getByText("Có một từ mới trong câu — đang ẩn", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(session.target, { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(session.sentences[0]!.text, { exact: true }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Cho tôi xem chữ" }).click();
  await expect(page.getByText(session.target, { exact: true })).toBeVisible();
  await expect(
    page.getByText(session.sentences[0]!.text, { exact: true }),
  ).toBeVisible();
});

test("beginner evidence follows only a single-use server challenge", async ({
  page,
}, testInfo) => {
  await signIn(page, `beginner-challenge-${testInfo.project.name}@example.com`);

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

test("the home page answers with one thing to do, not a menu", async ({
  page,
}, testInfo) => {
  await signIn(page, `beginner-${testInfo.project.name}@example.com`);

  await page.goto("/dashboard");

  // The answer is decided by evidence, not by whichever card looks easiest. A
  // learner with none cannot reach a Pre-A1 chunk yet — "my name is" is three
  // unknown words at once — so the honest answer is a single new word.
  const action = page.getByTestId("todays-action");
  await expect(action).toBeVisible();
  await expect(action).toContainText("Gặp một từ mới");
  await expect(action.getByRole("link", { name: "Bắt đầu" })).toBeVisible();
});
