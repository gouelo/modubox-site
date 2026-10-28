"use client";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { useCart } from "@/lib/cart-store";
import { addonsFor, site } from "@/lib/catalog";
import { formatILS } from "@/lib/format";
import { layoutShed, MODULE_ADDONS } from "@/lib/layout";
import { defaultFulfillment, defaultSelections, fulfillmentOptions, quote } from "@/lib/pricing";
import { decodeSelections, encodeSelections } from "@/lib/share";
import type { Addon, Product, Selections } from "@/lib/types";
import { configMessage, waLink } from "@/lib/whatsapp";
import type { ShedSpec } from "./ShedModel";

const ShedViewer = dynamic(() => import("./ShedViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-3 text-ink-soft">
        <span className="size-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
        <span className="text-sm font-semibold">טוען הדמיה תלת־ממדית…</span>
      </div>
    </div>
  ),
});

function AnimatedPrice({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 140, damping: 22 });
  const text = useTransform(spring, (v) => formatILS(Math.round(v)));
  useEffect(() => spring.set(value), [spring, value]);
  return <motion.span>{text}</motion.span>;
}

function specFor(product: Product, sel: Selections, view: { doorOpen: boolean; interior: boolean }): ShedSpec {
  const outer = product.dimensions?.outer;
  const shelves = [
    ...Array(Number(sel["shelf-4"] ?? 0)).fill(1.83),
    ...Array(Number(sel["shelf-5"] ?? 0)).fill(1.905),
  ];
  return {
    width: outer ? outer.width / 100 : product.widthM,
    depth: outer ? outer.depth / 100 : product.depthM,
    heightFront: outer ? outer.heightMax / 100 : 2.33,
    heightBack: outer ? outer.heightMin / 100 : 2.18,
    profile: sel["profile-color"] === "black" ? "black" : "white",
    layout: layoutShed(product, sel),
    grills: Number(sel["vent-grill"] ?? 0),
    electric: sel["electric-panel"] === 1,
    ac: typeof sel.ac === "string" && sel.ac !== "none",
    shelves,
    platform: sel.platform === 1,
    kipWindow: sel["kip-window"] === 1,
    solar: sel["solar-light"] === 1,
    doorOpen: view.doorOpen,
    interior: view.interior,
  };
}

function PriceTag({ price }: { price: number | null | undefined }) {
  if (price === null || price === undefined) return <span className="text-xs font-bold text-brand-dark">מחיר בתיאום</span>;
  if (price === 0) return <span className="text-xs font-bold text-ink-soft">ללא תוספת</span>;
  return <span className="text-sm font-bold">+{formatILS(price)}</span>;
}

function AddonRow({ addon, value, onChange, canAdd }: { addon: Addon; value: number | string | undefined; onChange: (v: number | string) => void; canAdd: boolean }) {
  const [open, setOpen] = useState(false);
  const active = addon.kind === "choice" ? value !== addon.default : Number(value ?? 0) > 0;
  return (
    <div className={`rounded-2xl border p-3.5 transition ${active ? "border-brand bg-brand-tint/60" : "border-line bg-white"}`}>
      <div className="flex items-center gap-3">
        {addon.image ? (
          <Image src={addon.image} alt="" width={56} height={56} sizes="56px" className="size-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-sand text-brand-dark">
            <Icon name={addon.group.includes("חשמל") ? "bolt" : addon.group.includes("עיצוב") ? "sun" : "cube"} className="size-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-start font-bold leading-snug">
            {addon.name}
            {addon.description && <Icon name="chevron" className={`size-4 shrink-0 text-ink/40 transition ${open ? "rotate-180" : ""}`} />}
          </button>
          {addon.kind !== "choice" && <PriceTag price={addon.price} />}
          {addon.kind !== "choice" && addon.kind === "qty" && addon.price ? <span className="text-xs text-ink-soft"> ליחידה</span> : null}
        </div>
        {addon.kind === "toggle" && (
          <button
            type="button"
            role="switch"
            aria-checked={value === 1}
            aria-label={addon.name}
            onClick={() => onChange(value === 1 ? 0 : 1)}
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${value === 1 ? "bg-brand" : "bg-ink/15"}`}
          >
            <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${value === 1 ? "start-7" : "start-1"}`} />
          </button>
        )}
        {addon.kind === "qty" && (
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-sand p-1">
            <button type="button" aria-label={`פחות ${addon.name}`} disabled={!value} onClick={() => onChange(Math.max(0, Number(value ?? 0) - 1))} className="grid size-8 place-items-center rounded-full bg-white shadow-sm disabled:opacity-30">
              <Icon name="minus" className="size-4" />
            </button>
            <span className="w-6 text-center font-bold tabular-nums" aria-live="polite">{Number(value ?? 0)}</span>
            <button type="button" aria-label={`עוד ${addon.name}`} disabled={!canAdd || Number(value ?? 0) >= (addon.maxQty ?? 9)} onClick={() => onChange(Number(value ?? 0) + 1)} className="grid size-8 place-items-center rounded-full bg-ink text-white shadow-sm disabled:opacity-30">
              <Icon name="plus" className="size-4" />
            </button>
          </div>
        )}
      </div>
      {addon.kind === "choice" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {addon.choices!.map((c) => {
            const on = value === c.id;
            const blocked = !on && !canAdd && c.id !== addon.default && value === addon.default;
            return (
              <button
                key={c.id}
                type="button"
                disabled={blocked}
                onClick={() => onChange(c.id)}
                aria-pressed={on}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-30 ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/40"}`}
              >
                {c.swatch && <span className="size-4 rounded-full ring-1 ring-black/15" style={{ background: c.swatch }} />}
                {c.label}
                {c.price ? <span className={on ? "text-white/70" : "text-ink-soft"}>+{formatILS(c.price)}</span> : null}
              </button>
            );
          })}
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && addon.description && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden text-sm leading-6 text-ink-soft">
            <span className="block pt-2">{addon.description}{addon.note ? ` ${addon.note}` : ""}</span>
          </motion.p>
        )}
      </AnimatePresence>
      {addon.note && !open && <p className="mt-1.5 text-xs text-ink-soft">{addon.note}</p>}
    </div>
  );
}

