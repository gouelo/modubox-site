// Prefix for files in /public when the site is served from a sub-folder (GitHub Pages).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? "" : "/"}${path}`;
}
