// Accessibility check (IS 5568 = WCAG 2.0 AA): runs axe on every kind of page,
// in Hebrew and in English, on phone and desktop widths, against the built site.
//
//   npm run build && npm run a11y
//
// Needs a Chromium: CHROMIUM=/path/to/chrome, or Playwright's own browser
// (npx playwright install chromium). Exits 1 if axe finds a violation.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright-core";

const OUT = path.resolve("out");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const PAGES = ["/", "/shop/", "/product/modubox-3x2/", "/product/modubox-6x3/", "/product/toilet-1x1/", "/gallery/", "/faq/", "/about/", "/contact/", "/terms/", "/warranty/", "/accessibility/", "/cart/", "/cart/?filled", "/checkout/", "/everest/", "/gilboa/", "/shed-accessories/", "/מבנים-מיוחדים-ושירותים/", "/no-such-page/"];
// "?filled": the cart with sheds in it (a small and a large one, so the promotion's gifts and the floor colour picker show while they run)
const FILLED = { state: { items: [{ id: "a11y1", slug: "modubox-2x2", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }, { id: "a11y2", slug: "modubox-3x2", qty: 1, selections: { "wpc-floor": "teak", "glass-wall+glass": 2, "glass-wall+glass-shutter": 1 }, fulfillment: "deliveryAndInstallation" }, { id: "a11y3", slug: "modubox-4x3", qty: 1, selections: {}, fulfillment: "deliveryAndInstallation" }], coupon: undefined }, version: 3 };
const WIDTHS = [390, 1440];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".txt": "text/plain", ".woff2": "font/woff2", ".mp4": "video/mp4", ".xml": "application/xml" };

if (!fs.existsSync(OUT)) {
  console.error("No build in out/ – run npm run build first.");
  process.exit(2);
}

// the built site, served as GitHub Pages would (with its base path and 404.html)
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length) || "/";
  let file = path.join(OUT, p);
  if (!file.startsWith(OUT)) return res.writeHead(400).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  let status = 200;
  if (!fs.existsSync(file)) {
    // the image loader's variants live in public/_img (copied in at deploy)
    const pub = path.join(path.resolve("public"), p);
    if (fs.existsSync(pub) && fs.statSync(pub).isFile()) file = pub;
    else {
      file = path.join(OUT, "404.html");
      status = 404;
    }
  }
  res.writeHead(status, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}${BASE}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
let failures = 0;
for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  for (const locale of ["he", "en"]) {
    for (const p of PAGES) {
      const url = `${origin}${locale === "en" ? (p === "/" ? "/en/" : `/en${p}`) : p}`;
      await page.goto(url, { waitUntil: "networkidle" });
      if (p.endsWith("?filled")) {
        await page.evaluate((cart) => localStorage.setItem("modubox-cart", JSON.stringify(cart)), FILLED);
        await page.reload({ waitUntil: "networkidle" });
      }
      // scroll through, so everything that fades in on scroll is in
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      // 1.5s: the floating 3D button comes in 1.2s after load
      await page.waitForTimeout(1500);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      if (p.endsWith("?filled")) await page.evaluate(() => localStorage.removeItem("modubox-cart"));
      const label = `${width}px ${url.replace(origin, "") || "/"}`;
      if (!violations.length) {
        console.log(`ok    ${label}`);
        continue;
      }
      failures += violations.length;
      console.log(`FAIL  ${label}`);
      for (const v of violations) {
        console.log(`  - ${v.id} (${v.impact}): ${v.help}`);
        for (const n of v.nodes.slice(0, 6)) console.log(`      ${n.target.join(" ")}  ${n.failureSummary?.split("\n").slice(1, 2).join(" ") ?? ""}`);
      }
    }
  }
  await context.close();
}
await browser.close();
server.close();
console.log(failures ? `\n${failures} violation(s)` : "\nNo WCAG 2.0 A/AA violations found by axe.");
process.exit(failures ? 1 : 0);
