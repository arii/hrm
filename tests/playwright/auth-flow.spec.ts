import { expect, test } from "@playwright/test";

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

test.describe("Spotify Authentication", () => {
  test("auth check endpoint responds", async ({ request }) => {
    const res = await request.get(`${BASE}/api/debug/auth-check`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty("ok", true);
    expect(data).toHaveProperty("isAuthenticated");
  });

  test("debug page shows auth components", async ({ page }) => {
    await page.goto(`${BASE}/debug/spotify`);
    await expect(page.getByText(/sign in/i)).toBeVisible();
    await expect(page.getByText(/server token status/i)).toBeVisible();
  });
});
