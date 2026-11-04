import { LEAD_STATUSES, type LeadStatus } from "@/db/schema";

/** A lead's statuses in the admin: labels and badge colours (safe in client code). */

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = { new: "חדש", in_progress: "בטיפול", handled: "טופל", not_relevant: "לא רלוונטי" };

/** Tailwind classes of a lead's status badge */
export const LEAD_STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-copper-tint text-copper-deep ring-copper/30",
  in_progress: "bg-sky-50 text-sky-800 ring-sky-200",
  handled: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  not_relevant: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const isLeadStatus = (x: unknown): x is LeadStatus => typeof x === "string" && (LEAD_STATUSES as readonly string[]).includes(x);
/** A status the admin doesn't know (written by hand, say) reads as new. */
export const leadStatus = (s: string): LeadStatus => (isLeadStatus(s) ? s : "new");
