import { expect, test } from "@playwright/test";

for (const path of ["/", "/grammar-schools", "/schools/aylesbury-grammar-school", "/compare?schools=aylesbury-grammar-school,aylesbury-high-school", "/tools/eligibility-checker"]) {
  test(`no horizontal page scroll on mobile: ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("mobile filters open in a disclosure", async ({ page }) => {
  await page.goto("/grammar-schools");
  const filters = page.getByRole("complementary", { name: "Filters" }).locator("details");
  await filters.locator("summary").click();
  await expect(filters.getByLabel("Postcode", { exact: true })).toBeVisible();
});

test.describe("at 320px wide", () => {
  test.use({ viewport: { width: 320, height: 720 } });
  for (const path of ["/", "/grammar-schools", "/grammar-schools/kent", "/schools/aylesbury-grammar-school", "/schools/aylesbury-grammar-school/historical-admissions", "/admissions/oversubscription", "/11-plus", "/calendar", "/assistant", "/grammar-schools?view=table", "/compare?schools=aylesbury-grammar-school,aylesbury-high-school", "/tools/eligibility-checker?schools=aylesbury-grammar-school"]) {
    test(`no horizontal page scroll: ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
