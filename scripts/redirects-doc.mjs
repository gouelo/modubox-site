// Writes docs/redirects.md from data/redirects.json (the old Wix site's addresses → new pages).
// Run: node scripts/redirects-doc.mjs
import fs from "node:fs";

const rows = JSON.parse(fs.readFileSync("data/redirects.json", "utf8"));
const groups = [
  ["product", "מוצרים (/product-page/…)"],
  ["page", "עמודים"],
  ["blog", "פוסטים בבלוג (/post/…)"],
  ["en", "העותק האנגלי של Wix (/en/…)"],
  ["pattern", "תבניות כלליות של Wix (נבדקות אחרונות)"],
];
const cell = (s) => s.replace(/\|/g, "\\|");
let md = `# הפניות 301 מהאתר הישן (Wix)

כל כתובת של האתר הישן modubox.com מופנית לדף המתאים ביותר באתר החדש, בהפניה קבועה. ההפניות מוגדרות ב־\`data/redirects.json\` (ונענות ב־\`src/proxy.api.ts\`; בממשק הניהול, תוכן ← הפניות, אפשר לשנות, לכבות ולהוסיף), ועובדות ב־Vercel ברגע שהדומיין עובר אליו (לא ב־GitHub Pages).

המקורות: כל מפות האתר של Wix (‏\`sitemap.xml\` ← מוצרים, עמודים, פוסטים, קטגוריות בבלוג, הזמנות), העותק האנגלי שלהן תחת \`/en/\`, ותבניות הכתובות הקבועות של Wix. כתובת שאין לה דף מקביל מופנית לקטלוג, לבלוג או לדף הבית.

הקובץ הזה נוצר אוטומטית: \`node scripts/redirects-doc.mjs\`.

**סה"כ: ${rows.length} הפניות.**
`;
for (const [kind, title] of groups) {
  const g = rows.filter((r) => r.kind === kind);
  if (!g.length) continue;
  md += `\n## ${title} (${g.length})\n\n| כתובת ישנה | כתובת חדשה | הערה |\n|---|---|---|\n`;
  for (const r of g) md += `| \`${cell(r.source)}\` | \`${cell(r.destination)}\` | ${cell(r.note)} |\n`;
}
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/redirects.md", md);
console.log(`docs/redirects.md: ${rows.length} redirects`);
