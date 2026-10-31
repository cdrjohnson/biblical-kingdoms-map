import { chromium } from "playwright";
const years=process.argv.slice(2);
const b = await chromium.launch(); const page = await b.newPage({viewport:{width:1300,height:850}});
await page.goto("http://127.0.0.1:4173/biblical-kingdoms-map/"); await page.waitForTimeout(800);
const inp = page.locator('input[type="text"]').first();
for (const y of years){ await inp.fill(y); await inp.press("Enter"); await page.waitForTimeout(700); await page.screenshot({path:`/tmp/s_${y}.png`}); }
await b.close();
