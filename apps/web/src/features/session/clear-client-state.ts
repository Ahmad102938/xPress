/**
 * Removes everything this site keeps on the device for a signed-in person (docs/specs/signed-in-home.md
 * item 31): every localStorage and sessionStorage key with the `acx:` prefix (recent searches,
 * recently viewed doctors, re-verify resume). The delivery location (`acx_location`) is device-wide,
 * not personal to an account, and stays. Then tells other tabs.
 */

export const STORAGE_PREFIX = "acx:";
export const AUTH_CHANNEL = "acx-auth";

function clear(storage: Storage | undefined) {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // Storage blocked (private mode): nothing to clear.
  }
}

export function broadcastSignedOut() {
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage("signed_out");
    channel.close();
  } catch {
    // BroadcastChannel unavailable: other tabs re-check on their next request.
  }
}

export function clearClientState() {
  clear(typeof localStorage === "undefined" ? undefined : localStorage);
  clear(typeof sessionStorage === "undefined" ? undefined : sessionStorage);
  broadcastSignedOut();
}
