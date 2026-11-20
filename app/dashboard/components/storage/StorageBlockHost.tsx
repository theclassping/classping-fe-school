"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCurrentBranch } from "../../profile/branchApi";
import {
  announceStorageRestored, STORAGE_BLOCK_EVENT, STORAGE_DIALOG_OPEN_EVENT,
  type StorageBlock, type StorageBlockEventDetail,
} from "@/lib/storageLimit";
import StorageFullDialog, { type StorageViewer } from "./StorageFullDialog";

type Viewer = { viewer: StorageViewer; branchId: number | null };

type OpenState = { block: StorageBlock | null; failedFiles: string[] };

async function loadViewer(): Promise<Viewer> {
  let viewer: StorageViewer = "teacher";
  try {
    const response = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
    const { user } = (await response.json()) as { user?: { role?: string } | null };
    // Only teachers get the "contact your admin" version; staff and admins manage storage.
    viewer = String(user?.role ?? "").toUpperCase() === "TEACHER" ? "teacher" : "staff";
  } catch {
    viewer = "teacher";
  }
  if (viewer === "teacher") return { viewer, branchId: null };
  try {
    return { viewer, branchId: (await loadCurrentBranch()).id };
  } catch {
    return { viewer, branchId: null };
  }
}

/**
 * Mounted once in the dashboard chrome. Opens the storage dialog when any
 * upload flow reports a storage refusal (lib/storageLimit), and collects the
 * names of files refused while it is open.
 */
export default function StorageBlockHost() {
  const [open, setOpen] = useState<OpenState | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    let loading = false;
    const ensureViewer = () => {
      if (loading) return;
      loading = true;
      void loadViewer().then(setViewer);
    };
    const onBlocked = (event: Event) => {
      const { block, fileName } = (event as CustomEvent<StorageBlockEventDetail>).detail;
      ensureViewer();
      setOpen(current => ({
        // A subscription lock outranks "full"; otherwise keep the latest numbers.
        block: current?.block?.kind === "subscription_locked" ? current.block : block,
        failedFiles: fileName && !current?.failedFiles.includes(fileName) ? [...(current?.failedFiles ?? []), fileName] : current?.failedFiles ?? [],
      }));
    };
    const onOpen = () => {
      ensureViewer();
      setOpen(current => current ?? { block: null, failedFiles: [] });
    };
    window.addEventListener(STORAGE_BLOCK_EVENT, onBlocked);
    window.addEventListener(STORAGE_DIALOG_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(STORAGE_BLOCK_EVENT, onBlocked);
      window.removeEventListener(STORAGE_DIALOG_OPEN_EVENT, onOpen);
    };
  }, []);

  const close = useCallback(() => setOpen(null), []);
  const restored = useCallback(() => announceStorageRestored(), []);

  if (!open || !viewer) return null;
  return (
    <StorageFullDialog
      viewer={viewer.viewer}
      branchId={viewer.branchId}
      block={open.block}
      failedFiles={open.failedFiles}
      onClose={close}
      onCapacityRestored={restored}
    />
  );
}
