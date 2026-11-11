"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a native <dialog> in sync with React state: shown as a modal while
 * `open` is true, closed otherwise. Attach the returned ref to the <dialog>.
 */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return ref;
}
