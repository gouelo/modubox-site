import { getDb } from "@/db";
import { can } from "@/lib/admin/auth";
import { ordersCsv } from "@/lib/admin/csv";
import { exportOrders, readFilters } from "@/lib/admin/queries";
import { getSession } from "@/lib/admin/session";
import { israelDate } from "@/lib/admin/time";

// GET /admin/export/?view=…&q=…&from=…&to=… : the orders the list shows, as a CSV file.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!can(await getSession(), "export")) return new Response("unauthorized", { status: 401 });
  const db = getDb();
  if (!db) return new Response("no database", { status: 503 });
  const f = readFilters(Object.fromEntries(new URL(req.url).searchParams));
  const csv = ordersCsv(await exportOrders(db, f));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="modubox-orders-${israelDate(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
