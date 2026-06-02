import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const OUT = "/tmp/ats-screens";
const BASE = "http://localhost:3000";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: "nb-NO" });
  const page = await ctx.newPage();

  async function shot(name: string, url: string) {
    console.log(`-> ${url}`);
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  }

  // PUBLIC
  await shot("01-landing", "/");
  await shot("02-jobs-list", "/jobb");
  await shot("03-job-detail", "/jobb/test-utvikler");
  await shot("04-login", "/logg-inn");

  // RECRUITER (login first)
  await page.goto(`${BASE}/logg-inn`);
  await page.fill('input[name="email"]', "admin@ageri.no");
  await page.fill('input[name="password"]', "Admin1234!");
  await Promise.all([page.waitForURL(/\/admin/, { timeout: 30000 }), page.click('button[type=submit]')]);

  await shot("05-admin-jobs", "/admin/stillinger");

  // Find the seeded job id and open its editor + kanban
  const link = page.locator('a:has-text("Test-utvikler")').first();
  if (await link.count()) {
    const href = await link.getAttribute("href");
    if (href) {
      await shot("06-admin-job-detail", href);
      await shot("07-admin-kanban", `${href}/kanban`);
    }
  }

  await shot("08-admin-candidates", "/admin/kandidater");

  // Open the first candidate (the one created by the earlier apply test)
  const candLink = page.locator('a[href*="/admin/kandidater/"]').first();
  if (await candLink.count()) {
    const href = await candLink.getAttribute("href");
    if (href) await shot("09-admin-candidate-360", href);
  }

  await shot("10-admin-email-templates", "/admin/maler/e-post");
  await shot("11-admin-interview-sets", "/admin/maler/intervjuer");

  await browser.close();
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
