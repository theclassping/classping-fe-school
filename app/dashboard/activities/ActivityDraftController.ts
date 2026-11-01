import { canSync, reportIssues, reportPayload, type ReportDraft, type ReportRecord } from "./activityEditorState";
import { writeDraft, removeDraft, type PendingSave } from "./activityDraftStore";
export class ReportError extends Error { constructor(message: string, public status = 0) { super(message); } }
export async function reportRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body?.detail === "string" ? body.detail : body ? Object.values(body).flat().join(" ") : "Penyimpanan belum berhasil. Silakan coba lagi.";
    throw new ReportError(response.status === 401 ? "Sesi berakhir. Masuk kembali untuk menyinkronkan draft; perubahan di perangkat tetap tersimpan." : message, response.status);
  }
  return body as T;
}
export class ActivityDraftController {
  draft: ReportDraft;
  pending?: PendingSave;
  localPending = 0;
  localFailed = false;
  error = "";
  conflict = false;
  saving = false;
  private disposed = false;
  private localQueue: Promise<unknown> = Promise.resolve();
  private active?: Promise<void>;
  private idle?: ReturnType<typeof setTimeout>;
  private deadline?: ReturnType<typeof setTimeout>;
  private uploading = new Set<string>();
  private uploadAbort = new AbortController();
  constructor(public key: string, draft: ReportDraft, private changed: () => void, pending?: PendingSave) { this.draft = draft; this.pending = pending; }
  private emit() { if (!this.disposed) this.changed(); }
  change(update: (draft: ReportDraft) => ReportDraft, urgent = false, content = true) {
    if (this.disposed) return;
    this.draft = { ...update(this.draft), version: this.draft.version + (content ? 1 : 0), updatedAt: Date.now() };
    this.persist(); this.emit();
    if (content) this.schedule(urgent);
    this.uploadPhotos();
  }
  persist() {
    const entry = structuredClone({ key: this.key, draft: this.draft, pending: this.pending });
    this.localPending++;
    this.localQueue = this.localQueue.catch(() => {}).then(() => writeDraft(entry)).then(() => { this.localFailed = false; }).catch(() => {
      this.localFailed = true;
    }).finally(() => { this.localPending--; this.emit(); });
    return this.localQueue;
  }
  async flushLocal() { await this.persist(); if (this.localFailed) throw new Error("Draft belum tersimpan di perangkat. Jangan tutup halaman ini."); }
  private clearTimers() { clearTimeout(this.idle); clearTimeout(this.deadline); this.idle = this.deadline = undefined; }
  schedule(immediate = false) {
    if (this.disposed || this.conflict || this.draft.published) return;
    clearTimeout(this.idle);
    if (immediate) { this.clearTimers(); void this.sync().catch(() => {}); return; }
    this.idle = setTimeout(() => { this.clearTimers(); void this.sync().catch(() => {}); }, 1000);
    if (!this.deadline) this.deadline = setTimeout(() => { this.clearTimers(); void this.sync().catch(() => {}); }, 5000);
  }
  start() { this.uploadPhotos(); if (this.pending || this.draft.version !== this.draft.syncedVersion) this.schedule(true); }
  private async sendPending() {
    const pending = this.pending!;
    const result = await reportRequest<ReportRecord>(pending.url, { method: pending.method, headers: { "Content-Type": "application/json" }, body: pending.body });
    // Leave the persisted request replayable if this view closed during the write.
    if (this.disposed) return;
    const sent = JSON.parse(pending.body).activity_images as { id?: number; client_id?: string; _destroy?: boolean }[];
    const removed = this.draft.removedPhotoIds.filter(id => !sent.some(photo => photo.id === id && photo._destroy));
    // A new photo may have been removed locally while its initial save was in flight.
    for (const photo of result.activity_images) {
      const included = sent.some(item => !item._destroy && (item.id === photo.id || (!!item.client_id && item.client_id === photo.client_id)));
      const retained = this.draft.photos.some(item => item.id === photo.id || (!!photo.client_id && item.key === photo.client_id));
      if (included && !retained) removed.push(photo.id);
    }
    this.draft = { ...this.draft, activityId: result.id, revision: result.revision, workflowVersion: result.workflow_version,
      syncedVersion: pending.version, published: result.is_publish,
      photos: this.draft.photos.map(p => {
        const saved = result.activity_images.find(item => (p.id && p.id === item.id) || item.client_id === p.key);
        if (!saved) return p;
        const keepPreview = !!p.url && (!!p.file || Date.now() - (p.urlRefreshedAt || 0) < 3000000);
        return { ...p, id: saved.id, imageData: saved.image_data, url: keepPreview ? p.url : saved.image_url || p.url,
          urlRefreshedAt: keepPreview ? p.urlRefreshedAt : Date.now() };
      }),
      // Only acknowledge removals actually included in this write.
      removedPhotoIds: [...new Set(removed)],
    };
    this.pending = undefined;
    this.error = "";
    await this.persist(); this.emit();
  }
  async sync(publish = false): Promise<void> {
    this.clearTimers();
    if (this.active) { await this.active; return this.sync(publish); }
    if (this.draft.published && !publish) { await this.flushLocal(); return; }
    if (this.conflict) throw new ReportError("Muat ulang versi server sebelum menyimpan.", 409);
    if (!navigator.onLine) { await this.flushLocal(); if (publish) throw new ReportError("Hubungkan internet sebelum mempublikasikan."); return; }
    if (!canSync(this.draft) && !this.pending) { await this.flushLocal(); if (publish) throw new ReportError(reportIssues(this.draft).join(" ")); return; }
    this.saving = true; this.emit();
    const run = async () => {
      if (this.pending) await this.sendPending();
      if (this.disposed) return;
      if (!canSync(this.draft)) return;
      const issues = publish ? reportIssues(this.draft) : [];
      if (issues.length) throw new ReportError(issues.join(" "));
      if (this.draft.version === this.draft.syncedVersion && !publish) return;
      const snapshot = this.draft;
      this.pending = { url: snapshot.activityId ? `/api/proxy/activities/${snapshot.activityId}/` : "/api/proxy/activities/", method: snapshot.activityId ? "PATCH" : "POST",
        body: JSON.stringify(reportPayload(snapshot, publish, crypto.randomUUID())), version: snapshot.version };
      // Persist the exact request before sending, so an ambiguous success can be replayed safely.
      await this.flushLocal();
      if (this.disposed) return;
      await this.sendPending();
    };
    const task = run().catch(error => {
      if (this.disposed) throw error;
      this.error = error instanceof Error ? error.message : "Draft belum tersinkronisasi.";
      if (error instanceof ReportError && error.status === 409) this.conflict = true;
      // Validation failures did not commit. Network errors retain the exact request for replay.
      if (error instanceof ReportError && error.status >= 400 && error.status < 500 && error.status !== 409) this.pending = undefined;
      void this.persist();
      throw error;
    }).finally(() => {
      this.saving = false; this.active = undefined; this.emit();
      if (!this.error && !this.disposed && this.draft.version !== this.draft.syncedVersion && !this.draft.published) this.schedule();
    });
    this.active = task;
    return task;
  }
  uploadPhotos() {
    if (this.disposed || !navigator.onLine) return;
    for (const photo of this.draft.photos) {
      if (this.uploading.size >= 2) break;
      if (!photo.file || photo.upload !== "pending" || this.uploading.has(photo.key)) continue;
      this.uploading.add(photo.key);
      const key = photo.key;
      const patch = (values: Partial<typeof photo>, content = false) => this.change(d => ({ ...d, photos: d.photos.map(p => p.key === key ? { ...p, ...values } : p) }), content, content);
      patch({ upload: "uploading", error: undefined });
      void (async () => {
        let fileKey = photo.uploadKey, uploadUrl = photo.uploadUrl;
        if (!fileKey || !uploadUrl || !photo.uploadExpires || photo.uploadExpires < Date.now()) {
          const result = await reportRequest<{ file_key: string; presigned_url: string }>("/api/proxy/media/presign/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: photo.file!.name, content_type: photo.file!.type, expires_in: 3600, purpose: "activity" }), signal: this.uploadAbort.signal });
          fileKey = result.file_key; uploadUrl = result.presigned_url;
          patch({ uploadKey: fileKey, uploadUrl, uploadExpires: Date.now() + 3500000 });
          await this.flushLocal();
        }
        const response = await fetch(uploadUrl!, { method: "PUT", headers: { "Content-Type": photo.file!.type || "application/octet-stream" }, body: photo.file, signal: this.uploadAbort.signal });
        if (!response.ok) throw new Error("Unggahan gagal. Ketuk Coba lagi.");
        patch({ upload: "complete", uploadKey: fileKey, uploadUrl: undefined, error: undefined }, true);
      })().catch(error => {
        patch({ upload: "error", error: error instanceof Error ? error.message : "Unggahan belum berhasil." });
      }).finally(() => { this.uploading.delete(key); this.uploadPhotos(); });
    }
  }
  async finish() { await this.localQueue; await removeDraft(this.key); }
  dispose() { this.disposed = true; this.clearTimers(); this.uploadAbort.abort(); }
}
