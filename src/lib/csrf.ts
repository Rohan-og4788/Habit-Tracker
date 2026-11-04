export function generateCsrfToken(): string {
  return require("crypto").randomBytes(16).toString("hex");
}

export function validateCsrfToken(
  submitted: string | undefined,
  cookieToken: string | undefined
): boolean {
  if (!submitted || !cookieToken) return false;
  if (submitted.length !== cookieToken.length) return false;
  // constant-time compare
  const a = Buffer.from(submitted);
  const b = Buffer.from(cookieToken);
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

export function CSRF_COOKIE_NAME() {
  return "hf_csrf";
}
