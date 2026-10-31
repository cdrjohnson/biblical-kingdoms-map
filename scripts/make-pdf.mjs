// Renders docs/USER_GUIDE.md to docs/User-Guide.pdf (needs: npm i, npx playwright install chromium)
import { chromium } from "playwright";
import { marked } from "marked";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(resolve(root, "docs/USER_GUIDE.md"), "utf8");
const slug = (t) => t.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
const renderer = new marked.Renderer();
renderer.heading = function (a, b) {
  const text = typeof a === "object" ? a.text : a;
  const depth = typeof a === "object" ? a.depth : b;
  const html = typeof a === "object" && this.parser ? this.parser.parseInline(a.tokens) : text;
  return `<h${depth} id="${slug(text)}">${html}</h${depth}>\n`;
};
const body = marked.parse(md, { renderer, gfm: true });
const css = `
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
body { font: 11pt/1.55 "Georgia", "Times New Roman", serif; color: #2b2217; }
h1 { font-size: 26pt; margin: 0 0 6pt; color: #5b3a12; border-bottom: 3px solid #b5651d; padding-bottom: 6pt; }
h2 { font-size: 16pt; margin: 22pt 0 6pt; color: #7a4a14; page-break-after: avoid; }
h3 { font-size: 12.5pt; margin: 14pt 0 4pt; color: #5b3a12; page-break-after: avoid; }
p, li { orphans: 3; widows: 3; }
a { color: #1f5f8b; text-decoration: none; }
img { display: block; max-width: 100%; max-height: 105mm; margin: 10pt auto; border: 1px solid #cdbb94; border-radius: 4px; page-break-inside: avoid; }
table { border-collapse: collapse; margin: 8pt 0; width: 100%; page-break-inside: avoid; }
th, td { border: 1px solid #cdbb94; padding: 4pt 8pt; text-align: left; font-size: 10.5pt; }
th { background: #f1e6c8; }
code { font: 10pt "Courier New", monospace; background: #f4ecd6; padding: 0 3pt; border-radius: 3px; }
hr { border: 0; border-top: 1px solid #cdbb94; margin: 14pt 0; }
strong { color: #3d2a0e; }
ul, ol { padding-left: 18pt; }
blockquote { margin: 8pt 0; padding: 4pt 10pt; border-left: 3px solid #b5651d; background: #f8f1de; }
`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Biblical Kingdoms Map: User Guide</title><style>${css}</style></head><body>${body}</body></html>`;
mkdirSync(resolve(root, "scripts/.tmp"), { recursive: true });
const tmp = resolve(root, "docs/.guide-print.html");
writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
await page.evaluate(async () => { await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))); });
await page.pdf({
  path: resolve(root, "docs/User-Guide.pdf"), format: "A4", printBackground: true, displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: '<div style="width:100%;font:8pt Georgia,serif;color:#7a6a4a;text-align:center">Biblical Kingdoms Map: User Guide · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  margin: { top: "18mm", bottom: "20mm", left: "16mm", right: "16mm" },
});
await browser.close();
import("node:fs").then((fs) => fs.rmSync(tmp));
console.log("wrote docs/User-Guide.pdf");
