import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Markdown } from "@/lib/markdown";

export const metadata: Metadata = { title: "אחריות ושירות", description: "10 שנות אחריות על מחסני מודובוקס – תנאי האחריות והשירות לאחר מכירה." };

export default function WarrantyPage() {
  const source = fs.readFileSync(path.join(process.cwd(), "content/warranty.md"), "utf8");
  return (
    <div className="container-x max-w-3xl py-14">
      <Markdown source={source} />
    </div>
  );
}
