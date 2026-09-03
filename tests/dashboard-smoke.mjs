// Phase 3 Dashboard smoke test — protected-route check, empty/populated/error
// widget rendering (via the dev-only fixture preview route, since this
// sandbox cannot obtain a real authenticated session — see docs/SECURITY.md),
// responsive mobile-priority reordering, accessibility scan, and a
// no-console-error check across every page load.
// Run against a local `next dev` server: node tests/dashboard-smoke.mjs
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(`${page.url()} :: ${msg.text()}`);
});
page.on("pageerror", (err) => consoleErrors.push(`${page.url()} :: pageerror: ${err.message}`));

try {
  // 1. Protected-route test: unauthenticated /dashboard bounces to /login.
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForURL(`${BASE_URL}/login`);
  assert(page.url() === `${BASE_URL}/login`, "unauthenticated /dashboard redirects to /login");

  // 2. New-user empty-state test.
  await page.goto(`${BASE_URL}/dev/dashboard-preview?state=empty`);
  const emptyBody = await page.textContent("body");
  const emptyStrings = [
    "Nothing planned for today yet",
    "No Active Project set",
    "Choose a project to make it your primary focus.",
    "No active cycle",
    "Create your first 90-day outcome.",
    "No priorities set",
    "Select this week's Top 3.",
    "No habits yet",
    "Build your first consistency habit.",
    "Nothing this week",
    "No sessions logged",
    "Not enough data yet",
    "Not enough data",
    "No ideas captured",
    "Nothing to review yet",
    "Your first weekly review will appear here.",
  ];
  for (const s of emptyStrings) {
    assert(emptyBody.includes(s), `empty state shows: "${s}"`);
  }

  // 3. Populated-state test.
  await page.goto(`${BASE_URL}/dev/dashboard-preview?state=populated`);
  const populatedBody = await page.textContent("body");
  const populatedStrings = [
    "Finish CDL permit study module 5",
    "Licencia CDL + Negocio Transporte",
    "Obtener licencia CDL y lanzar el negocio",
    "Call the trucking school",
    "Deep work (min. 1h)",
    "Study CDL",
    "session",
    "Negocio de lavado de camiones",
  ];
  for (const s of populatedStrings) {
    assert(populatedBody.includes(s), `populated state shows: "${s}"`);
  }

  // 4. Error-state / module isolation test: Today fails, everything else
  //    still renders — the page must not crash.
  await page.goto(`${BASE_URL}/dev/dashboard-preview?state=error`);
  const errorBody = await page.textContent("body");
  assert(errorBody.includes("This section couldn't load"), "failed Today module shows inline error");
  assert(
    errorBody.includes("No Active Project set"),
    "other modules still render normally when one module errors (isolation holds)",
  );

  // 5. Responsive mobile-priority reordering (Phase 3 §11): Today, Active
  //    Project, Habits, Focus float above 90-Day Goal on mobile, but 90-Day
  //    Goal moves back above Habits at desktop width.
  await page.goto(`${BASE_URL}/dev/dashboard-preview?state=populated`);

  async function headingY(text) {
    const el = page.getByRole("heading", { name: text, exact: true }).first();
    const box = await el.boundingBox();
    if (!box) throw new Error(`FAIL: could not locate heading "${text}"`);
    return box.y;
  }

  await page.setViewportSize({ width: 375, height: 900 }); // mobile
  const mobileHabitsY = await headingY("Habits");
  const mobileNinetyDayY = await headingY("90-Day Goal");
  assert(mobileHabitsY < mobileNinetyDayY, "mobile: Habits appears above 90-Day Goal");

  await page.setViewportSize({ width: 1280, height: 900 }); // desktop
  const desktopHabitsY = await headingY("Habits");
  const desktopNinetyDayY = await headingY("90-Day Goal");
  assert(desktopNinetyDayY < desktopHabitsY, "desktop: 90-Day Goal appears above Habits (order actually flips)");

  // 6. Keyboard navigation / visible focus spot check.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.keyboard.press("Tab");
  const firstFocusTag = await page.evaluate(() => document.activeElement?.tagName);
  assert(
    firstFocusTag === "A" || firstFocusTag === "BUTTON",
    `first Tab stop lands on an interactive element (got <${firstFocusTag}>)`,
  );

  // 7. Accessibility scan (axe-core) on the most complex state.
  const axeResults = await new AxeBuilder({ page }).analyze();
  const seriousOrWorse = axeResults.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  if (seriousOrWorse.length > 0) {
    console.log(JSON.stringify(seriousOrWorse, null, 2));
  }
  assert(seriousOrWorse.length === 0, "no serious/critical axe accessibility violations");

  // 8. No console errors across any of the navigations above.
  if (consoleErrors.length > 0) {
    console.log("Console errors captured:\n" + consoleErrors.join("\n"));
  }
  assert(consoleErrors.length === 0, "no console errors across any page load");

  console.log("\nAll Dashboard smoke tests passed.");
} finally {
  await browser.close();
}
