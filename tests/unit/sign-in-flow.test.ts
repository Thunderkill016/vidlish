// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignInFlow } from "@/app/(auth)/sign-in/_components/sign-in-flow";

const { signInWithOAuth } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/adapters/supabase/browser-client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithOAuth,
    },
  }),
}));

const TEST_PASSWORD = "a long enough password";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SignInFlow", () => {
  it("shows the accessible email-password login form", async () => {
    const user = userEvent.setup();
    render(createElement(SignInFlow, { intendedPath: "/library", useFakeAuth: true }));

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "Quên mật khẩu?" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute("type", "text");
  });

  it("keeps Google OAuth alongside email-password sign-in", async () => {
    const user = userEvent.setup();
    signInWithOAuth.mockResolvedValue({ error: null });
    render(createElement(SignInFlow, { intendedPath: "/library", useFakeAuth: false }));

    await user.click(screen.getByRole("button", { name: "Tiếp tục với Google" }));

    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    );
    const redirectTo = new URL(signInWithOAuth.mock.calls[0]?.[0].options.redirectTo);
    expect(redirectTo.pathname).toBe("/auth/callback");
    expect(redirectTo.searchParams.get("next")).toBe("/library");
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByLabelText("Mật khẩu")).toBeVisible();
  });

  it("requires matching passwords before it asks to create an account", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(createElement(SignInFlow, { intendedPath: "/start", useFakeAuth: true }));

    await user.click(screen.getByRole("button", { name: "Chuyển sang tạo tài khoản" }));
    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), TEST_PASSWORD);
    await user.type(screen.getByLabelText("Xác nhận mật khẩu"), "another password");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Mật khẩu xác nhận chưa khớp.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the mapped Vietnamese error without provider details", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "AUTH_TEMPORARILY_UNAVAILABLE",
              messageVi:
                "Nếp chưa thể xử lý yêu cầu đăng nhập. Hãy thử lại sau ít phút.",
            },
          }),
          { status: 503 },
        ),
      ),
    );

    render(createElement(SignInFlow, { intendedPath: "/create", useFakeAuth: true }));
    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), TEST_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nếp chưa thể xử lý yêu cầu đăng nhập. Hãy thử lại sau ít phút.",
    );
  });
});
