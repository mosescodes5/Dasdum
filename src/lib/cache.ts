// Tiny in-process cache for read-mostly storefront data.
//
// The storefront pages are rendered per request (the database isn't reachable
// at build time), and each visit used to run 5+ MySQL queries. On shared
// hosting that is the main reason pages feel slow. This keeps the results in
// memory for a short time, shares one in-flight query between simultaneous
// visitors, and is emptied the moment an admin saves a change — so edits in
// the admin still show up straight away.

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** How long a value is reused before the database is asked again. */
const DEFAULT_TTL_MS = 60_000;

export async function cached<T>(key: string, load: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = load()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/** Forget everything cached. Call after any write that changes what the
 * storefront shows (products, categories, images, site content, stock). */
export function clearCache(): void {
  store.clear();
  inflight.clear();
}

/** Wraps a route handler so the cache is emptied after it runs, whether it
 * succeeded or not. Use it for admin/checkout routes that write data. */
export function clearsCache<A extends unknown[], R>(handler: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    try {
      return await handler(...args);
    } finally {
      clearCache();
    }
  };
}
