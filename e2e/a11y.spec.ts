import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/grammar-schools",
  "/grammar-schools?view=table",
  "/grammar-schools/kent",
  "/schools/aylesbury-grammar-school",
  "/schools/aylesbury-grammar-school/admissions",
  "/schools/aylesbury-grammar-school/catchment",
  "/schools/aylesbury-grammar-school/historical-admissions",
  "/schools/maidstone-grammar-school/results",
  "/tools/eligibility-checker?schools=aylesbury-grammar-school",
  "/tools/catchment-checker?schools=aylesbury-grammar-school",
  "/tools/planner",
  "/compare?schools=aylesbury-grammar-school,aylesbury-high-school",
  "/admissions",
  "/admissions/appeals",
  "/11-plus",
  "/11-plus/preparation",
  "/calendar",
  "/assistant",
  "/methodology",
];

for (const path of PAGES) {
  test(`no serious accessibility violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    // Map tiles and analytics can keep the network busy; wait for load, then let client islands settle.
    await page.waitForLoadState("load");
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude(".maplibregl-map").analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  });
}

test("contrast holds when the system prefers dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/schools/aylesbury-grammar-school");
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  expect(results.violations).toEqual([]);
});
