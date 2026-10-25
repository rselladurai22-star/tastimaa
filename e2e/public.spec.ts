import { expect, test } from "@playwright/test";

test("homepage leads with search and real coverage figures", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Find a grammar school\.\s*See how it chooses\./);
  await expect(page.getByText("grammar schools in England")).toBeVisible();
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => t.includes('"WebSite"'))).toBe(true);
});

test("search suggestions are keyboard accessible and tolerate abbreviations", async ({ page }) => {
  await page.goto("/");
  const box = page.getByRole("combobox").first();
  await box.fill("QE Barnet");
  const option = page.getByRole("option", { name: /Queen Elizabeth's School/ });
  await expect(option).toBeVisible();
  // Walk the listbox with the keyboard until the school is active, then choose it.
  const options = page.getByRole("option");
  const index = (await options.allInnerTexts()).findIndex((t) => t.includes("Queen Elizabeth's School"));
  for (let i = 0; i <= index; i++) await box.press("ArrowDown");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/schools\/queen-elizabeths-school-barnet/);
});

test("directory filters are deep-linkable and the table view works", async ({ page }) => {
  await page.goto("/grammar-schools?gender=girls&sixthForm=1&view=table");
  await expect(page.getByRole("heading", { name: /schools?$/ })).toBeVisible();
  const table = page.locator("main table:visible").first();
  await expect(table).toBeVisible();
  expect(await table.locator("tbody tr").count()).toBeGreaterThan(5);
  await expect(table).toContainText("Girls");
});

test("school profile shows sourced admissions information and tabs", async ({ page }) => {
  await page.goto("/schools/aylesbury-grammar-school");
  await expect(page.getByRole("heading", { level: 1, name: "Aylesbury Grammar School" })).toBeVisible();
  await expect(page.getByText("Qualifying score")).toBeVisible();
  await expect(page.getByText("Awaiting verification").first()).toBeVisible();
  await expect(page.getByText(/GIAS all establishment data extract/)).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => t.includes('"School"') && t.includes("Aylesbury Grammar School"))).toBe(true);
  await page.getByRole("link", { name: "Admissions", exact: true }).click();
  await expect(page).toHaveURL(/\/admissions$/);
  await expect(page.getByRole("heading", { name: "Oversubscription criteria" })).toBeVisible();
  await expect(page.getByText("All other boys")).toBeVisible();
});

test("inspection frameworks are shown separately and never converted", async ({ page }) => {
  await page.goto("/schools/aylesbury-grammar-school/inspection");
  await expect(page.getByText(/not equivalent to report card grades/).first()).toBeVisible();
});

test("results page explains unpublished Progress 8", async ({ page }) => {
  await page.goto("/schools/maidstone-grammar-school/results");
  await expect(page.getByText(/did not publish Progress 8/).first()).toBeVisible();
  await expect(page.getByText("Show the data as a table").first()).toBeVisible();
});

test("Northern Ireland profiles don't pretend to have English data", async ({ page }) => {
  await page.goto("/schools/methodist-college-belfast");
  await expect(page.getByText(/Education and Training Inspectorate/).first()).toBeVisible();
  await page.goto("/schools/methodist-college-belfast/results");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("eligibility checker asks rule-specific questions and never gives a probability", async ({ page }) => {
  await page.goto("/tools/eligibility-checker?schools=aylesbury-grammar-school");
  await expect(page.getByText("Buckinghamshire Secondary Transfer Test").first()).toBeVisible();
  await page.getByLabel("Test status").selectOption("have_result");
  await page.getByLabel("Score", { exact: true }).fill("125");
  await expect(page.getByText("Qualifying requirement met")).toBeVisible();
  await expect(page.getByText(/do not estimate a probability/)).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/\d+% chance/i);
});

test("comparison highlights differences and offers sharing", async ({ page }) => {
  await page.goto("/compare?schools=aylesbury-grammar-school,aylesbury-high-school");
  await expect(page.getByText("Differs").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Share link/ })).toBeVisible();
});

test("assistant answers with numbered sources", async ({ page }) => {
  await page.goto("/assistant");
  await page.getByLabel("Your question").fill("How do I appeal if we are refused a place?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText(/Sources \(/)).toBeVisible();
  await expect(page.getByText(/20 school days/).first()).toBeVisible();
});

test("calendar lists verified dates", async ({ page }) => {
  await page.goto("/calendar?past=1");
  await expect(page.getByText("National offer day (secondary)").first()).toBeVisible();
});

test("unknown pages return a helpful 404", async ({ page }) => {
  const res = await page.goto("/schools/this-school-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /can.t find that page/ })).toBeVisible();
});

test("admin area requires sign-in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Editor sign in" })).toBeVisible();
});

test("SEO plumbing: robots and sitemap index", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  const index = await (await request.get("/sitemap.xml")).text();
  expect(index).toContain("/sitemaps/schools.xml");
  const schools = await (await request.get("/sitemaps/schools.xml")).text();
  expect(schools).toContain("/schools/aylesbury-grammar-school/admissions");
});

test("planner ticks persist in this browser only", async ({ page }) => {
  await page.goto("/tools/planner");
  const tick = page.getByRole("button", { name: /Mark "Research schools" as done/ }).first();
  await tick.click();
  await expect(page.getByRole("button", { name: /Mark "Research schools" as not done/ }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Mark "Research schools" as not done/ }).first()).toBeVisible();
});

test("practice centre runs a timed set and records the attempt locally", async ({ page }) => {
  await page.goto("/11-plus/preparation");
  const start = page.getByRole("button", { name: /^Start/ }).first();
  await start.click();
  const next = page.getByRole("button", { name: "Next", exact: true });
  while (await next.isVisible()) await next.click();
  await page.getByRole("button", { name: "Finish and see results" }).click();
  await expect(page.getByText(/\d+ out of \d+/).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Clear history" })).toBeVisible();
});
