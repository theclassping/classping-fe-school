"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  formatNotificationDate,
  loadRemoteNotifications,
  markRead,
  mergeNotifications,
  notificationEvent,
  pushToBrowser,
  readLocalNotifications,
  readReadIds,
  requestPushPermission,
  type SchoolNotification,
} from "@/lib/notifications";
import { pollWhileVisible } from "@/lib/pollWhileVisible";

// Every poll runs a Vercel function, so the rates are kept low. A background tab
// still polls, slowly, because desktop alerts for new items only fire there.
const VISIBLE_POLL_MS = 120_000;
const HIDDEN_POLL_MS = 600_000;

export default function NotificationBell({ open, onToggle, onClose, role }: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** Session role; `null` while it is still loading, so the first poll never flashes items the role should not see. */
  role?: string | null;
}) {
  const [remote, setRemote] = useState<SchoolNotification[]>([]);
  const [local, setLocal] = useState<SchoolNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const knownIds = useRef<Set<string> | null>(null);
  const notifications = mergeNotifications(local, remote);
  const unread = notifications.filter((item) => !readIds.includes(item.id));

  // Load locally recorded saves and the read list, then follow new saves made anywhere in this tab.
  useEffect(() => {
    const sync = () => {
      setLocal(readLocalNotifications());
      setReadIds(readReadIds());
    };
    const timer = window.setTimeout(sync, 0);
    window.addEventListener(notificationEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(notificationEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Poll the backend at a rate that follows tab visibility; also refresh when a save completes.
  useEffect(() => {
    if (role === null) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const latest = await loadRemoteNotifications(controller.signal, role);
        if (controller.signal.aborted) return;
        if (knownIds.current) {
          const fresh = latest.filter((item) => !knownIds.current?.has(item.id));
          if (fresh.length) pushToBrowser(fresh);
        }
        knownIds.current = new Set(latest.map((item) => item.id));
        setRemote(latest);
      } catch {
        // Keep the last list while the backend is unreachable.
      }
    };
    void refresh();
    const stopPolling = pollWhileVisible(() => void refresh(), { visibleMs: VISIBLE_POLL_MS, hiddenMs: HIDDEN_POLL_MS });
    const onSaved = () => void refresh();
    window.addEventListener(notificationEvent, onSaved);
    return () => {
      controller.abort();
      stopPolling();
      window.removeEventListener(notificationEvent, onSaved);
    };
  }, [role]);

  function markOneRead(id: string) {
    setReadIds((current) => markRead([id], current));
  }

  function markAllRead() {
    setReadIds((current) => markRead(notifications.map((item) => item.id), current));
  }

  const icon = (kind: SchoolNotification["kind"]) => kind === "payment" ? "Rp" : kind === "activity" ? "✦" : "✓";

  return (
    <>
      <button
        className="notification-button"
        type="button"
        aria-label={`Notifikasi${unread.length ? `, ${unread.length} belum dibaca` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => { void requestPushPermission(); onToggle(); }}
      >
        <Bell aria-hidden="true" />
        {unread.length > 0 && <i aria-hidden="true" />}
      </button>
      {open && (
        <section className="notification-menu" role="menu" aria-label="Notifikasi">
          <header>
            <div>
              <strong>Notifikasi</strong>
              <small>{unread.length ? `${unread.length} pembaruan belum dibaca` : "Semua pembaruan sudah dibaca"}</small>
            </div>
            <button type="button" onClick={markAllRead} disabled={!unread.length}>Tandai semua dibaca</button>
          </header>
          {unread.length ? unread.map((item) => (
            <Link key={item.id} href={item.href} role="menuitem" className="fresh" onClick={() => { markOneRead(item.id); onClose(); }}>
              <span aria-hidden="true">{icon(item.kind)}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.copy}</small>
                <time>{formatNotificationDate(item.occurredAt)}</time>
              </div>
              <i aria-hidden="true" />
            </Link>
          )) : <p className="notification-empty">Belum ada pembaruan baru.</p>}
        </section>
      )}
    </>
  );
}
