"use client";

import { ArrowUpFromLine, CalendarDays, Clock3, Hourglass, RefreshCw, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ListPagination, { useListPagination } from "../components/ListPagination";
import styles from "./EWallet.module.css";
import {
  availableMonths,
  filterByMonth,
  isFloating,
  methodLabel,
  monthLabel,
  rupiah,
  summarize,
  withRunningBalance,
  type LedgerEntry,
} from "./walletData";
import { loadDummyLedger } from "./walletDummy";

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

  return (
    <main id="main">
      <section className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRASI SEKOLAH</p>
          <h1>E-Wallet</h1>
          <p>Saldo dana pembayaran sekolah dan riwayat pergerakan dana.</p>
        </div>
      </section>

      <section className={styles.balanceGrid} aria-label="Ringkasan saldo">
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
                  <th>Referensi</th>
                  <th>Metode</th>
                  <th className={styles.numeric}>Masuk</th>
                  <th className={styles.numeric}>Keluar</th>
                  <th className={styles.numeric}>Saldo</th>
                  <th>Status</th>
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
                          {row.paymentId && (
                            <small>
                              <Link href={`/dashboard/payments/view?payment=${encodeURIComponent(String(row.paymentId))}`}>Lihat pembayaran</Link>
                            </small>
                          )}
                        </div>
                      </td>
                      <td className={styles.nowrap}>{row.reference}</td>
                      <td className={styles.nowrap}>{methodLabel(row.paymentMethod)}</td>
                      <td className={styles.numeric}>{row.type === "credit" ? <strong className={styles.amountCredit}>+{rupiah(row.amount)}</strong> : "-"}</td>
                      <td className={styles.numeric}>{row.type === "debit" ? <strong className={styles.amountDebit}>-{rupiah(row.amount)}</strong> : "-"}</td>
                      <td className={styles.numeric}><strong>{rupiah(row.balanceAfter)}</strong></td>
                      <td>
                        {status === "floating" ? (
                          <>
                            <span className="status-pending">Mengambang</span>
                            <span className={styles.availableAt}>Tersedia {formatDateTime(row.availableAt)}</span>
                          </>
                        ) : status === "debit" ? (
                          <span className="status-badge muted">Penarikan</span>
                        ) : (
                          <span className="status-pill">Tersedia</span>
                        )}
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
    </main>
  );
}
