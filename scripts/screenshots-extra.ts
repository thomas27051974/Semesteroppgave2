import { chromium } from "playwright";

const OUT = "/tmp/ats-screens";
const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: "nb-NO" });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/logg-inn`);
  await page.fill('input[name="email"]', "admin@ageri.no");
  await page.fill('input[name="password"]', "Admin1234!");
  await Promise.all([page.waitForURL(/\/admin/), page.click('button[type=submit]')]);

  await page.goto(`${BASE}/admin/stillinger`, { waitUntil: "networkidle" });
  // Find the Rediger link (the first link in the actions column points at the editor).
  const href = await page.locator('a[href^="/admin/stillinger/cmpl"]').first().getAttribute("href");
  console.log("Job href:", href);
  if (!href) throw new Error("No job link found");
  const jobId = href.split("/").pop()!;

  await page.goto(`${BASE}/admin/stillinger/${jobId}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/06-admin-job-detail.png`, fullPage: true });

  await page.goto(`${BASE}/admin/stillinger/${jobId}/kanban`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/07-admin-kanban.png`, fullPage: true });

  await browser.close();
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
