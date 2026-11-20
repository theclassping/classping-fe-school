"use client";

import { Check, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useResource } from "@/lib/useResource";
import { getInvoices, getPlans, getSubscription } from "../api";
import { formatBytes, planAction, recommendedPlan, statusNotice, subscriptionErrorMessage, SUBSCRIPTION_ERROR_MESSAGES } from "../rules";
import type { Invoice, Meter, Plan, PlanAction, Subscription } from "../types";
import ChoosePlanDialog from "./ChoosePlanDialog";
import PayDialog from "./PayDialog";
import styles from "./Subscription.module.css";

type Choice = { plan: Plan; action: Exclude<PlanAction, { kind: "current" } | { kind: "unavailable" }> };

const date = (value: string | null) => formatDateTime(value, "date");

const ACTION_LABELS = { subscribe: "Pilih paket", upgrade: "Upgrade", downgrade: "Turunkan paket" } as const;

/** /dashboard/subscription: the branch's plan, usage, invoices and plan choices. `initialPlan` is a plan code from the landing page. */
export default function SubscriptionScreen({ initialPlan }: { initialPlan?: string }) {
  const subscription = useResource(getSubscription);
  const catalog = useResource(getPlans);
  const invoices = useResource(getInvoices);
  const [now] = useState(() => Date.now());
  const [choice, setChoice] = useState<Choice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [message, setMessage] = useState("");

  function refresh() {
    subscription.reload();
    invoices.reload();
  }

  // An account without a branch (platform admin) has no subscription to show.
  if (subscription.error instanceof ApiError && (subscription.error.status === 403 || subscription.error.status === 404)) {
    return (
      <main id="main">
        <PageHeading />
        <section className="panel">
          <div className="empty-state">
            <ShieldAlert aria-hidden="true" />
            <p>{SUBSCRIPTION_ERROR_MESSAGES.SUBSCRIPTION_NOT_FOUND}</p>
          </div>
        </section>
      </main>
    );
  }

  const current = subscription.data;
  const plans = catalog.data?.plans ?? [];
  const notice = current ? statusNotice(current, now, date) : null;
  const recommended = current ? recommendedPlan(plans, current.students.used) : null;
  const history = (invoices.data ?? []).filter((invoice) => invoice.status !== "open");

  return (
    <main id="main">
      <PageHeading />

      {subscription.error !== undefined && (
        <div className="empty-state">
          <p>{subscriptionErrorMessage(subscription.error, "Data langganan belum dapat dimuat.")}</p>
          <button type="button" className="secondary-button" onClick={subscription.reload}>Coba lagi</button>
        </div>
      )}
      {message && <p className={`${styles.notice} ${styles.success}`} role="status"><strong>{message}</strong></p>}
      {notice && (
        <div className={`${styles.notice} ${styles[notice.tone]}`} role="status">
          <strong>{notice.title}</strong>
          <span>{notice.body}</span>
        </div>
      )}

      {!current && subscription.error === undefined && <p className="empty-state" role="status">Memuat data langganan...</p>}

      {current && (
        <>
          <section className={styles.overview} aria-label="Ringkasan langganan">
            <article className={`panel ${styles.card}`}>
              <div className={styles.cardTop}>
                <p>Paket saat ini</p>
                <span className={`${styles.pill} ${styles[current.tone]}`}>{current.statusLabel}</span>
              </div>
              <strong className={styles.planName}>{current.planName}</strong>
              <p className={styles.cardNote}>{periodLine(current)}</p>
            </article>
            <MeterCard title="Siswa aktif" meter={current.students} format={(value) => String(value)} unit="siswa" />
            <MeterCard title="Penyimpanan" meter={current.storage} format={formatBytes} />
          </section>

          {current.openInvoices.length > 0 && (
            <section className={`panel ${styles.section}`} aria-labelledby="open-invoices-title">
              <div className="panel-heading">
                <div>
                  <h2 id="open-invoices-title">Tagihan menunggu pembayaran</h2>
                  <p>Harga sudah termasuk PPN. Biaya transaksi mengikuti metode pembayaran.</p>
                </div>
              </div>
              <ul className={styles.invoiceList}>
                {current.openInvoices.map((invoice) => (
                  <li key={invoice.id}>
                    <div>
                      <strong>{invoice.lines[0]?.description ?? invoice.kindLabel}</strong>
                      <small>{invoice.number} · jatuh tempo {date(invoice.dueAt)}</small>
                    </div>
                    <strong className={styles.invoiceTotal}>{formatRupiah(invoice.total)}</strong>
                    <button type="button" className="primary-button" onClick={() => setPaying(invoice)}>Bayar sekarang</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={`panel ${styles.section}`} aria-labelledby="plans-title">
            <div className="panel-heading">
              <div>
                <h2 id="plans-title">Pilihan paket</h2>
                <p>Harga per bulan untuk satu cabang, belum termasuk PPN. Semua paket mendapat fitur yang sama.</p>
              </div>
            </div>
            {catalog.error !== undefined ? (
              <div className="empty-state">
                <p>{subscriptionErrorMessage(catalog.error, "Pilihan paket belum dapat dimuat.")}</p>
                <button type="button" className="secondary-button" onClick={catalog.reload}>Coba lagi</button>
              </div>
            ) : !catalog.data ? (
              <p className="empty-state" role="status">Memuat pilihan paket...</p>
            ) : (
              <div className={styles.planGrid}>
                {plans.map((plan) => {
                  const action = planAction(current, plan);
                  const highlighted = initialPlan ? plan.code === initialPlan : recommended?.code === plan.code && action.kind !== "current";
                  return (
                    <article key={plan.code} className={`${styles.plan} ${highlighted ? styles.planHighlighted : ""}`} aria-labelledby={`plan-${plan.code}`}>
                      <div className={styles.cardTop}>
                        <h3 id={`plan-${plan.code}`}>{plan.name}</h3>
                        {action.kind === "current" ? <span className={`${styles.pill} ${styles.success}`}>Paket Anda</span>
                          : recommended?.code === plan.code && <span className={`${styles.pill} ${styles.muted}`}>Sesuai jumlah siswa</span>}
                      </div>
                      <p className={styles.price}><strong>{formatRupiah(plan.amount)}</strong> /bulan</p>
                      <ul className={styles.features}>
                        <li><Check aria-hidden="true" />{plan.maxStudents === null ? "Siswa tanpa batas" : `Hingga ${plan.maxStudents} siswa aktif`}</li>
                        <li><Check aria-hidden="true" />{plan.storageBytes === null ? "Penyimpanan tanpa batas" : `Penyimpanan ${formatBytes(plan.storageBytes)}`}</li>
                        {plan.onlinePayment && <li><Check aria-hidden="true" />Pembayaran online orang tua</li>}
                      </ul>
                      {action.kind === "current" || action.kind === "unavailable" ? (
                        <button type="button" className="secondary-button" disabled>{action.kind === "current" ? "Paket saat ini" : "Belum tersedia"}</button>
                      ) : (
                        <button type="button" className={highlighted ? "primary-button" : "secondary-button"} onClick={() => { setMessage(""); setChoice({ plan, action }); }}>
                          {ACTION_LABELS[action.kind]}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel transactions" aria-labelledby="history-title">
            <div className="panel-heading transaction-heading">
              <div>
                <h2 id="history-title">Riwayat tagihan</h2>
                <p>Tagihan yang sudah dibayar atau dibatalkan.</p>
              </div>
            </div>
            {invoices.error !== undefined ? (
              <div className="empty-state">
                <p>{subscriptionErrorMessage(invoices.error, "Riwayat tagihan belum dapat dimuat.")}</p>
                <button type="button" className="secondary-button" onClick={invoices.reload}>Coba lagi</button>
              </div>
            ) : !invoices.data ? (
              <p className="empty-state" role="status">Memuat riwayat tagihan...</p>
            ) : history.length === 0 ? (
              <p className="empty-state">Belum ada riwayat tagihan.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Nomor</th><th>Keterangan</th><th>Tanggal bayar</th><th className={styles.numeric}>Total</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {history.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className={styles.nowrap}><strong>{invoice.number}</strong></td>
                        <td>{invoice.lines[0]?.description ?? invoice.kindLabel}</td>
                        <td className={styles.nowrap}>{date(invoice.paidAt)}</td>
                        <td className={styles.numeric}><strong>{formatRupiah(invoice.total)}</strong></td>
                        <td><span className={`${styles.pill} ${styles[invoice.tone]}`}>{invoice.statusLabel}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {choice && current && (
        <ChoosePlanDialog
          subscription={current}
          plan={choice.plan}
          action={choice.action}
          taxRate={catalog.data?.taxRate ?? 0}
          onClose={() => setChoice(null)}
          onInvoice={(invoice) => { setChoice(null); refresh(); setPaying(invoice); }}
          onScheduled={() => { setMessage(`Paket ${choice.plan.name} dijadwalkan mulai akhir periode berjalan.`); setChoice(null); refresh(); }}
        />
      )}
      {paying && <PayDialog invoice={paying} onClose={() => { setPaying(null); refresh(); }} />}
    </main>
  );
}

/** The date line under the current plan's name. */
function periodLine(subscription: Subscription): string {
  switch (subscription.status) {
    case "trialing": return `Masa gratis sampai ${date(subscription.trialEnd)}`;
    case "active": return `${formatRupiah(subscription.planAmount)} /bulan · periode berjalan sampai ${date(subscription.periodEnd ?? subscription.accessUntil)}`;
    case "past_due": return `Masa tenggang sampai ${date(subscription.graceEndsAt)}`;
    default: return `Akses berakhir ${date(subscription.accessUntil)}`;
  }
}

function MeterCard({ title, meter, format, unit }: { title: string; meter: Meter; format: (value: number) => string; unit?: string }) {
  const level = meter.limit === null ? "" : meter.percent >= 100 ? styles.meterFull : meter.percent >= 80 ? styles.meterHigh : "";
  const limit = meter.limit === null ? "tanpa batas" : `${format(meter.limit)}${unit ? ` ${unit}` : ""}`;
  return (
    <article className={`panel ${styles.card}`}>
      <div className={styles.cardTop}>
        <p>{title}</p>
        {meter.locked && <span className={`${styles.pill} ${styles.danger}`}>Baca saja</span>}
      </div>
      <strong className={styles.meterValue}>{format(meter.used)} <small>dari {limit}</small></strong>
      <div className={`progress ${styles.meter} ${level}`} role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(meter.percent)}>
        <i style={{ width: `${meter.percent}%` }} />
      </div>
    </article>
  );
}

function PageHeading() {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">PENGATURAN</p>
        <h1>Langganan</h1>
        <p>Paket ClassPing cabang ini, pemakaian, dan tagihan langganan.</p>
      </div>
    </section>
  );
}
