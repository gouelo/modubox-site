import { headers } from "next/headers";

/** The site's address as this request reached it (https://modubox-site.vercel.app, later the real domain), for links sent to customers. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
