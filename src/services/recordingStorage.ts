/** IndexedDB storage for optional saved video recordings. Only used when the user explicitly opts in. */
const DB = 'prt-prep-recordings'; const STORE = 'blobs';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function saveRecording(key: string, blob: Blob): Promise<void> {
  const db = await open();
  await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(blob, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function getRecording(key: string): Promise<Blob | null> {
  const db = await open();
  return new Promise((res, rej) => { const req = db.transaction(STORE).objectStore(STORE).get(key); req.onsuccess = () => res((req.result as Blob) ?? null); req.onerror = () => rej(req.error); });
}
export async function deleteRecording(key: string): Promise<void> {
  const db = await open();
  await new Promise<void>((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function listRecordingKeys(): Promise<string[]> {
  const db = await open();
  return new Promise((res, rej) => { const req = db.transaction(STORE).objectStore(STORE).getAllKeys(); req.onsuccess = () => res(req.result as string[]); req.onerror = () => rej(req.error); });
}
