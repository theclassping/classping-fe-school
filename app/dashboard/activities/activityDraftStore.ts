import type { ReportDraft } from "./activityEditorState";
export type PendingSave = { url: string; method: string; body: string; version: number };
export type StoredDraft = { key: string; draft: ReportDraft; pending?: PendingSave };
let database: Promise<IDBDatabase> | undefined;
const storedFiles = new Set<string>();
function db() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("classping-activity-drafts", 2);
    request.onupgradeneeded = () => {
      for (const name of ["drafts", "files"]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: "key" });
    };
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); database = undefined; storedFiles.clear(); }; resolve(request.result); };
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error("Penyimpanan draft sedang digunakan di tab lain.")); };
  });
  return database;
}
async function read<T>(store: string, key: string): Promise<T | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, "readonly");
    const request = tx.objectStore(store).get(key);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(tx.error || request.error);
  });
}
export async function readDraft(key: string): Promise<StoredDraft | undefined> {
  const entry = await read<StoredDraft>("drafts", key);
  if (!entry) return undefined;
  entry.draft.photos = await Promise.all(entry.draft.photos.map(async photo => {
    if (!photo.localFileKey) return photo;
    const saved = await read<{ key: string; file: File }>("files", photo.localFileKey);
    if (!saved?.file && !photo.id) throw new Error("Foto lokal tidak tersedia. Buka kembali draft dan unggah ulang foto tersebut.");
    if (saved) storedFiles.add(saved.key);
    return { ...photo, file: saved?.file };
  }));
  return entry;
}
export async function writeDraft(entry: StoredDraft): Promise<void> {
  const database = await db();
  const files: { key: string; file: File }[] = [];
  const snapshot: StoredDraft = { ...entry, draft: { ...entry.draft, photos: entry.draft.photos.map(photo => {
    const { file, ...metadata } = photo;
    if (!file) return metadata;
    const key = `${entry.key}:photo:${photo.key}`;
    if (!storedFiles.has(key)) files.push({ key, file });
    return { ...metadata, localFileKey: key };
  }) } };
  return new Promise((resolve, reject) => {
    const tx = database.transaction(["drafts", "files"], "readwrite");
    const fileStore = tx.objectStore("files");
    for (const file of files) fileStore.put(file);
    // Text edits only write lightweight metadata, rather than ten photo blobs per keystroke.
    tx.objectStore("drafts").put(snapshot);
    const keys = fileStore.getAllKeys();
    keys.onsuccess = () => {
      const retained = new Set(snapshot.draft.photos.map(p => p.localFileKey));
      for (const key of keys.result) if (String(key).startsWith(`${entry.key}:photo:`) && !retained.has(String(key))) fileStore.delete(key);
    };
    tx.oncomplete = () => { files.forEach(file => storedFiles.add(file.key)); resolve(); };
    tx.onerror = tx.onabort = () => { storedFiles.clear(); reject(tx.error || new Error("Draft belum tersimpan di perangkat.")); };
  });
}
export async function removeDraft(key: string): Promise<void> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(["drafts", "files"], "readwrite");
    tx.objectStore("drafts").delete(key);
    const files = tx.objectStore("files"), keys = files.getAllKeys();
    keys.onsuccess = () => { for (const fileKey of keys.result) if (String(fileKey).startsWith(`${key}:photo:`)) { files.delete(fileKey); storedFiles.delete(String(fileKey)); } };
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
