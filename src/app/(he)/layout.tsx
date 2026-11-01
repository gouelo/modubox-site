import { rootMetadata, SiteShell } from "@/components/SiteShell";
import "../globals.css";

export { viewport } from "@/components/SiteShell";
export const metadata = rootMetadata("he");

export default function HebrewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteShell locale="he">{children}</SiteShell>;
}
