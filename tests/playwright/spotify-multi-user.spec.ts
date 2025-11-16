import { expect, test, type Page } from "@playwright/test";

const BASE =
  process.env.TEST_BASE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://127.0.0.1:3000";

test.describe("Spotify Multi-User Authentication", () => {
  test("two users can authenticate and control their own sessions", async ({
    browser,
  }) => {
    const user1Page = await browser.newPage();
    const user2Page = await browser.newPage();

    // User 1 logs in
    await user1Page.goto(`${BASE}/api/auth/signin`);
    await user1Page.getByLabel("Account name").fill("user1");
    await user1Page.getByLabel("Password").fill("password");
    await user1Page.getByRole("button", { name: "Sign in" }).click();

    // User 2 logs in
    await user2Page.goto(`${BASE}/api/auth/signin`);
    await user2Page.getByLabel("Account name").fill("user2");
    await user2Page.getByLabel("Password").fill("password");
    await user2Page.getByRole("button", { name: "Sign in" }).click();

    // Both users should be redirected to the dashboard
    await expect(user1Page).toHaveURL(`${BASE}/`);
    await expect(user2Page).toHaveURL(`${BASE}/`);

    // Both users should be able to see their own Spotify data
    await expect(user1Page.getByText("Your Spotify Data")).toBeVisible();
    await expect(user2Page.getByText("Your Spotify Data")).toBeVisible();
  });

  test("devices endpoint returns the correct devices for each user", async ({
    browser,
  }) => {
    const user1Page = await browser.newPage();
    const user2Page = await browser.newPage();

    // User 1 logs in
    await user1Page.goto(`${BASE}/api/auth/signin`);
    await user1Page.getByLabel("Account name").fill("user1");
    await user1Page.getByLabel("Password").fill("password");
    await user1Page.getByRole("button", { name: "Sign in" }).click();
    await expect(user1Page).toHaveURL(`${BASE}/`);
    const user1 = await user1Page.evaluate(() => window.next.initialProps.pageProps.user);


    // User 2 logs in
    await user2Page.goto(`${BASE}/api/auth/signin`);
    await user2Page.getByLabel("Account name").fill("user2");
    await user2Page.getByLabel("Password").fill("password");
    await user2Page.getByRole("button", { name: "Sign in" }).click();
    await expect(user2Page).toHaveURL(`${BASE}/`);
    const user2 = await user2Page.evaluate(() => window.next.initialProps.pageProps.user);

    // Get devices for user 1
    const user1Devices = await user1Page.request.post(
      `${BASE}/api/spotify/devices`,
      {
        data: {
          userId: user1.id,
          encryptedRefreshToken: user1.encryptedRefreshToken,
        },
      }
    );
    expect(user1Devices.ok()).toBeTruthy();
    const user1DevicesJson = await user1Devices.json();
    expect(user1DevicesJson).toHaveProperty("devices");

    // Get devices for user 2
    const user2Devices = await user2Page.request.post(
      `${BASE}/api/spotify/devices`,
      {
        data: {
          userId: user2.id,
          encryptedRefreshToken: user2.encryptedRefreshToken,
        },
      }
    );
    expect(user2Devices.ok()).toBeTruthy();
    const user2DevicesJson = await user2Devices.json();
    expect(user2DevicesJson).toHaveProperty("devices");
  });
});
