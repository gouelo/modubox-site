import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="text-7xl font-black text-brand">404</p>
        <h1 className="mt-3 text-3xl font-black">העמוד לא נמצא</h1>
        <p className="mt-2 text-ink-soft">אולי הוא עבר למקום אחר. בואו נחזור למחסנים.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary">לדף הבית</Link>
          <Link href="/shop/" className="btn-ghost">לקטלוג</Link>
        </div>
      </div>
    </div>
  );
}
