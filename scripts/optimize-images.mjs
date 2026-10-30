// Makes small, fast WebP copies of every photo in public/images.
// Runs automatically before `npm run dev` and `npm run build`.
// Put original photos (jpg / png / webp) anywhere under public/images.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "public/images";
const OUT = "public/_img";
export const WIDTHS = [480, 960, 1600, 2400];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(jpe?g|png|webp|avif)$/i.test(e.name) ? [p] : [];
  });
}

let made = 0;
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).replace(/\.\w+$/, "");
  const srcTime = fs.statSync(file).mtimeMs;
  for (const w of WIDTHS) {
    const out = path.join(OUT, `${rel}-${w}.webp`);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= srcTime) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(file)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: w > 1000 ? 74 : 70 })
      .toFile(out);
    made++;
  }
}
console.log(`images: ${made} new variants in ${OUT}`);
