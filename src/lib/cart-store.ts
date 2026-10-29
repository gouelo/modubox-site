"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, FulfillmentId, Selections } from "./types";

interface CartState {
  items: CartItem[];
  /** bumps when something is added, so the header can animate */
  lastAdded: number;
  add: (slug: string, selections: Selections, fulfillment: FulfillmentId) => void;
  update: (id: string, patch: Partial<Omit<CartItem, "id">>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      lastAdded: 0,
      add: (slug, selections, fulfillment) =>
        set((s) => ({
          items: [...s.items, { id: Math.random().toString(36).slice(2, 10), slug, qty: 1, selections, fulfillment }],
          lastAdded: Date.now(),
        })),
      update: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "modubox-cart",
      version: 2,
      partialize: (s) => ({ items: s.items }),
      // v1 carts carried add-ons from the old 3D configurator; v2 sells the base product only
      migrate: (state) => {
        const s = state as { items?: CartItem[] };
        return { items: (s.items ?? []).map((i) => ({ ...i, selections: {} })) } as CartState;
      },
    },
  ),
);
