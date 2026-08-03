// @vitest-environment jsdom

import { createElement, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CefrSelector } from "@/app/(protected)/create/_components/cefr-selector";
import type { CefrLevel } from "@/shared/contracts/lesson-draft";

function Harness() {
  const [value, setValue] = useState<CefrLevel>();
  return createElement(CefrSelector, { value, onChange: setValue });
}

describe("CefrSelector", () => {
  it("supports keyboard activation and keeps exactly one level selected", async () => {
    const user = userEvent.setup();
    render(createElement(Harness));

    expect(
      screen.getByRole("group", { name: "Trình độ tiếng Anh của bạn" }),
    ).toBeVisible();

    const b1 = screen.getByRole("button", { name: "B1 Trung cấp" });
    b1.focus();
    await user.keyboard("{Enter}");
    expect(b1).toHaveAttribute("aria-pressed", "true");

    const b2 = screen.getByRole("button", { name: "B2 Trung cấp cao" });
    b2.focus();
    await user.keyboard(" ");
    expect(b2).toHaveAttribute("aria-pressed", "true");
    expect(b1).toHaveAttribute("aria-pressed", "false");
  });
});
