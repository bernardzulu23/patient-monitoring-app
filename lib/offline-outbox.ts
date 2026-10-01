/**
 * IndexedDB outbox for nurse mutations when the hospital LAN is briefly down.
 */
const DB_NAME = "pm-outbox";
const STORE = "mutations";
const DB_VERSION = 1;

export type OutboxMutation = {
  id: string;
  /** Rows only replay under the session of the staff member who queued them. */
  ownerId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  createdAt: number;
};

let currentOwnerId: string | null = null;

export function setOutboxOwner(userId: string | null) {
  currentOwnerId = userId;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

export async function enqueueMutation(
  input: Omit<OutboxMutation, "id" | "createdAt" | "ownerId">,
): Promise<string> {
  if (!currentOwnerId) throw new Error("No signed-in user to own offline changes");
  const db = await openDb();
  const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const row: OutboxMutation = {
    ...input,
    id,
    ownerId: currentOwnerId,
    createdAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function listMutations(): Promise<OutboxMutation[]> {
  const db = await openDb();
  const rows = await new Promise<OutboxMutation[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OutboxMutation[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows
    .filter((row) => currentOwnerId !== null && row.ownerId === currentOwnerId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeMutation(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  const rows = await listMutations();
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const res = await fetch(row.url, {
        method: row.method,
        headers: row.headers,
        body: row.body,
        credentials: "same-origin",
      });
      if (res.ok) {
        await removeMutation(row.id);
        sent += 1;
        continue;
      }
      // Drop non-retryable client errors so a bad payload cannot block the queue
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        await removeMutation(row.id);
        failed += 1;
        continue;
      }
      failed += 1;
      break;
    } catch {
      failed += 1;
      break;
    }
  }
  return { sent, failed };
}

const QUEUEABLE =
  /\/api\/patients(\/|$)|\/api\/patients\/[^/]+\/discharge/;

/**
 * fetch that queues patient admit/edit/discharge when offline.
 */
export async function offlineAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const isMutation = method !== "GET" && method !== "HEAD";
  const shouldQueue =
    isMutation && QUEUEABLE.test(new URL(url, location.origin).pathname);

  if (!shouldQueue) {
    return fetch(input, init);
  }

  try {
    const res = await fetch(input, init);
    return res;
  } catch (err) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (init?.headers) {
        const h = new Headers(init.headers);
        h.forEach((v, k) => {
          headers[k] = v;
        });
      }
      const body =
        typeof init?.body === "string"
          ? init.body
          : init?.body != null
            ? String(init.body)
            : null;
      await enqueueMutation({ url, method, headers, body });
      return new Response(
        JSON.stringify({
          queued: true,
          message: "Saved offline — will sync when back on hospital Wi‑Fi",
        }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      );
    }
    throw err;
  }
}
