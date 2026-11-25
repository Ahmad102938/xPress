/**
 * Signed URLs for private files (docs/specs/signed-in-home.md item 17, hard rule 9). No bucket
 * exists yet; this helper is ready for the records module. It always uses the caller's own
 * session client, so storage RLS decides access, and the link lives for 60 seconds only.
 * Server-only. Public buckets are never listed here.
 */

/** Private buckets that may be signed. Empty until a module adds one in its own migration. */
export const PRIVATE_BUCKETS: readonly string[] = [];

export const SIGNED_URL_TTL_SECONDS = 60;

/** `<owner uuid>/<file uuid>.<ext>` (docs/SUPABASE.md §11). */
const PRIVATE_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/;

interface StorageClientLike {
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
      ): Promise<{ data: { signedUrl: string } | null; error: unknown }>;
    };
  };
}

export async function createSignedFileUrl(
  client: StorageClientLike,
  bucket: string,
  path: string,
  allowedBuckets: readonly string[] = PRIVATE_BUCKETS,
): Promise<string | null> {
  if (typeof window !== "undefined") {
    throw new Error("createSignedFileUrl is server-only.");
  }
  if (!allowedBuckets.includes(bucket)) throw new Error("Bucket is not a known private bucket.");
  if (!PRIVATE_PATH.test(path)) throw new Error("Path must be <owner uuid>/<uuid>.<ext>.");
  try {
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
