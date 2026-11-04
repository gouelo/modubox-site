/** Image uploads need a Vercel Blob store connected to the project (Storage → Blob), which sets BLOB_READ_WRITE_TOKEN. Without one, image fields take an address. */
export function uploadsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return !!env.BLOB_READ_WRITE_TOKEN?.trim();
}
