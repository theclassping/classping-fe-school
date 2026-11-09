"use client";

import { ArrowUpFromLine, CalendarDays, Clock3, Eye, Hourglass, Landmark, RefreshCw, Search, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ListPagination, { useListPagination } from "../components/ListPagination";
import styles from "./EWallet.module.css";
import LedgerDetailDialog from "./LedgerDetailDialog";
import WithdrawDialog from "./WithdrawDialog";
import {
  availableMonths,
  filterByMonth,
  isFloating,
  monthLabel,
  rupiah,
  summarize,
  withRunningBalance,
  type LedgerEntry,
  type WithdrawalRequest,
} from "./walletData";
import { dummyPayoutAccount, loadDummyLedger, submitDummyWithdrawal } from "./walletDummy";

type EntryFilter = "ALL" | "floating" | "available" | "debit";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function entryStatus(entry: LedgerEntry, now: Date): EntryFilter {
  if (entry.type === "debit") return "debit";
  return isFloating(entry, now) ? "floating" : "available";
}

export default function EWalletPage() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EntryFilter>("ALL");
  const [month, setMonth] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [detail, setDetail] = useState<(LedgerEntry & { balanceAfter: number }) | null>(null);

  async function loadWallet() {
    try {
      setLoading(true);
      setError("");
      const sessionResponse = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
      if (sessionResponse.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!sessionResponse.ok) throw new Error("Sesi tidak dapat dimuat.");
      const session = await sessionResponse.json();
      const role = typeof session.user?.role === "string" ? session.user.role.toUpperCase() : "";
      if (role !== "STAFF") {
        // E-Wallet is for school staff only; other roles return to the dashboard home.
        window.location.href = "/dashboard";
        return;
      }
      // TODO: swap for the wallet API once the backend endpoints are ready.
      setLedger(await loadDummyLedger());
      setNow(new Date());
    } catch (loadError) {
      console.error(loadError);
      setError("Saldo e-wallet belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWallet(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Balances are all-time snapshots; the ledger and withdrawals follow the month filter.
  const summary = useMemo(() => summarize(ledger, now), [ledger, now]);
  const months = useMemo(() => availableMonths(ledger), [ledger]);
  const monthRows = useMemo(() => filterByMonth(withRunningBalance(ledger), month), [ledger, month]);
  const monthSummary = useMemo(() => summarize(monthRows, now), [monthRows, now]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return monthRows.filter((row) =>
      (filter === "ALL" || entryStatus(row, now) === filter) &&
      (!query || row.studentName.toLowerCase().includes(query) || row.invoiceNo.toLowerCase().includes(query) || row.description.toLowerCase().includes(query)),
    );
  }, [monthRows, filter, search, now]);
  const pagination = useListPagination(filteredRows, 10);

  function updateSearch(value: string) {
    setSearch(value);
    pagination.reset();
  }

  function updateFilter(value: EntryFilter) {
    setFilter(value);
    pagination.reset();
  }

  function updateMonth(value: string) {
    setMonth(value);
    pagination.reset();
  }

  const periodLabel = month ? monthLabel(month) : "Semua periode";
  const canWithdraw = !loading && !error && summary.real > 0;

  async function submitWithdrawal(request: WithdrawalRequest) {
    // TODO: replace with POST /api/withdrawals/preview + OTP + POST /api/withdrawals.
    const entry = await submitDummyWithdrawal(request);
    setLedger((current) => [entry, ...current]);
    setNow(new Date());
    return entry;
  }

  return (
    <main id="main">
      <section className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRASI SEKOLAH</p>
          <h1>E-Wallet</h1>
          <p>Saldo dana pembayaran sekolah dan riwayat pergerakan dana.</p>
        </div>
        <div className={styles.headingActions}>
          <button type="button" className={`primary-button ${styles.withdrawButton}`} onClick={() => setWithdrawOpen(true)} disabled={!canWithdraw}>
            <ArrowUpFromLine aria-hidden="true" /> Tarik Dana
          </button>
        </div>
      </section>

      <section className={styles.balanceGrid} aria-label="Ringkasan saldo">
        <article className={`stat-card ${styles.balanceCard} ${styles.total}`} aria-labelledby="total-balance-title">
          <div className="stat-top">
            <span className="stat-icon"><Landmark aria-hidden="true" /></span>
          </div>
          <p id="total-balance-title">Total Saldo</p>
          <strong>{loading ? "…" : error ? "—" : rupiah(summary.total)}</strong>
          <small className={styles.balanceNote}>Saldo mengambang + saldo riil yang belum ditarik.</small>
        </article>

        <article className={`stat-card ${styles.balanceCard} ${styles.floating}`} aria-labelledby="floating-balance-title">
          <div className="stat-top">
            <span className="stat-icon"><Hourglass aria-hidden="true" /></span>
            {!loading && !error && summary.pendingCount > 0 && (
              <span className="trend warning">{summary.pendingCount} transaksi</span>
            )}
          </div>
          <p id="floating-balance-title">Saldo Mengambang</p>
          <strong>{loading ? "…" : error ? "—" : rupiah(summary.floating)}</strong>
          <small className={styles.balanceNote}>
            <Clock3 aria-hidden="true" />
            {summary.nextAvailableAt
              ? `Dana masih di pihak ketiga. Tersedia mulai ${formatDateTime(summary.nextAvailableAt)}.`
              : "Dana masih di pihak ketiga dan siap dalam 1 hari kerja."}
          </small>
        </article>

        <article className={`stat-card ${styles.balanceCard}`} aria-labelledby="real-balance-title">
          <div className="stat-top">
            <span className="stat-icon"><Wallet aria-hidden="true" /></span>
            {!loading && !error && <span className="trend up">Siap ditarik</span>}
          </div>
          <p id="real-balance-title">Saldo Riil</p>
          <strong>{loading ? "…" : error ? "—" : rupiah(summary.real)}</strong>
          <small className={styles.balanceNote}>Dana yang sudah tersedia dan dapat ditarik.</small>
        </article>

        <article className={`stat-card ${styles.balanceCard} ${styles.withdrawn}`} aria-labelledby="withdrawn-title">
          <div className="stat-top">
            <span className="stat-icon"><ArrowUpFromLine aria-hidden="true" /></span>
            {!loading && !error && <span className="trend">{monthSummary.withdrawalCount} penarikan</span>}
          </div>
          <p id="withdrawn-title">Berhasil Ditarik</p>
          <strong>{loading ? "…" : error ? "—" : rupiah(monthSummary.withdrawn)}</strong>
          <small className={styles.balanceNote}>
            <CalendarDays aria-hidden="true" />
            {month ? `Total penarikan ${periodLabel}.` : "Total penarikan sepanjang waktu."}
          </small>
        </article>
      </section>

      <section className="panel transactions" id="buku-kas">
        <div className="panel-heading transaction-heading">
          <div>
            <h2>Buku Kas E-Wallet</h2>
            <p>Pembayaran terverifikasi dan penarikan dana · {periodLabel}</p>
          </div>
          <span className="text-button">{filteredRows.length} entri</span>
        </div>

        <div className={`table-tools ${styles.toolbar}`}>
          <label className="search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Cari nama siswa atau nomor invoice..."
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
            />
          </label>
          <select aria-label="Filter bulan" value={month} onChange={(event) => updateMonth(event.target.value)}>
            <option value="">Semua Bulan</option>
            {months.map((key) => (
              <option key={key} value={key}>{monthLabel(key)}</option>
            ))}
          </select>
          <select aria-label="Filter status dana" value={filter} onChange={(event) => updateFilter(event.target.value as EntryFilter)}>
            <option value="ALL">Semua Entri</option>
            <option value="floating">Mengambang</option>
            <option value="available">Tersedia</option>
            <option value="debit">Penarikan</option>
          </select>
          <button type="button" className={`filter-button ${styles.refresh}`} onClick={loadWallet} disabled={loading}>
            <RefreshCw aria-hidden="true" /> Muat ulang
          </button>
        </div>

        {loading ? (
          <p className="empty-state">Memuat buku kas...</p>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
            <button type="button" className="button-secondary" onClick={loadWallet}>Coba lagi</button>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th className={styles.numeric}>Jumlah</th>
                  <th className={styles.numeric}>Saldo</th>
                  <th>Status</th>
                  <th><span className={styles.srOnly}>Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((row) => {
                  const status = entryStatus(row, now);
                  return (
                    <tr key={row.id}>
                      <td className={styles.nowrap}>{formatDateTime(row.settledAt)}</td>
                      <td>
                        <div className={styles.ledgerDescription}>
                          <strong>{row.description}</strong>
                          <small>{row.reference}</small>
                        </div>
                      </td>
                      <td className={styles.numeric}>
                        <strong className={row.type === "credit" ? styles.amountCredit : styles.amountDebit}>{row.type === "credit" ? "+" : "-"}{rupiah(row.amount)}</strong>
                      </td>
                      <td className={styles.numeric}><strong>{rupiah(row.balanceAfter)}</strong></td>
                      <td>
                        {status === "floating" ? (
                          <span className="status-pending">Mengambang</span>
                        ) : status === "debit" ? (
                          <span className="status-badge muted">Penarikan</span>
                        ) : (
                          <span className="status-pill">Tersedia</span>
                        )}
                      </td>
                      <td className={styles.numeric}>
                        <button type="button" className={styles.detailButton} onClick={() => setDetail(row)} aria-label={`Lihat detail ${row.description}`}>
                          <Eye aria-hidden="true" /> Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && <ListPagination {...pagination.controls} noun="entri" />}
        {!loading && !error && filteredRows.length === 0 && (
          <p className="empty-state">
            {ledger.length === 0 ? "Belum ada pembayaran terverifikasi yang masuk ke e-wallet." : month && monthRows.length === 0 ? `Tidak ada pergerakan dana pada ${periodLabel}.` : "Tidak ada entri yang cocok dengan pencarian atau filter."}
          </p>
        )}
      </section>
      <LedgerDetailDialog entry={detail} now={now} onClose={() => setDetail(null)} />
      <WithdrawDialog open={withdrawOpen} available={summary.real} account={dummyPayoutAccount} onClose={() => setWithdrawOpen(false)} onSubmit={submitWithdrawal} />
    </main>
  );
}
