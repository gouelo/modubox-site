import type { NextConfig } from "next";

// Two ways to build:
// - GitHub Pages (the preview): a static export under /modubox-site. The Pages
//   workflow sets GITHUB_PAGES=true and NEXT_PUBLIC_BASE_PATH. A static export
//   has no server, so the API routes (files named route.api.ts) are left out.
// - Vercel / the real domain: a normal Next.js build at the root, with the API
//   routes (Z-Credit checkout). VERCEL is set by Vercel itself and always wins.
const pagesExport = !process.env.VERCEL && (process.env.GITHUB_PAGES === "true" || !!process.env.NEXT_PUBLIC_BASE_PATH);
const basePath = pagesExport ? process.env.NEXT_PUBLIC_BASE_PATH || "" : "";

const nextConfig: NextConfig = {
  ...(pagesExport ? { output: "export" as const } : {}),
  // route.api.ts files are server routes: only built when there is a server
  pageExtensions: pagesExport ? ["tsx", "ts"] : ["api.ts", "tsx", "ts"],
  devIndicators: false,
  trailingSlash: true,
  basePath,
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
