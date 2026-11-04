import type { NextConfig } from "next";

// Two ways to build:
// - GitHub Pages (the preview): a static export under /modubox-site. The Pages
//   workflow sets GITHUB_PAGES=true and NEXT_PUBLIC_BASE_PATH. A static export
//   has no server, so the API routes (files named route.api.ts) are left out.
// - Vercel / the real domain: a normal Next.js build at the root, with the API
//   routes (Z-Credit checkout) and the admin panel (/admin: its pages are
//   page.api.tsx, its lock src/proxy.api.ts). VERCEL is set by Vercel itself and always wins.
const pagesExport = !process.env.VERCEL && (process.env.GITHUB_PAGES === "true" || !!process.env.NEXT_PUBLIC_BASE_PATH);
const basePath = pagesExport ? process.env.NEXT_PUBLIC_BASE_PATH || "" : "";

// The old Wix site's addresses (data/redirects.json, the table in
// docs/redirects.md) and the admin's own redirects are answered by the proxy
// (src/proxy.api.ts, src/lib/seo/redirects.ts), so the admin can edit them.
// A static export has no server, so none on GitHub Pages.

const nextConfig: NextConfig = {
  ...(pagesExport ? { output: "export" as const } : {}),
  // *.api.ts(x) files (API routes, the admin, the proxy) need a server: only built when there is one
  pageExtensions: pagesExport ? ["tsx", "ts"] : ["api.tsx", "api.ts", "tsx", "ts"],
  devIndicators: false,
  trailingSlash: true,
  basePath,
  // two root layouts (Hebrew at /, English at /en/), so the 404 page is app/global-not-found.tsx
  experimental: { globalNotFound: true },
  // the blog's Markdown is read at run time too, when a page is rebuilt after an admin save
  outputFileTracingIncludes: { "/**": ["./content/blog/**"] },
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
