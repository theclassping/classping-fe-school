"use client";

import { useEffect, useRef } from "react";

/** Asked when staff leave Tambah Aktivitas with unsaved input: keep the work as a draft, drop it, or stay. */
export default function LeaveDraftDialog({ saving, onSaveDraft, onDiscard, onStay }: {
  saving: boolean;
  onSaveDraft: () => void;
  onDiscard: () => void;
  onStay: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} className="modal activity-leave-dialog" aria-labelledby="leave-draft-title" aria-describedby="leave-draft-description" onCancel={(event) => {
      event.preventDefault();
      if (!saving) onStay();
    }}>
      <div className="modal-header">
        <h2 id="leave-draft-title">Simpan sebagai draft?</h2>
        <button type="button" className="modal-close" aria-label="Tutup" disabled={saving} onClick={onStay}>×</button>
      </div>
      <p id="leave-draft-description">
        Aktivitas ini belum disimpan. Simpan sebagai draft agar dapat dilanjutkan nanti, atau keluar tanpa menyimpan.
      </p>
      <div className="modal-actions">
        <button type="button" className="button-secondary" disabled={saving} onClick={onDiscard}>Keluar tanpa menyimpan</button>
        <button type="button" className="button-secondary" autoFocus disabled={saving} onClick={onStay}>Lanjutkan mengisi</button>
        <button type="button" className="button-primary" disabled={saving} onClick={onSaveDraft}>{saving ? "Menyimpan..." : "Simpan sebagai draft"}</button>
      </div>
    </dialog>
  );
}
