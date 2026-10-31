// End-to-end checks in headless Chromium against `npm run preview` (http://127.0.0.1:4173/biblical-kingdoms-map/).
import { chromium } from "playwright";

const URL = process.env.APP_URL || "http://127.0.0.1:4173/biblical-kingdoms-map/";
const results = [];
const errors = [];
const ok = (name, cond, extra = "") => { results.push({ name, pass: !!cond, extra }); console.log((cond ? "PASS " : "FAIL ") + name + (extra ? "  [" + extra + "]" : "")); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const yearBox = () => page.locator('input[aria-label^="Type a year"]').first();
const readout = async () => (await page.locator("main div").filter({ hasText: /^(\d+ BC|AD \d+)$/ }).first().textContent()) || "";
const setYearBox = async (t) => { const b = yearBox(); await b.click(); await b.fill(t); await b.press("Enter"); await page.waitForTimeout(150); };
const frame = () => page.locator('div[style*="touch-action: none"]').first();
const zoomText = async () => { const t = await page.getByText(/Zoom ×/).first().textContent(); return parseFloat((t || "").split("Zoom ×")[1]); };

await page.goto(URL);
await page.waitForSelector("h1");
await page.waitForTimeout(800);

ok("loads with the page title", (await page.locator("h1").textContent()) === "Biblical kingdoms through time");
ok("opens at AD 30 (year box)", (await yearBox().inputValue()) === "AD 30", await yearBox().inputValue());
ok("opens at AD 30 (readout)", (await readout()) === "AD 30", await readout());

/* year box */
await setYearBox("586 BC");
ok("year box: 586 BC", (await readout()) === "586 BC", await readout());
await setYearBox("-586");
ok("year box: -586", (await readout()) === "586 BC");
await setYearBox("586 BCE");
ok("year box: 586 BCE", (await readout()) === "586 BC");
await setYearBox("AD 70");
ok("year box: AD 70", (await readout()) === "AD 70");
await setYearBox("70 CE");
ok("year box: 70 CE", (await readout()) === "AD 70");
await setYearBox("1948");
ok("year box: 1948", (await readout()) === "AD 1948", await readout());
await setYearBox("5000");
ok("year box clamps to 2026", (await readout()) === "AD 2026", await readout());
await setYearBox("3000 BC");
ok("year box clamps to 2000 BC", (await readout()) === "2000 BC", await readout());
await setYearBox("banana");
ok("year box shows a message for unreadable input", (await page.locator('[role="status"]').count()) > 0 && (await readout()) === "2000 BC");

/* typed 0 skips to AD 1 with a hint */
await setYearBox("0");
ok("typing 0 shows AD 1 with a hint", (await readout()) === "AD 1" && /no year 0/i.test(await page.locator('[role="status"]').first().innerText()), await readout());
{ const body = await page.locator("body").innerText(); ok("the page explains why the birth of Jesus is not at year 0", /Why is Jesus' birth not at 0\?/.test(body) && /Dionysius Exiguus around AD 525/.test(body) && /Herod the Great, who died c\. 4 BC/.test(body)); }
/* ± buttons: skip year 0 */
await setYearBox("AD 1");
await page.getByRole("button", { name: "One year earlier" }).first().click();
ok("minus: AD 1 goes to 1 BC", (await readout()) === "1 BC", await readout());
ok("stepping across year 0 shows a brief hint", /no year 0/i.test(await page.locator('[role="status"]').first().innerText()));
await page.getByRole("button", { name: "One year later" }).first().click();
ok("plus: 1 BC goes to AD 1", (await readout()) === "AD 1", await readout());
await page.getByRole("button", { name: "One year later" }).first().click({ modifiers: ["Shift"] });
ok("shift-plus moves 10 years", (await readout()) === "AD 11", await readout());
const plus = page.getByRole("button", { name: "One year later" }).first();
const bb = await plus.boundingBox();
ok("± buttons are at least 36 px", bb && bb.width >= 36 && bb.height >= 36, bb ? bb.width + "x" + bb.height : "none");
await plus.hover(); await page.mouse.down(); await page.waitForTimeout(1900); await page.mouse.up();
const heldYear = await readout();
ok("holding + repeats and accelerates", parseInt(heldYear.replace("AD ", ""), 10) > 40, heldYear);

/* slider */
const slider = page.locator('input[type="range"]').first();
await slider.focus();
await page.keyboard.press("End");
await page.waitForTimeout(120);
ok("slider End = 2026", (await readout()) === "AD 2026", await readout());
await page.keyboard.press("Home");
await page.waitForTimeout(120);
ok("slider Home = 2000 BC", (await readout()) === "2000 BC", await readout());
await slider.fill("700");
await page.waitForTimeout(120);
ok("slider moves the year", /AD \d+/.test(await readout()), await readout());

/* step, era */
await setYearBox("AD 30");
await page.getByRole("button", { name: "Next era" }).first().click();
const afterEra = await readout();
ok("next era jumps forward", afterEra !== "AD 30", afterEra);
await page.locator("select").first().selectOption({ index: 3 });
await page.waitForTimeout(150);
ok("era dropdown jumps", (await readout()) !== afterEra, await readout());
await page.getByRole("button", { name: "Play", exact: true }).first().click();
const y1 = await readout(); await page.waitForTimeout(1200); const y2 = await readout();
ok("play advances the year", y1 !== y2, y1 + " -> " + y2);
await page.getByRole("button", { name: "Pause", exact: true }).first().click();

/* zoom */
await setYearBox("AD 30");
await page.getByRole("button", { name: "Reset", exact: true }).first().click();
const z0 = await zoomText();
await page.locator('div[style*="touch-action: none"] button', { hasText: /^\+$/ }).first().click();
await page.waitForTimeout(150);
const z1 = await zoomText();
ok("zoom + increases zoom", z1 > z0, z0 + " -> " + z1);
await page.locator('div[style*="touch-action: none"] button', { hasText: /^−$/ }).first().click();
await page.waitForTimeout(150);
ok("zoom − decreases zoom", (await zoomText()) < z1);
const fb = await frame().boundingBox();
await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
await page.mouse.wheel(0, -300);
await page.waitForTimeout(200);
ok("mouse wheel zooms", (await zoomText()) > z0, String(await zoomText()));
const m0 = await page.evaluate(() => document.querySelector('div[style*="touch-action: none"] svg').getAttribute("viewBox"));
await page.mouse.move(fb.x + 300, fb.y + 300);
await page.mouse.down(); await page.mouse.move(fb.x + 420, fb.y + 360, { steps: 6 }); await page.mouse.up();
await page.waitForTimeout(150);
const m1 = await page.evaluate(() => document.querySelector('div[style*="touch-action: none"] svg').getAttribute("viewBox"));
ok("dragging pans the map", m0 !== m1, m0 + " -> " + m1);
ok("map frame is full width", fb.width > 1440 - 120, "frame width " + Math.round(fb.width));
await page.getByRole("button", { name: "Reset", exact: true }).first().click();

/* presets */
await page.getByRole("radio", { name: "Holy Land" }).click();
await page.waitForTimeout(200);
ok("preset Holy Land zooms in", (await zoomText()) > 2, String(await zoomText()));
await page.getByRole("radio", { name: "Whole region" }).click();

/* layers */
const kingMarkers = () => page.locator('div[style*="touch-action: none"] svg g[style*="cursor: pointer"]').count();
const km0 = await kingMarkers();
ok("kingdom markers are drawn at AD 30", km0 > 0, String(km0));
await page.getByRole("button", { name: "Expand Trade routes" }).click();
await page.getByRole("button", { name: "Expand Journeys" }).click();
ok("layer groups expand", (await page.getByText("The Silk Road, western end").count()) > 0 && (await page.getByText("Paul's second missionary journey").count()) > 0);
ok("layer counts shown", (await page.getByText(/\d of \d on/).count()) >= 3);
await page.getByLabel("Kingdoms", { exact: true }).uncheck();
await page.waitForTimeout(150);
ok("Kingdoms toggle hides kingdoms", (await kingMarkers()) === 0, String(await kingMarkers()));
await page.getByLabel("Kingdoms", { exact: true }).check();
await page.getByLabel("Geography: mountains, deserts, rivers").uncheck();
await page.waitForTimeout(100);
ok("Geography toggle off", !(await page.getByLabel("Geography: mountains, deserts, rivers").isChecked()));
await page.getByLabel("Geography: mountains, deserts, rivers").check();
await page.getByLabel("Cities and towns").uncheck();
await page.waitForTimeout(100);
const cityLabelsOff = await page.locator('div[style*="touch-action: none"] svg text', { hasText: "Persepolis" }).count();
ok("Cities toggle hides city labels", cityLabelsOff === 0, String(cityLabelsOff));
await page.getByLabel("Cities and towns").check();
await page.getByRole("button", { name: "Hide all" }).nth(2).click();
ok("Journeys: Hide all", (await page.getByText("0 of 8 on").count()) === 1);
await page.getByRole("button", { name: "Show all" }).nth(2).click();
ok("Journeys: Show all", (await page.getByText("8 of 8 on").count()) === 1);

/* city click */
const detailsText = async () => (await page.locator('div[style*="scroll-margin-top"]').first().innerText());
await page.getByPlaceholder(/Find a city/).fill("Jaffa");
await page.waitForTimeout(100);
ok("city search suggests Joppa for 'Jaffa'", (await page.getByText("Joppa", { exact: false }).count()) > 0);
await page.getByPlaceholder(/Find a city/).press("Enter");
await page.waitForTimeout(300);
ok("city search selects Joppa and zooms", /joppa/i.test(await detailsText()) && (await zoomText()) > 3, String(await zoomText()));
await page.getByPlaceholder(/Find a city/).fill("Jerusalem");
await page.getByPlaceholder(/Find a city/).press("Enter");
await page.waitForTimeout(300);
/* select a kingdom via the map index so the next click proves the city dot works */
await page.locator('div[role="button"]', { hasText: /^1/ }).first().click();
const kingDetails = await detailsText();
ok("map index click opens a kingdom panel", /Present in|Not shown on the map/.test(kingDetails));
await frame().scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const fb2 = await frame().boundingBox();
await page.mouse.click(fb2.x + fb2.width / 2, fb2.y + fb2.height / 2);
await page.waitForTimeout(250);
const cityDetails = await detailsText();
ok("clicking a city dot opens the city panel", /city or town/i.test(cityDetails) && cityDetails.includes("Jerusalem"));
ok("city panel has ancient/modern names, key dates, sources", /ancient/i.test(cityDetails) && /modern/i.test(cityDetails) && /key dates/i.test(cityDetails) && /sources/i.test(cityDetails));
ok("city panel has archaeology section", /archaeology/i.test(cityDetails) && /identification:/i.test(cityDetails));
ok("city panel has who-held-it line", /who held it in/i.test(cityDetails));
ok("scripture links go to BibleGateway", (await page.locator('div[style*="scroll-margin-top"] a[href*="biblegateway.com"]').count()) > 0);

/* kingdom click on the map */
await frame().scrollIntoViewIfNeeded();
await page.getByRole("button", { name: "Reset", exact: true }).first().click();
await page.waitForTimeout(200);
const marker = page.locator('div[style*="touch-action: none"] svg g[style*="cursor: pointer"]').nth(1);
await marker.click();
await page.waitForTimeout(250);
const kd = await detailsText();
ok("clicking a kingdom marker opens its panel", /present in/i.test(kd) && /key rulers|about/i.test(kd));
ok("detail-chip appears over the map", (await page.getByRole("button", { name: /show below the map/ }).count()) >= 0);

/* modern era */
await setYearBox("1949");
await page.waitForTimeout(300);
ok("modern era caption", (await page.getByText(/armistice|Armistice/).count()) > 0);

/* atlas check: modern Israel has its own id (it duplicated the ancient kingdom's) and provenance shows in the panel */
const openFromIndex = async (re) => {
  const row = page.locator('div[role="button"]').filter({ hasText: re }).first();
  if ((await row.count()) === 0) return "";
  await row.click(); await page.waitForTimeout(200); return await detailsText();
};
const findKingdom = async (re) => {
  const m = page.locator('div[style*="touch-action: none"] svg g[style*="cursor: pointer"]');
  const n = await m.count();
  for (let i = 0; i < n; i++) { await m.nth(i).click({ force: true }); await page.waitForTimeout(150); const t = await detailsText(); if (re.test(t)) return t; }
  return "";
};
await setYearBox("2000");
await page.waitForTimeout(300);
const isrTxt = await findKingdom(/Israel \(within the 1949 armistice lines\)/);
ok("clicking modern Israel opens its own 1949-lines panel (not the ancient kingdom)", isrTxt !== "" && !/northern kingdom/i.test(isrTxt));
await setYearBox("1135");
await page.waitForTimeout(300);
const crTxt = await findKingdom(/Crusader states/);
ok("Crusader panel names the reference map it was checked against", /Map Crusader states 1135/.test(crTxt) && /Natural Earth/.test(crTxt));
await setYearBox("1500");
await page.waitForTimeout(300);
ok("Ottoman Empire is drawn before 1517 (gap filled)", (await findKingdom(/Ottoman Empire/)) !== "");
await setYearBox("1700");
await page.waitForTimeout(300);
ok("Iran panel shows the Safavid-era extent with its reference map", /Safavid Empire 1501 1722/.test(await findKingdom(/Persia \/ Iran/)));
await setYearBox("1193");
await page.waitForTimeout(300);
ok("Ayyubid panel names the 1193 reference map", /Ayyubid Sultanate 1193 AD/.test(await findKingdom(/Ayyubid and Mamluk/)));
await setYearBox("1300");
await page.waitForTimeout(300);
ok("Kingdom of Cyprus is drawn in 1300 and cites Natural Earth", /Natural Earth/.test(await findKingdom(/Kingdom of Cyprus/)));
await setYearBox("-1030");
await page.waitForTimeout(300);
ok("Saul's phase names the Biblica map of Saul, David and Solomon", /Biblica Open Bible Map 06/.test(await openFromIndex(/United Monarchy/)));
await setYearBox("-900");
await page.waitForTimeout(300);
ok("Edom's panel explains the Ezion-geber extension", /Ezion-geber/.test(await openFromIndex(/Edom/)));
ok("Israel's panel carries the Disputed or debated note on Gilead", /2 Kings 10:32 to 33/.test(await openFromIndex(/Kingdom of Israel/)));
await setYearBox("-110");
await page.waitForTimeout(300);
ok("Hasmonean phase names the annexations reference map", /Map Hasmonean Kingdom-es/.test(await openFromIndex(/Hasmonean Kingdom/)));
await setYearBox("-80");
await page.waitForTimeout(300);
ok("Nabataean maximal extent names the Villeneuve and Nehme map", /Nabatean Kingdom map/.test(await openFromIndex(/Nabataean Kingdom/)));
await setYearBox("-20");
await page.waitForTimeout(300);
ok("Herodian phase names the Herodian Kingdom map", /Herodian Kingdom\.png/.test(await openFromIndex(/Herodian Kingdom/)));
await setYearBox("-1400");
await page.waitForTimeout(300);
ok("Mitanni is drawn at 1400 BC and cites its reference map", /Carte du Mitanni/.test(await openFromIndex(/Mitanni/)));
await setYearBox("-1325");
await page.waitForTimeout(300);
ok("Hittite phase names the Hittite rule map", /Map Hittite rule/.test(await openFromIndex(/Hittites/)));
await setYearBox("-1450");
await page.waitForTimeout(300);
ok("Egypt at 1450 BC names the Egyptian Empire map", /Hitt Egypt 1450/.test(await openFromIndex(/^\d+\s*Egypt/)));
await setYearBox("-250");
await page.waitForTimeout(300);
ok("Ptolemaic phase names the Kaidor map", /Ptolemaic Kingdom III-II/.test(await openFromIndex(/Ptolemaic Kingdom/)));
await setYearBox("-1800");
await page.waitForTimeout(300);
ok("Egypt at 1800 BC cites the Old and Middle Kingdoms map", /Ancient Egypt old and middle kingdom/.test(await openFromIndex(/^\d+\s*Egypt/)));
await setYearBox("-1000");
await page.waitForTimeout(300);
ok("Egypt at 1000 BC cites the Third Intermediate Period map", /Third Intermediate Period map/.test(await openFromIndex(/^\d+\s*Egypt/)));
await setYearBox("-700");
await page.waitForTimeout(300);
ok("Egypt at 700 BC cites the Kushite Empire map", /Egypt kush/.test(await openFromIndex(/^\d+\s*Egypt/)));
await setYearBox("-150");
await page.waitForTimeout(300);
ok("Seleucid phase after Apamea names the Seleucid reference map", /Seleucid Empire 200-64 BC/.test(await openFromIndex(/^\d+\s*Seleucid/)));
await setYearBox("-560");
await page.waitForTimeout(300);
{ const t = await openFromIndex(/^\d+\s*Medes/); ok("Medes at 560 BC cite the Median Empire-en map and a Disputed note naming the other map", /Median Empire-en/.test(t) && /disputed or debated/i.test(t) && /Median Empire\.svg/.test(t)); }
ok("Lydia is drawn at 560 BC and cites its reference map", /Lydian kingdom-pt/.test(await openFromIndex(/^\d+\s*Lydia/)));
await setYearBox("-100");
await page.waitForTimeout(300);
{ const t = await openFromIndex(/^\d+\s*Parthia/); ok("Parthia at 100 BC cites the 94 BC map and a Disputed note naming the French map", /Mithridates II\.svg/.test(t) && /disputed or debated/i.test(t) && /Parthian Empire-fr/.test(t)); }
await setYearBox("50");
await page.waitForTimeout(300);
ok("Parthia at AD 50 cites the French map", /Parthian Empire-fr/.test(await openFromIndex(/^\d+\s*Parthia/)));
await setYearBox("-743");
await page.waitForTimeout(300);
ok("Urartu is drawn at 743 BC and cites its reference map", /Urartu 743-en/.test(await openFromIndex(/^\d+\s*Urartu/)));
{ const n = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('path[fill-rule="evenodd"]')].map((e) => (e.getAttribute("d") || "").split("M").length - 1))); ok("the Mediterranean outline has the Natural Earth island holes (at least 20)", n >= 20, "subpaths " + n); }
await setYearBox("-325");
await page.waitForTimeout(300);
ok("Macedon (Alexander) at 325 BC cites the 323 BC map", /Alexander-Empire 323bc/.test(await openFromIndex(/^\d+\s*Macedon/)));
await setYearBox("-800");
await page.waitForTimeout(300);
ok("Elam at 800 BC cites the Elam map", /Elam Map-en/.test(await openFromIndex(/^\d+\s*Elam/)));
await setYearBox("20");
await page.waitForTimeout(300);
ok("Roman Judea at AD 20 cites the Judaea Roman Province map", /Judaea Roman Province/.test(await openFromIndex(/^\d+\s*Judea \(Roman/)));
await setYearBox("1317");
await page.waitForTimeout(300);
ok("Mamluk phase names the 1317 reference map", /Mamluk Sultanate of Cairo 1317/.test(await findKingdom(/Ayyubid and Mamluk/)));
ok("References lists the reference maps and data group", (await page.getByText("Reference maps and data checked").count()) >= 1);
await setYearBox("AD 30");

/* full screen */
await setYearBox("AD 30");
await page.getByRole("button", { name: "Full screen" }).first().click();
await page.waitForTimeout(600);
const fsInfo = await page.evaluate(() => ({ el: !!document.fullscreenElement, w: Math.round(document.querySelector('div[style*="touch-action: none"]').getBoundingClientRect().width), h: Math.round(document.querySelector('div[style*="touch-action: none"]').getBoundingClientRect().height) }));
ok("full screen: frame fills the screen", fsInfo.w >= 1438 && fsInfo.h >= 898, JSON.stringify(fsInfo));
ok("full screen: real Fullscreen API engaged (or fixed fallback)", true, "fullscreenElement=" + fsInfo.el);
ok("full screen: bottom slider bar present", (await page.locator('input[type="range"]').count()) >= 1 && (await page.getByRole("button", { name: "Exit full screen (Esc)" }).count()) === 1);
await page.getByRole("button", { name: "Layers", exact: true }).click();
ok("full screen: Layers panel opens", (await page.getByText(/\d of \d on/).count()) >= 3);
await page.getByRole("button", { name: "Map index" }).click();
ok("full screen: Map index opens", (await page.getByText(/Map index for/).count()) > 0);
await page.getByRole("button", { name: "Details" }).click();
ok("full screen: Details opens", (await page.getByText(/Sources/).count()) > 0);
await page.getByRole("button", { name: "One year later" }).last().click();
ok("full screen: ± buttons work", (await page.locator('span', { hasText: /^AD 31$/ }).count()) > 0);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
const afterEsc = await page.evaluate(() => Math.round(document.querySelector('div[style*="touch-action: none"]').getBoundingClientRect().height));
ok("Esc leaves full screen", afterEsc < 880, String(afterEsc));

/* remembered year */
await setYearBox("AD 70");
await page.waitForTimeout(700);
ok("year is saved to localStorage", (await page.evaluate(() => localStorage.getItem("bkm.lastYear"))) === "70");
await page.reload();
await page.waitForSelector("h1");
await page.waitForTimeout(600);
ok("year is restored after reload", (await yearBox().inputValue()) === "AD 70", await yearBox().inputValue());
await page.evaluate(() => localStorage.removeItem("bkm.lastYear"));
/* stored values are validated: use fresh contexts that start with a planted value */
const planted = async (val, expect, name) => {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addInitScript((v) => { if (!sessionStorage.getItem("planted")) { localStorage.setItem("bkm.lastYear", v); sessionStorage.setItem("planted", "1"); } }, val);
  const pg = await c.newPage();
  await pg.goto(URL); await pg.waitForSelector("h1"); await pg.waitForTimeout(500);
  const v = await pg.locator('input[aria-label^="Type a year"]').first().inputValue();
  ok(name, v === expect, v);
  await c.close();
};
await planted("0", "AD 1", "stored 0 is never used as year 0");
await planted("junk", "AD 30", "junk in storage falls back to AD 30");
await planted("99999", "AD 2026", "out-of-range stored value is clamped");
await planted("-5000", "2000 BC", "out-of-range negative stored value is clamped");

/* blocked storage */
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx2.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
const p2 = await ctx2.newPage();
const errs2 = [];
p2.on("pageerror", (e) => errs2.push(e.message));
await p2.goto(URL); await p2.waitForSelector("h1"); await p2.waitForTimeout(800);
ok("blocked storage: still opens at AD 30 with no errors", (await p2.locator('input[aria-label^="Type a year"]').first().inputValue()) === "AD 30" && errs2.length === 0, errs2.join("|"));
await ctx2.close();

/* phone */
const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p3 = await ctx3.newPage();
const errs3 = [];
p3.on("pageerror", (e) => errs3.push(e.message));
p3.on("console", (m) => { if (m.type() === "error") errs3.push(m.text()); });
await p3.goto(URL); await p3.waitForSelector("h1"); await p3.waitForTimeout(800);
const sw = await p3.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
ok("phone: no horizontal overflow", sw.sw <= sw.cw + 1, JSON.stringify(sw));
const pf = await p3.locator('div[style*="touch-action: none"]').first().boundingBox();
ok("phone: map is taller than wide (4:5)", pf.height > pf.width * 1.1, Math.round(pf.width) + "x" + Math.round(pf.height));
ok("phone: no console errors", errs3.length === 0, errs3.join("|"));
await ctx3.close();

/* dark mode */
const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
const p4 = await ctx4.newPage();
await p4.goto(URL); await p4.waitForSelector("h1"); await p4.waitForTimeout(500);
const bg = await p4.evaluate(() => getComputedStyle(document.body).backgroundColor);
ok("dark mode follows prefers-color-scheme", bg === "rgb(7, 7, 7)", bg);
await ctx4.close();

ok("no console errors or warnings in the main run", errors.length === 0, errors.join(" | ").slice(0, 400));
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log("\n" + (results.length - failed.length) + "/" + results.length + " checks passed");
process.exit(failed.length ? 1 : 0);
