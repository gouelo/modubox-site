import { giftRules } from "@/lib/promo-gifts";

// The promotion's gifts depend on today's date; the tests price without them
// unless they turn them on (tests/promo-gifts.test.ts).
giftRules.enabled = false;
