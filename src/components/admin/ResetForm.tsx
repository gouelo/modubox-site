import { resetTextAction } from "@/lib/admin/site-actions";
import { ActionForm } from "./ContentForms";

/** Drops a saved text (business details, promo, FAQ, reviews): the site goes back to data/ at the next build. */
export function ResetForm({ kind }: { kind: string }) {
  return (
    <ActionForm action={resetTextAction} submit="חזרה למה שבקבצים" className="mt-4" confirm="למחוק את השינויים שנשמרו כאן ולחזור לתוכן המקורי של האתר?">
      <input type="hidden" name="kind" value={kind} />
    </ActionForm>
  );
}
