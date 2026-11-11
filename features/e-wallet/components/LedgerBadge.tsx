import type { BadgeTone, LedgerRow } from "../types";

const TONE_CLASS: Record<BadgeTone, string> = {
  pending: "status-pending",
  available: "status-pill",
  muted: "status-badge muted",
};

/** Status badge of a ledger entry (Mengambang, Tersedia, Penarikan, …). */
export default function LedgerBadge({ badge }: { badge: LedgerRow["badge"] }) {
  return <span className={TONE_CLASS[badge.tone]}>{badge.label}</span>;
}
