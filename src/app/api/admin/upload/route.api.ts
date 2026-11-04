import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { can } from "@/lib/admin/auth";
import { getSession } from "@/lib/admin/session";
import { uploadsEnabled } from "@/lib/admin/uploads";

/**
 * Image uploads from the content module, straight from the browser to Vercel
 * Blob: this route only hands out a short-lived upload token, to a signed-in
 * admin (the proxy checks too). Needs a Blob store connected to the project.
 */
export async function POST(req: Request) {
  if (!can(await getSession(), "content")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!uploadsEnabled()) return NextResponse.json({ error: "no blob store" }, { status: 503 });
  try {
    const body = (await req.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("site/")) throw new Error("bad path");
        return { allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"], maximumSizeInBytes: 15 * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upload failed" }, { status: 400 });
  }
}
