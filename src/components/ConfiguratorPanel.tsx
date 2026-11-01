"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-store";
import {
  CONFIGURATOR_ORIGIN,
  MESSAGE_ADD,
  MESSAGE_DESIGN,
  MESSAGE_HELLO,
  designLink,
  designToCartItem,
  fallbackCartItem,
  parseDesign,
  productForModel,
  readMessage,
  sellableModels,
  type ConfiguratorCartItem,
  type ConfiguratorMessage,
} from "@/lib/configurator";
import { formatILS } from "@/lib/format";
import { defaultFulfillment, quote } from "@/lib/pricing";
import { Icon } from "./Icon";

const ease = [0.16, 1, 0.3, 1] as const;

const totalOf = (c: ConfiguratorCartItem) => quote(c.product, c.selections, c.design.extras).total;

/**
 * The 3D configurator in a side panel over the page (full screen on phones),
 * with our own "add to cart" in its bar. Any link to the configurator opens
 * it here (Design3DButton is one); Back, Esc and ✕ close it. The configurator
 * tells us its design by postMessage (src/lib/configurator.ts,
 * docs/configurator-cart.md); until it does, "add to cart" asks for the size
 * and colour and adds the base product with a link to the configurator.
 */
export function ConfiguratorPanel() {
  const [url, setUrl] = useState<string | null>(null);
  const [live, setLive] = useState<ConfiguratorMessage | null>(null);
  const [sheet, setSheet] = useState(false);
  const [pick, setPick] = useState<{ model: string; frame: "dark" | "light" }>({ model: "4x3", frame: "dark" });
  const [toast, setToast] = useState<{ name: string; at: number } | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const pushed = useRef(false);
  const add = useCart((s) => s.add);

  const open = useCallback((href: string) => {
    const start = parseDesign(href);
    setUrl(href);
    setLive(null);
    setSheet(false);
    setPick({ model: productForModel(start.model) ? start.model : "4x3", frame: start.frame });
    try {
      history.pushState({ configurator: 1 }, "");
      pushed.current = true;
    } catch {
      pushed.current = false;
    }
  }, []);

  const close = useCallback((fromBack = false) => {
    setUrl(null);
    setSheet(false);
    if (pushed.current && !fromBack) history.back();
    pushed.current = false;
  }, []);

  const addItem = useCallback(
    (item: ConfiguratorCartItem | null) => {
      if (!item) return;
      add(item.product.slug, item.selections, defaultFulfillment(item.product), item.design);
      setToast({ name: item.product.name, at: Date.now() });
      close();
    },
    [add, close],
  );

  // links to the configurator open here (the capture phase, before the link's own new tab)
  useEffect(() => {
    if (!CONFIGURATOR_ORIGIN) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("data-new-tab")) return;
      try {
        if (new URL(a.href).origin !== CONFIGURATOR_ORIGIN) return;
      } catch {
        return;
      }
      e.preventDefault();
      open(a.href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [open]);

  // the configurator's design, from its own window and origin only
  useEffect(() => {
    if (!url) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const msg = readMessage(e.origin, e.data);
      if (!msg) return;
      if (msg.kind === "add") addItem(designToCartItem(msg.design, msg.link));
      else setLive(msg);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onPop = () => close(true);
    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    const root = document.documentElement;
    const was = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      root.style.overflow = was;
    };
  }, [url, addItem, close]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // tell the configurator it sits on a site with a cart, and what we listen for
  const hello = () =>
    frame.current?.contentWindow?.postMessage({ type: MESSAGE_HELLO, version: 1, accepts: [MESSAGE_DESIGN, MESSAGE_ADD] }, CONFIGURATOR_ORIGIN);

  const exact = live ? designToCartItem(live.design, live.link) : null;
  const fallback = fallbackCartItem(pick.model, pick.frame, designLink(`m=${pick.model}&f=${pick.frame === "dark" ? "d" : "l"}`));
  const onAdd = () => (exact ? addItem(exact) : setSheet(true));

  return (
    <>
      <AnimatePresence>
        {url && (
          <motion.div
            key="configurator"
            className="fixed inset-0 z-[70] flex justify-start bg-ink/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.target === e.currentTarget && close()}
            role="dialog"
            aria-modal="true"
            aria-label="עיצוב המחסן בתלת־ממד"
          >
            <motion.div
              className="relative flex h-dvh w-full flex-col bg-[#f1f1ee] shadow-lift md:w-[min(1180px,92vw)]"
              initial={{ x: 32 }}
              animate={{ x: 0 }}
              exit={{ x: 32 }}
              transition={{ duration: 0.3, ease }}
            >
              <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-2 sm:px-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-petrol to-brand text-white">
                  <Icon name="cube" className="size-[18px]" />
                </span>
                <b className={`min-w-0 flex-1 truncate text-[15px] font-extrabold ${exact ? "invisible sm:visible" : ""}`}>
                  <span className="sm:hidden">עיצוב בתלת־ממד</span>
                  <span className="hidden sm:inline">עצבו את המחסן בתלת־ממד</span>
                </b>
                <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onAdd} className="btn-primary h-10 shrink-0 gap-1.5 px-4 text-[14px]">
                  <Icon name="cart" className="size-4" />
                  הוספה לסל
                  {exact && <span className="font-semibold tabular-nums opacity-80">· {formatILS(totalOf(exact))}</span>}
                </motion.button>
                <a href={url} target="_blank" rel="noopener" data-new-tab className="hidden h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-sand md:flex">
                  פתיחה בחלון נפרד
                </a>
                <button type="button" onClick={() => close()} aria-label="סגירה" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-sand">
                  <Icon name="close" className="size-5" />
                </button>
              </div>
              <iframe
                ref={frame}
                src={url}
                title="קונפיגורטור תלת־ממד"
                onLoad={hello}
                allow="xr-spatial-tracking; camera; gyroscope; accelerometer; fullscreen; clipboard-write; web-share"
                className="block w-full flex-1 border-0 bg-[#f1f1ee]"
              />

              <AnimatePresence>
                {sheet && !exact && fallback && (
                  <motion.div key="sheet" className="absolute inset-0 top-14 flex items-end bg-ink/40 sm:items-center sm:justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && setSheet(false)}>
                    <motion.div
                      className="max-h-full w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lift sm:max-w-lg sm:rounded-[1.75rem]"
                      initial={{ y: 40 }}
                      animate={{ y: 0 }}
                      exit={{ y: 40 }}
                      transition={{ duration: 0.3, ease }}
                    >
                      <p className="text-xl font-extrabold tracking-tight">מה נכניס לסל?</p>
                      <p className="mt-1 text-[14px] leading-6 text-ink-soft">אשרו את המידה ואת צבע הפרופילים של המחסן שעיצבתם. את הדלתות, החלונות והתוספות נעבור איתכם בשיחה קצרה לפני ההזמנה.</p>
                      <p className="mt-4 text-sm font-bold">מידה (מטר)</p>
                      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {sellableModels().map(({ model }) => (
                          <button
                            key={model}
                            type="button"
                            onClick={() => setPick((p) => ({ ...p, model }))}
                            aria-pressed={pick.model === model}
                            className={`h-11 rounded-xl border text-[15px] font-bold tabular-nums transition ${pick.model === model ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40"}`}
                          >
                            <span dir="ltr">{model.replace("x", "×")}</span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-4 text-sm font-bold">צבע הפרופילים</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {(["light", "dark"] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setPick((p) => ({ ...p, frame: f }))}
                            aria-pressed={pick.frame === f}
                            className={`flex h-12 items-center justify-center gap-2 rounded-xl border font-bold transition ${pick.frame === f ? "border-ink bg-sand" : "border-line hover:border-ink/40"}`}
                          >
                            <span className={`size-5 rounded-full ring-1 ring-ink/15 ${f === "dark" ? "bg-[#1d1f22]" : "bg-[#f4f4f2]"}`} />
                            {f === "dark" ? "שחור" : "לבן"}
                          </button>
                        ))}
                      </div>
                      <div className="mt-5 grid gap-2">
                        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => addItem(fallback)} className="btn-primary w-full py-4 text-base">
                          <Icon name="cart" /> הוספה לסל · {formatILS(totalOf(fallback))}
                        </motion.button>
                        <button type="button" onClick={() => setSheet(false)} className="btn-ghost w-full">חזרה לעיצוב</button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.at}
            role="status"
            className="fixed inset-x-3 bottom-24 z-[65] mx-auto flex max-w-md items-center gap-3 rounded-[1.4rem] bg-ink/95 p-2 ps-3 text-white shadow-lift ring-1 ring-white/10 backdrop-blur-md lg:bottom-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease }}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand"><Icon name="check" className="size-5" /></span>
            <p className="min-w-0 flex-1 text-[14px] leading-5">
              <b className="block truncate">{toast.name}</b>
              <span className="text-white/70">העיצוב שלכם נוסף לסל</span>
            </p>
            <Link href="/cart/" onClick={() => setToast(null)} className="btn h-11 shrink-0 bg-white px-5 text-ink">לסל <Icon name="arrow" className="size-4" /></Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
