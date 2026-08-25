import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./_sign-in";

type Sitting = {
  bankVersion: string;
  items: { id: string; audioUrl: string; syllables: number }[];
};

test("the sitting never sends the sentence the learner is graded on", async ({
  page,
}, testInfo) => {
  await signIn(page, `imitation-${testInfo.project.name}@example.com`);

  const raw = await page.evaluate(async () => {
    const response = await fetch("/api/measure/imitation");
    return { status: response.status, body: await response.text() };
  });
  expect(raw.status).toBe(200);

  // The whole instrument depends on the learner hearing the sentence and never
  // reading it. Asserting on the parsed shape would miss a stray field, so this
  // checks the bytes: no sentence from the bank may appear anywhere in them.
  for (const phrase of [
    "I did not hear the question",
    "The company announced",
    "Nobody told me",
    "brother works",
  ]) {
    expect(raw.body).not.toContain(phrase);
  }

  const sitting = JSON.parse(raw.body) as Sitting;
  expect(sitting.items.length).toBeGreaterThanOrEqual(30);
  for (const item of sitting.items) {
    expect(Object.keys(item).sort()).toEqual(["audioUrl", "id", "syllables"]);
    expect(item.audioUrl).toMatch(/^\/audio\/curriculum\/[0-9a-f]{16}\.wav$/);
  }

  // Scoring happens on the server against text the browser never held, so a
  // wrong answer has to come back wrong however the client phrases it.
  const scored = await page.evaluate(async (payload) => {
    const response = await fetch("/api/measure/imitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { status: response.status, body: await response.json() };
  }, {
    bankVersion: sitting.bankVersion,
    attempts: sitting.items.slice(0, 12).map((item) => ({
      itemId: item.id,
      transcript: "banana banana banana",
    })),
  });

  expect(scored.status).toBe(201);
  expect(scored.body.attempted).toBe(12);
  expect(scored.body.passed).toBe(0);
  expect(scored.body.aboveBank).toBe(false);
});

test("a sitting taken against another bank is refused", async ({ page }, testInfo) => {
  await signIn(page, `imitation-${testInfo.project.name}@example.com`);

  // Two sittings are only comparable if the sentences were the same. Scoring a
  // stale one against today's items would file a number next to the others
  // that does not mean what they mean.
  const rejected = await page.evaluate(async () => {
    const response = await fetch("/api/measure/imitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankVersion: "ei:0000deadbeef",
        attempts: Array.from({ length: 12 }, (_, index) => ({
          itemId: `ei-0${7 + (index % 3)}-a`,
          transcript: "anything",
        })),
      }),
    });
    return response.status;
  });

  expect(rejected).toBe(403);
});

test("too few answers cannot produce a measurement", async ({ page }, testInfo) => {
  await signIn(page, `imitation-${testInfo.project.name}@example.com`);

  // A band built on four items moves more on one misheard word than on a month
  // of learning, so it must not be stored at all.
  const rejected = await page.evaluate(async () => {
    const sitting = await (await fetch("/api/measure/imitation")).json();
    const response = await fetch("/api/measure/imitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankVersion: sitting.bankVersion,
        attempts: sitting.items.slice(0, 4).map((item: { id: string }) => ({
          itemId: item.id,
          transcript: "one two three",
        })),
      }),
    });
    return response.status;
  });

  expect(rejected).toBe(403);
});
