// next/image loader: picks the pre-made WebP size (see scripts/optimize-images.mjs).
const WIDTHS = [480, 960, 1600, 2400];

export default function imageLoader({ src, width }: { src: string; width: number }) {
  if (/^https?:\/\//.test(src)) return src;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const w = WIDTHS.find((x) => x >= width) ?? WIDTHS[WIDTHS.length - 1];
  const rel = src.replace(/^\/?(images\/)?/, "").replace(/\.\w+$/, "");
  return `${base}/_img/${rel}-${w}.webp`;
}
