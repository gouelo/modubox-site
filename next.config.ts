import type { NextConfig } from "next";
import oldSite from "./data/redirects.json";

// Two ways to build:
// - GitHub Pages (the preview): a static export under /modubox-site. The Pages
//   workflow sets GITHUB_PAGES=true and NEXT_PUBLIC_BASE_PATH. A static export
//   has no server, so the API routes (files named route.api.ts) are left out.
// - Vercel / the real domain: a normal Next.js build at the root, with the API
//   routes (Z-Credit checkout). VERCEL is set by Vercel itself and always wins.
const pagesExport = !process.env.VERCEL && (process.env.GITHUB_PAGES === "true" || !!process.env.NEXT_PUBLIC_BASE_PATH);
const basePath = pagesExport ? process.env.NEXT_PUBLIC_BASE_PATH || "" : "";

// The old Wix site's addresses (pages, products, blog posts, categories and its
// usual URL patterns), each to its closest page here: permanent (301)
// redirects, live once modubox.com points at Vercel. The table is
// docs/redirects.md (made from data/redirects.json by scripts/redirects-doc.mjs).
// A static export has no server, so none on GitHub Pages.
async function redirects() {
  return oldSite.map((r) => ({ source: encodePath(r.source), destination: encodePath(r.destination), statusCode: 301 as const }));
}

/** Hebrew addresses arrive percent-encoded: match them that way (":params" stay as they are). */
function encodePath(path: string): string {
  return path
    .split("/")
    .map((seg) => (seg.startsWith(":") ? seg : encodeURIComponent(seg)))
    .join("/");
}

const nextConfig: NextConfig = {
  ...(pagesExport ? { output: "export" as const } : {}),
  // route.api.ts files are server routes: only built when there is a server
  pageExtensions: pagesExport ? ["tsx", "ts"] : ["api.ts", "tsx", "ts"],
  devIndicators: false,
  trailingSlash: true,
  basePath,
  ...(pagesExport ? {} : { redirects }),
  // two root layouts (Hebrew at /, English at /en/), so the 404 page is app/global-not-found.tsx
  experimental: { globalNotFound: true },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
