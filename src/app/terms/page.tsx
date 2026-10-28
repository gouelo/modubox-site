import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Markdown } from "@/lib/markdown";

export const metadata: Metadata = { title: "תקנון האתר", description: "תקנון האתר, תנאי הובלה והתקנה וביטול עסקה – מודובוקס." };

export default function TermsPage() {
  const source = fs.readFileSync(path.join(process.cwd(), "content/terms.md"), "utf8");
  return (
    <div className="container-x max-w-3xl py-14">
      <Markdown source={source} />
    </div>
  );
}
