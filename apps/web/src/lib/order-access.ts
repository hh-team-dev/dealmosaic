/** Private order access survives blocked sessionStorage for this tab's lifetime.
 * The URL fragment is the durable fallback; it is never sent to HTTP servers.
 * Never put tokens in localStorage or analytics. */
const memory = new Map<string, string>();
export function readOrderAccess(key: string): string | null {
  try { return sessionStorage.getItem(key) || memory.get(key) || null; }
  catch { return memory.get(key) || null; }
}
export function keepOrderAccess(key: string, token: string): void {
  memory.set(key, token);
  try { sessionStorage.setItem(key, token); } catch { /* The private fragment remains usable. */ }
}
