import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email.")
  .max(254, "Email không hợp lệ.")
  .email("Email không hợp lệ.")
  .transform((value) => value.toLowerCase());

/**
 * NIST recommends long, user-chosen passwords instead of composition rules.
 * Twelve characters is the product baseline; Supabase remains the authority
 * that stores and verifies the credential.
 */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`)
  .max(MAX_PASSWORD_LENGTH, "Mật khẩu quá dài.");

export const signInWithPasswordSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  intendedPath: z.string().optional(),
});

export const signUpWithPasswordSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
    intendedPath: z.string().optional(),
  })
  .superRefine(({ password, passwordConfirmation }, context) => {
    if (password === passwordConfirmation) return;
    context.addIssue({
      code: "custom",
      path: ["passwordConfirmation"],
      message: "Mật khẩu xác nhận chưa khớp.",
    });
  });

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .superRefine(({ password, passwordConfirmation }, context) => {
    if (password === passwordConfirmation) return;
    context.addIssue({
      code: "custom",
      path: ["passwordConfirmation"],
      message: "Mật khẩu xác nhận chưa khớp.",
    });
  });

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export type SignInWithPasswordCommand = z.input<typeof signInWithPasswordSchema>;
export type SignUpWithPasswordCommand = z.input<typeof signUpWithPasswordSchema>;
export type UpdatePasswordCommand = z.input<typeof updatePasswordSchema>;
export type RequestPasswordResetCommand = z.input<typeof requestPasswordResetSchema>;

const blockedIntendedPrefixes = ["/sign-in", "/api/auth"];

export function sanitizeIntendedPath(value: string | null | undefined): string {
  if (!value) return "/start";

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/start";
  }

  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    blockedIntendedPrefixes.some((prefix) => decoded.startsWith(prefix))
  ) {
    return "/start";
  }

  try {
    const parsed = new URL(decoded, "https://vidlish.local");
    if (parsed.origin !== "https://vidlish.local") return "/start";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/start";
  }
}
