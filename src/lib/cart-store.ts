"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartDesign, CartItem, FulfillmentId, Selections } from "./types";

interface CartState {
  items: CartItem[];
  /** bumps when something is added, so the header can animate */
  lastAdded: number;
  /** a coupon code the server accepted (checked again at payment) */
  coupon: string | undefined;
  setCoupon: (code?: string) => void;
  add: (slug: string, selections: Selections, fulfillment: FulfillmentId, design?: CartDesign) => void;
  update: (id: string, patch: Partial<Omit<CartItem, "id">>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      lastAdded: 0,
      coupon: undefined,
      add: (slug, selections, fulfillment, design) =>
        set((s) => ({
          items: [...s.items, { id: Math.random().toString(36).slice(2, 10), slug, qty: 1, selections, fulfillment, ...(design ? { design } : {}) }],
          lastAdded: Date.now(),
        })),
      update: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [], coupon: undefined }),
      setCoupon: (coupon) => set({ coupon }),
    }),
    {
      name: "modubox-cart",
      version: 3,
      partialize: (s) => ({ items: s.items, coupon: s.coupon }),
      // v1 carts carried selections from the old 3D configurator, which no longer
      // match; v2 carts had no add-ons; v3 carries the add-ons builder's choices
      migrate: (state, version) => {
        const s = state as { items?: CartItem[] };
        const items = s.items ?? [];
        return { items: version < 2 ? items.map((i) => ({ ...i, selections: {} })) : items } as CartState;
      },
    },
  ),
);
