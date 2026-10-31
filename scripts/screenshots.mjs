// Takes the documentation screenshots into docs/images/ (run `npm run preview` first).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const APP = process.env.APP_URL || "http://127.0.0.1:4173/biblical-kingdoms-map/";
const OUT = new URL("../docs/images/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function run(prefix, ctxOpts, colorScheme = "light") {
  const ctx = await browser.newContext({ ...ctxOpts, colorScheme });
  const page = await ctx.newPage();
  const yearBox = () => page.locator('input[aria-label^="Type a year"]').first();
  const frame = () => page.locator('div[style*="touch-action: none"]').first();
  const setYear = async (t) => { const b = yearBox(); await b.click(); await b.fill(t); await b.press("Enter"); await page.waitForTimeout(250); };
  const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: OUT + prefix + "-" + name + ".png" }); console.log("saved", prefix + "-" + name + ".png"); };
  const scrollMapTop = async (extra = 12) => { await page.evaluate((x) => { const f = document.querySelector('div[style*="touch-action: none"]'); window.scrollTo(0, f.getBoundingClientRect().top + window.scrollY - x); }, extra); };
  await page.goto(APP); await page.waitForSelector("h1"); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector("h1"); await page.waitForTimeout(700);

  /* overview: opens at AD 30, with the slider under the map */
  await page.getByRole("radio", { name: "Holy Land" }).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("radio", { name: "Whole region" }).click();
  await shot("overview");

  /* the slider and controls under the map */
  await scrollMapTop(10);
  await shot("map-and-slider");

  /* city panel: Jerusalem */
  await page.getByPlaceholder(/Find a city/).fill("Jerusalem");
  await page.getByPlaceholder(/Find a city/).press("Enter");
  await page.waitForTimeout(400);
  await scrollMapTop(10);
  await shot("map-zoomed-city");
  await frame().scrollIntoViewIfNeeded();
  const fb = await frame().boundingBox();
  await page.mouse.click(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await page.waitForTimeout(400);
  await page.evaluate(() => { const d = document.querySelector('div[style*="scroll-margin-top"]'); window.scrollTo(0, d.getBoundingClientRect().top + window.scrollY - 12); });
  await shot("city");
  /* the archaeology part of the same panel */
  await page.evaluate(() => { const els = Array.from(document.querySelectorAll('div[style*="scroll-margin-top"] div')); const h = els.find((e) => /^archaeology$/i.test((e.textContent || "").trim()) && e.children.length === 0); if (h) window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 12); });
  await shot("city-archaeology");

  /* layers panel */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Expand Trade routes" }).click();
  await page.getByRole("button", { name: "Expand Journeys" }).click();
  await page.evaluate(() => { const g = document.querySelector('[role="group"][aria-label="Layers"]'); window.scrollTo(0, g.getBoundingClientRect().top + window.scrollY - 16); });
  await shot("layers");
  await page.getByRole("button", { name: "Collapse Trade routes" }).click();
  await page.getByRole("button", { name: "Collapse Journeys" }).click();

  await page.waitForTimeout(8200); /* let the "details below" hint fade */
  /* a kingdom panel */
  await page.getByRole("button", { name: "Reset", exact: true }).first().click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await setYear("950 BC");
  await page.waitForTimeout(300);
  await scrollMapTop(10);
  await shot("united-monarchy");

  /* modern era */
  await setYear("2025");
  await page.getByRole("radio", { name: "Holy Land" }).click();
  await page.waitForTimeout(400);
  await scrollMapTop(10);
  await shot("modern");
  await setYear("AD 30");
  await page.getByRole("radio", { name: "Whole region" }).click();

  /* full screen */
  await page.getByRole("button", { name: "Full screen" }).first().click();
  await page.waitForTimeout(900);
  await shot("fullscreen");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByRole("button", { name: "Expand Journeys" }).click().catch(() => {});
  await shot("fullscreen-layers");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByRole("button", { name: "Details" }).click();
  await shot("fullscreen-details");
  await ctx.close();
}

await run("desktop", { viewport: { width: 1440, height: 900 } });
await run("mobile", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await run("desktop-dark", { viewport: { width: 1440, height: 900 } }, "dark");
await browser.close();
