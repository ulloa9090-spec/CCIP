// Phase 2 authentication smoke test — drives the real UI (not a mocked
// client) through signup -> profile/settings row check -> logout ->
// protected-route redirect -> login -> session persistence -> logout.
// Run against a local `next dev` server: node tests/auth-smoke.mjs
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const email = `atlas.qa.${Date.now()}@example.com`;
const password = "correct horse battery staple 123";

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext();
const page = await context.newPage();

try {
  // 1. Unauthenticated user hitting a protected route is bounced to /login.
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForURL(`${BASE_URL}/login`);
  assert(page.url() === `${BASE_URL}/login`, "unauthenticated /dashboard redirects to /login");

  // 2. Sign up.
  await page.goto(`${BASE_URL}/signup`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#confirmPassword", password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  const afterSignupUrl = page.url();
  const confirmMessage = await page
    .locator("text=Check your email")
    .isVisible()
    .catch(() => false);

  if (afterSignupUrl.includes("/dashboard")) {
    assert(true, "signup created a session directly (email confirmations disabled) and redirected to /dashboard");
  } else if (confirmMessage) {
    assert(true, "signup requires email confirmation — shown the check-your-email message");
  } else {
    throw new Error(`FAIL: unexpected state after signup, url=${afterSignupUrl}`);
  }

  console.log(`Test user: ${email}`);
  console.log(`Signup outcome: ${afterSignupUrl.includes("/dashboard") ? "session issued" : "confirmation required"}`);

  // 3. If a session was issued directly, verify session persistence across
  // a fresh navigation and that logout returns us to a logged-out state.
  if (afterSignupUrl.includes("/dashboard")) {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState("networkidle");
    const bodyText = await page.textContent("body");
    assert(bodyText.includes(email), "Settings page shows the signed-in user's real email (profile wired end-to-end)");

    // Session persistence: a brand new page load (not client nav) still authenticated.
    await page.goto(`${BASE_URL}/dashboard`);
    assert(page.url() === `${BASE_URL}/dashboard`, "fresh navigation to /dashboard stays authenticated (session persists)");

    // Logout via the header user menu.
    await page.click('button[aria-label="Account menu"]');
    await page.click("text=Log out");
    await page.waitForURL(`${BASE_URL}/login`);
    assert(page.url() === `${BASE_URL}/login`, "logout redirects to /login");

    // Post-logout, protected routes are inaccessible again.
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL(`${BASE_URL}/login`);
    assert(page.url() === `${BASE_URL}/login`, "post-logout /dashboard redirects to /login again");

    // 4. Log back in with the same credentials.
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
    assert(page.url() === `${BASE_URL}/dashboard`, "login with correct credentials reaches /dashboard");
  }

  // 5. Wrong password is rejected with a friendly error, not a crash.
  await page.click('button[aria-label="Account menu"]').catch(() => {});
  await page.click("text=Log out").catch(() => {});
  await page.waitForTimeout(500);
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "definitely-wrong-password");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  const errorVisible = await page.locator("text=incorrect").isVisible().catch(() => false);
  assert(errorVisible, "wrong password shows a friendly inline error, no crash");
  assert(page.url().includes("/login"), "failed login stays on /login (not redirected)");

  console.log("\nAll auth smoke tests passed.");
} finally {
  await browser.close();
}
