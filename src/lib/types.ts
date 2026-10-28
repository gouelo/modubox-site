export type Category = "modubox" | "gilboa" | "special";

export interface Size3 {
  width: number;
  depth: number;
  heightMin: number;
  heightMax: number;
}

export interface Fulfillment {
  /** Self pickup price (0 = free). null = not offered. */
  pickup: number | null;
  pickupNote?: string;
  /** Delivery only. null = not offered / unknown. */
  delivery: number | null;
  deliveryNote?: string;
  /** Installation only (on top of delivery). null = not offered / unknown. */
  installation: number | null;
  /** Delivery + installation together. 0 = included in the price. */
  deliveryAndInstallation: number | null;
  /** Paid to the installers on the day, not online. */
  payToInstaller?: boolean;
  note?: string | null;
}

export interface Product {
  slug: string;
  category: Category;
  name: string;
  sizeLabel: string;
  widthM: number;
  depthM: number;
  areaM2: number;
  price: number;
  badge: string | null;
  shortDescription: string;
  dimensions: {
    base?: Size3 | null;
    outer?: Size3 | null;
    inner?: string | null;
    doorWidth?: number;
    doorOpening?: number;
    wallHeight?: number;
    approximate?: boolean;
  } | null;
  fulfillment: Fulfillment;
  warrantyYears: number;
  configurable: boolean;
  addons: string[];
  addonPriceOverrides: Record<string, number>;
  images: string[];
  oldUrl?: string | null;
  todo?: string;
}

export interface AddonChoice {
  id: string;
  label: string;
  price: number | null;
  swatch?: string;
}

export interface Addon {
  id: string;
  name: string;
  group: string;
  kind: "toggle" | "qty" | "choice";
  price?: number | null;
  maxQty?: number;
  choices?: AddonChoice[];
  default?: string;
  image?: string;
  description?: string;
  note?: string;
  minWidthM?: number;
}

/** toggle → 0/1, qty → count, choice → choice id */
export type Selections = Record<string, number | string>;

export type FulfillmentId = "pickup" | "delivery" | "installation" | "deliveryAndInstallation";

export interface CartItem {
  id: string;
  slug: string;
  qty: number;
  selections: Selections;
  fulfillment: FulfillmentId;
}
