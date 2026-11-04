import { expect, test } from "@playwright/test";

test.describe("public marketing pages", () => {
  test("home page renders the product pitch", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Build Better Habits");
    await expect(page.getByRole("link", { name: /get started free/i }).first()).toHaveAttribute(
      "href",
      "/auth/register"
    );
  });

  test("pricing page lists free and pro plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /simple, transparent pricing/i })).toBeVisible();
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
  });

  test("features page renders", async ({ page }) => {
    await page.goto("/features");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("login page exposes the sign-in form", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
  });

  test("register page exposes the sign-up form", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("unknown page renders the 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /does not exist/i })).toBeVisible();
  });
});

test.describe("authenticated flows", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "Set E2E_EMAIL and E2E_PASSWORD to run authenticated browser tests."
  );

  test("signs in and loads the dashboard", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(process.env.E2E_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});
