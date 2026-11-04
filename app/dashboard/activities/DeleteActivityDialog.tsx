"use client";

import { useEffect, useRef, useState } from "react";

export default function DeleteActivityDialog({ activity, onCancel, onDeleted }: {
  activity: { id: string | number; title: string };
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function deleteActivity() {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/proxy/activities/${encodeURIComponent(activity.id)}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) throw new Error("Gagal menghapus aktivitas. Silakan coba lagi.");
      onDeleted();
    } catch {
      setError("Gagal menghapus aktivitas. Silakan coba lagi.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <dialog ref={dialog} className="modal activity-delete-dialog" aria-labelledby="delete-activity-title" aria-describedby="delete-activity-description" onCancel={(event) => {
      event.preventDefault();
      if (!deleting) onCancel();
    }}>
      <div className="modal-header">
        <h2 id="delete-activity-title">Konfirmasi penghapusan</h2>
        <button type="button" className="modal-close" aria-label="Tutup" disabled={deleting} onClick={onCancel}>×</button>
      </div>
      <p id="delete-activity-description">
        Aktivitas “{activity.title}” akan dihapus dari laporan kegiatan. Foto dan tag yang terkait juga akan dihapus dari sistem.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="button-secondary" autoFocus disabled={deleting} onClick={onCancel}>Batal</button>
        <button type="button" className="button-primary danger-button" disabled={deleting} onClick={deleteActivity}>{deleting ? "Menghapus..." : "Hapus Aktivitas"}</button>
      </div>
    </dialog>
  );
}
