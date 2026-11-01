import { rootMetadata, SiteShell } from "@/components/SiteShell";
import "../globals.css";

export { viewport } from "@/components/SiteShell";
export const metadata = rootMetadata("en");

/** The English site, under /en/: the same pages, left to right. */
export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteShell locale="en">{children}</SiteShell>;
}
