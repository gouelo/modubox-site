import { getDb } from "@/db";
import { can } from "@/lib/admin/auth";
import { exportLeads, leadsCsv, readLeadFilters } from "@/lib/admin/leads";
import { getSession } from "@/lib/admin/session";
import { israelDate } from "@/lib/admin/time";

// GET /admin/leads-export/?status=…&q=…&from=…&to=… : the leads the list shows, as a CSV file.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!can(session, "leads") || !can(session, "export")) return new Response("unauthorized", { status: 401 });
  const db = getDb();
  if (!db) return new Response("no database", { status: 503 });
  const csv = leadsCsv(await exportLeads(db, readLeadFilters(Object.fromEntries(new URL(req.url).searchParams))));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="modubox-leads-${israelDate(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
