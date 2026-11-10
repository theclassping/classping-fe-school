"use client";

import { ArrowUpFromLine, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import ListPagination from "@/app/dashboard/components/ListPagination";
import { isForbidden } from "@/lib/api/errors";
import { formatMonth } from "@/lib/format";
import { useResource } from "@/lib/useResource";
import { getWalletSummary } from "../api";
import { useLedger } from "../hooks/useLedger";
import { hasActiveFilters, recentMonths } from "../ledgerFilters";
import { WALLET_ERROR_MESSAGES, walletErrorMessage } from "../rules";
import type { LedgerRow } from "../types";
import BalanceCards from "./BalanceCards";
import LedgerDetailDialog from "./LedgerDetailDialog";
import LedgerTable from "./LedgerTable";
import LedgerToolbar from "./LedgerToolbar";
import WithdrawDialog from "./WithdrawDialog";
import styles from "./EWallet.module.css";

/** /dashboard/e-wallet: branch balances, the ledger, and withdrawals. */
export default function EWalletScreen() {
  const summary = useResource(getWalletSummary);
  const ledger = useLedger();
  const [months] = useState(() => recentMonths(new Date()));
  const [selected, setSelected] = useState<LedgerRow | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  function refresh() {
    summary.reload();
    ledger.reload();
  }

  if (isForbidden(summary.error) || isForbidden(ledger.error)) {
    return (
      <main id="main">
        <PageHeading />
        <section className="panel">
          <div className="empty-state">
            <ShieldAlert aria-hidden="true" />
            <p>{WALLET_ERROR_MESSAGES.WITHDRAWAL_ROLE_FORBIDDEN}</p>
          </div>
        </section>
      </main>
    );
  }

  const page = ledger.data;
  // The backend rejects amounts that do not exceed the fee.
  const canWithdraw = summary.data !== undefined && summary.data.available > summary.data.withdrawalFee;
  const periodLabel = ledger.filters.month ? formatMonth(ledger.filters.month) : "Semua periode";

  return (
    <main id="main">
      <PageHeading>
        <button type="button" className={`primary-button ${styles.withdrawButton}`} onClick={() => setWithdrawOpen(true)} disabled={!canWithdraw}>
          <ArrowUpFromLine aria-hidden="true" /> Tarik Dana
        </button>
      </PageHeading>

      {summary.error !== undefined && <p className={styles.fieldError} role="alert">{walletErrorMessage(summary.error, "Saldo e-wallet belum dapat dimuat.")}</p>}
      <BalanceCards summary={summary.data} failed={summary.error !== undefined && !summary.data} />

      <section className="panel transactions" id="buku-kas">
        <div className="panel-heading transaction-heading">
          <div>
            <h2>Buku Kas E-Wallet</h2>
            <p>Pembayaran masuk dan penarikan dana · {periodLabel}</p>
          </div>
          {page && <span className="text-button">{page.total} entri</span>}
        </div>

        <LedgerToolbar filters={ledger.filters} months={months} onChange={ledger.updateFilters} onRefresh={refresh} refreshing={summary.loading || ledger.loading} />

        {ledger.error !== undefined ? (
          <div className="empty-state">
            <p>{walletErrorMessage(ledger.error, "Buku kas belum dapat dimuat.")}</p>
            <button type="button" className="button-secondary" onClick={ledger.reload}>Coba lagi</button>
          </div>
        ) : !page ? (
          <p className="empty-state">Memuat buku kas...</p>
        ) : page.total === 0 ? (
          <p className="empty-state">
            {hasActiveFilters(ledger.query) ? "Tidak ada entri yang cocok dengan pencarian atau filter." : "Belum ada pembayaran yang masuk ke e-wallet."}
          </p>
        ) : (
          <>
            <LedgerTable rows={page.items} onSelect={setSelected} />
            <ListPagination total={page.total} page={page.page} pageSize={page.pageSize} onPageChange={ledger.setPage} noun="entri" />
          </>
        )}
      </section>

      <LedgerDetailDialog row={selected} onClose={() => setSelected(null)} />
      {withdrawOpen && summary.data && (
        <WithdrawDialog summary={summary.data} onClose={() => { setWithdrawOpen(false); refresh(); }} />
      )}
    </main>
  );
}

function PageHeading({ children }: { children?: ReactNode }) {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">ADMINISTRASI SEKOLAH</p>
        <h1>E-Wallet</h1>
        <p>Saldo dana pembayaran sekolah dan riwayat pergerakan dana.</p>
      </div>
      {children && <div className={styles.headingActions}>{children}</div>}
    </section>
  );
}
