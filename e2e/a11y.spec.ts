import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/grammar-schools", "/grammar-schools/kent", "/schools/aylesbury-grammar-school", "/schools/aylesbury-grammar-school/admissions", "/schools/maidstone-grammar-school/results", "/tools/eligibility-checker?schools=aylesbury-grammar-school", "/compare?schools=aylesbury-grammar-school,aylesbury-high-school", "/11-plus", "/admissions/appeals", "/calendar", "/assistant"];

for (const path of PAGES) {
  test(`no serious accessibility violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude(".maplibregl-map").analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
  });
}

test("dark mode keeps contrast", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/schools/aylesbury-grammar-school");
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  expect(results.violations).toEqual([]);
});
