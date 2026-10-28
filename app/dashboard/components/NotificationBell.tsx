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

const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell({ open, onToggle, onClose }: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
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

  // Poll the backend; also refresh when the tab becomes visible again or a save completes.
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const latest = await loadRemoteNotifications(controller.signal);
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
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const onSaved = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(notificationEvent, onSaved);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(notificationEvent, onSaved);
    };
  }, []);

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
