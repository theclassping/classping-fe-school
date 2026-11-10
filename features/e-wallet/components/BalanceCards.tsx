import { ArrowUpFromLine, Clock3, Hourglass, Landmark, Wallet } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { WalletSummary } from "../types";
import styles from "./EWallet.module.css";

type Props = {
  summary: WalletSummary | undefined;
  /** The summary failed to load; show dashes instead of a loading ellipsis. */
  failed: boolean;
};

/** The four balance cards at the top of the E-Wallet page. */
export default function BalanceCards({ summary, failed }: Props) {
  const money = (value: number | undefined) => (value === undefined ? (failed ? "—" : "…") : formatRupiah(value));

  return (
    <section className={styles.balanceGrid} aria-label="Ringkasan saldo">
      <article className={`stat-card ${styles.balanceCard} ${styles.total}`} aria-labelledby="total-balance-title">
        <div className="stat-top">
          <span className="stat-icon"><Landmark aria-hidden="true" /></span>
        </div>
        <p id="total-balance-title">Total Saldo</p>
        <strong>{money(summary?.total)}</strong>
        <small className={styles.balanceNote}>Saldo mengambang + saldo riil yang belum ditarik.</small>
      </article>

      <article className={`stat-card ${styles.balanceCard} ${styles.floating}`} aria-labelledby="floating-balance-title">
        <div className="stat-top">
          <span className="stat-icon"><Hourglass aria-hidden="true" /></span>
          {summary && summary.pendingCount > 0 && <span className="trend warning">{summary.pendingCount} transaksi</span>}
        </div>
        <p id="floating-balance-title">Saldo Mengambang</p>
        <strong>{money(summary?.pending)}</strong>
        <small className={styles.balanceNote}>
          <Clock3 aria-hidden="true" />
          Dana masih di penyedia pembayaran dan masuk ke saldo riil setelah diselesaikan.
        </small>
      </article>

      <article className={`stat-card ${styles.balanceCard}`} aria-labelledby="real-balance-title">
        <div className="stat-top">
          <span className="stat-icon"><Wallet aria-hidden="true" /></span>
          {summary && <span className="trend up">Siap ditarik</span>}
        </div>
        <p id="real-balance-title">Saldo Riil</p>
        <strong>{money(summary?.available)}</strong>
        <small className={styles.balanceNote}>Dana yang sudah tersedia dan dapat ditarik.</small>
      </article>

      <article className={`stat-card ${styles.balanceCard} ${styles.withdrawn}`} aria-labelledby="withdrawn-title">
        <div className="stat-top">
          <span className="stat-icon"><ArrowUpFromLine aria-hidden="true" /></span>
          {summary && <span className="trend">{summary.withdrawnCount} penarikan</span>}
        </div>
        <p id="withdrawn-title">Berhasil Ditarik</p>
        <strong>{money(summary?.withdrawnTotal)}</strong>
        <small className={styles.balanceNote}>Total penarikan berhasil sepanjang waktu.</small>
      </article>
    </section>
  );
}