export function Configurator({ product, sizes }: { product: Product; sizes?: Product[] }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [sel, setSel] = useState<Selections>(() => defaultSelections(product));
  const [view, setView] = useState({ doorOpen: false, interior: false });
  const [showDims, setShowDims] = useState(true);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  // reset when the size changes, and read a shared configuration from the URL (#c=...)
  useEffect(() => {
    const base = defaultSelections(product);
    const code = new URLSearchParams(window.location.hash.slice(1)).get("c");
    const shared = code ? decodeSelections(code) : null;
    const allowed = new Set(addonsFor(product).map((a) => a.id));
    const merged = { ...base };
    if (shared) for (const [k, v] of Object.entries(shared)) if (allowed.has(k)) merged[k] = v;
    // the hash only exists in the browser, so it can't be read during the static render
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSel(merged);
  }, [product]);

  const addons = useMemo(() => addonsFor(product), [product]);
  const groups = useMemo(() => {
    const g = new Map<string, Addon[]>();
    for (const a of addons) g.set(a.group, [...(g.get(a.group) ?? []), a]);
    return [...g.entries()];
  }, [addons]);
  const q = useMemo(() => quote(product, sel), [product, sel]);
  const spec = useMemo(() => specFor(product, sel, view), [product, sel, view]);
  const delivery = fulfillmentOptions(product)[0];

  const canAdd = (a: Addon) => {
    if (!MODULE_ADDONS.has(a.id)) return true;
    const next = { ...sel };
    if (a.kind === "qty") next[a.id] = Number(sel[a.id] ?? 0) + 1;
    else next[a.id] = a.choices?.find((c) => c.id !== a.default)?.id ?? "";
    return !Object.keys(layoutShed(product, next).overflow).length;
  };

  const set = (id: string, v: number | string) => setSel((s) => ({ ...s, [id]: v }));
  const shareUrl = () => {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/configurator\/?$/, `/product/${product.slug}/`);
    url.search = "";
    url.hash = `c=${encodeSelections(sel)}`;
    return url.toString();
  };

  const onAdd = () => {
    add(product.slug, sel, defaultFulfillment(product));
    setAdded(true);
  };
  const onShare = async () => {
    const url = shareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
      {/* viewer */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-[4/3.4] overflow-hidden rounded-3xl bg-[#eef1ee] ring-1 ring-line sm:aspect-[4/3]">
          <ShedViewer spec={spec} showDims={showDims} />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <span className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold shadow-soft backdrop-blur">
              {product.sizeLabel} מ' · {product.areaM2} מ"ר
            </span>
            <span className="flex items-center gap-1 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <Icon name="rotate" className="size-3.5" /> גררו לסיבוב
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-3">
            {[
              { on: view.doorOpen, label: view.doorOpen ? "סגירת דלת" : "פתיחת דלת", click: () => setView((v) => ({ ...v, doorOpen: !v.doorOpen })) },
              { on: view.interior, label: view.interior ? "החזרת הגג" : "מבט פנימה", click: () => setView((v) => ({ ...v, interior: !v.interior })) },
              { on: showDims, label: "מידות", click: () => setShowDims((d) => !d) },
            ].map((b) => (
              <button key={b.label} type="button" onClick={b.click} aria-pressed={b.on} className={`rounded-full px-3.5 py-2 text-sm font-bold shadow-soft backdrop-blur transition ${b.on ? "bg-ink text-white" : "bg-white/90 text-ink"}`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-ink-soft">ההדמיה להמחשה בלבד. מיקום הדלתות והחלונות נקבע סופית איתכם, גם ביום ההתקנה.</p>
      </div>

      {/* options */}
      <div className="space-y-6 pb-28 lg:pb-0">
        {sizes && (
          <div>
            <h3 className="mb-3 text-lg font-extrabold">1. בחרו מידה</h3>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {sizes.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => router.replace(`/configurator/?size=${s.slug}`, { scroll: false })}
                  aria-pressed={s.slug === product.slug}
                  className={`shrink-0 rounded-2xl border px-3.5 py-2 text-center transition ${s.slug === product.slug ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink/40"}`}
                >
                  <span className="block font-extrabold" dir="ltr">{s.sizeLabel}</span>
                  <span className={`block text-xs ${s.slug === product.slug ? "text-white/70" : "text-ink-soft"}`}>{formatILS(s.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {groups.map(([group, list], gi) => (
          <section key={group}>
            <h3 className="mb-3 text-lg font-extrabold">
              {sizes ? `${gi + 2}. ` : ""}
              {group}
            </h3>
            <div className="grid gap-2.5">
              {list.map((a) => (
                <AddonRow key={a.id} addon={a} value={sel[a.id]} onChange={(v) => set(a.id, v)} canAdd={canAdd(a)} />
              ))}
            </div>
          </section>
        ))}

        {/* summary */}
        <div className="card overflow-hidden">
          <div className="space-y-2 p-5">
            <h3 className="text-lg font-extrabold">סיכום המחסן שלכם</h3>
            <ul className="space-y-1.5 text-[15px]">
              {q.lines.map((l) => (
                <li key={l.id} className="flex justify-between gap-4">
                  <span className="text-ink-soft">
                    {l.label}
                    {l.qty > 1 ? ` ×${l.qty}` : ""}
                  </span>
                  <span className="shrink-0 font-semibold">{l.total === null ? "בתיאום" : l.total === 0 ? "—" : formatILS(l.total)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-end justify-between border-t border-line pt-3">
              <span className="font-bold">סה"כ</span>
              <span className="text-3xl font-black tracking-tight"><AnimatedPrice value={q.total} /></span>
            </div>
            <p className="text-sm text-ink-soft">
              {delivery.price === null ? "הובלה והתקנה: מחיר בתיאום" : delivery.price === 0 ? "כולל הובלה והרכבה" : `${delivery.label}: ${formatILS(delivery.price)} – בוחרים בסל`}
              {" · "}עד {site.maxPayments} תשלומים
            </p>
            {q.onRequest.length > 0 && <p className="text-sm font-semibold text-brand-dark">* {q.onRequest.length} תוספות במחיר בתיאום – נציג יחזור אליכם</p>}
          </div>
          <div className="grid gap-2 border-t border-line bg-sand/60 p-4 sm:grid-cols-2">
            <button type="button" onClick={onAdd} className="btn-primary w-full sm:col-span-2">
              <Icon name="cart" /> הוספה לסל
            </button>
            <a
              href={waLink(configMessage(product, q))}
              onClick={(e) => (e.currentTarget.href = waLink(configMessage(product, q, shareUrl())))}
              target="_blank"
              rel="noopener"
              className="btn-wa w-full"
            >
              <Icon name="whatsapp" /> שליחת התצורה בוואטסאפ
            </a>
            <button type="button" onClick={onShare} className="btn-ghost w-full">
              <Icon name="share" /> {copied ? "הקישור הועתק!" : "שיתוף התצורה"}
            </button>
          </div>
        </div>
      </div>

      {/* mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-ink-soft">{product.name}</p>
            <p className="text-xl font-black leading-tight"><AnimatedPrice value={q.total} /></p>
          </div>
          <a
            href={waLink(configMessage(product, q))}
            onClick={(e) => (e.currentTarget.href = waLink(configMessage(product, q, shareUrl())))}
            target="_blank"
            rel="noopener"
            aria-label="שליחה בוואטסאפ" className="grid size-12 shrink-0 place-items-center rounded-full bg-wa text-white">
            <Icon name="whatsapp" className="size-6" />
          </a>
          <button type="button" onClick={onAdd} className="btn-primary h-12 shrink-0 px-6">הוספה לסל</button>
        </div>
      </div>

      <AnimatePresence>
        {added && (
          <motion.div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 p-3 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAdded(false)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="נוסף לסל"
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-brand text-white"><Icon name="check" className="size-6" /></span>
                <div>
                  <p className="text-lg font-extrabold">המחסן נוסף לסל!</p>
                  <p className="text-ink-soft">{product.name} · {formatILS(q.total)}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link href="/cart/" className="btn-primary">למעבר לסל</Link>
                <button type="button" className="btn-ghost" onClick={() => setAdded(false)}>המשך בעיצוב</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
