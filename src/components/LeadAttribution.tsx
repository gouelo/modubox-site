"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Keeps the visit's UTM tags and ad click ids for the lead forms (src/lib/attribution.ts). */
export function LeadAttribution() {
  const path = usePathname();
  useEffect(() => captureAttribution(), [path]);
  return null;
}
