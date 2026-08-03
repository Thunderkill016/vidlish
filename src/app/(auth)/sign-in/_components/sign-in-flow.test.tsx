// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignInFlow } from "@/app/(auth)/sign-in/_components/sign-in-flow";

afterEach(() => vi.unstubAllGlobals());

describe("SignInFlow", () => {
  it("moves from email to accessible OTP entry with neutral copy", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ status: "accepted" }), { status: 202 })),
    );

    render(<SignInFlow intendedPath="/library" cooldownSeconds={60} />);
    await user.type(screen.getByLabelText("Email được mời"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "Gửi mã đăng nhập" }));

    expect(await screen.findByLabelText("Mã đăng nhập gồm 6 chữ số")).toHaveAttribute(
      "autocomplete",
      "one-time-code",
    );
    expect(screen.getByText("Nếu email của bạn được mời, mã đăng nhập sẽ được gửi.")).toBeVisible();
  });

  it("shows mapped Vietnamese error without provider details", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "AUTH_TEMPORARILY_UNAVAILABLE",
              messageVi: "Vidlish chưa thể xử lý yêu cầu đăng nhập. Hãy thử lại sau ít phút.",
            },
          }),
          { status: 503 },
        ),
      ),
    );

    render(<SignInFlow intendedPath="/create" cooldownSeconds={60} />);
    await user.type(screen.getByLabelText("Email được mời"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "Gửi mã đăng nhập" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vidlish chưa thể xử lý yêu cầu đăng nhập. Hãy thử lại sau ít phút.",
    );
  });
});
