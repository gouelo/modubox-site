// Encodes a configuration into the URL (#c=...) so it can be shared or edited later.
import type { Selections } from "./types";

export function encodeSelections(s: Selections): string {
  const json = JSON.stringify(s);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSelections(code: string): Selections | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    const out: Selections = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.max(0, Math.min(20, Math.round(v)));
      else if (typeof v === "string" && v.length < 40) out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}
