// E-Wallet balances derived from verified (completed) payments.
//
// Funds collected through the third-party payment channel are held there and
// become available for withdrawal after one working day. A payment counts as
// "floating" until one working day has passed since it settled, then it moves
// into the real (withdrawable) balance. Withdrawals are recorded as debits.

export type LedgerEntryType = "credit" | "debit";

export type LedgerEntry = {
  id: string;
  type: LedgerEntryType;
  /** Settlement time (ISO). Credits use the payment's paid_at / verified_at. */
  settledAt: string;
  /** When the entry becomes withdrawable (ISO). Equal to settledAt for debits. */
  availableAt: string;
  amount: number;
  description: string;
  reference: string;
  studentName: string;
  invoiceNo: string;
  paymentId?: number;
  paymentMethod?: string | null;
};

export type WalletSummary = {
  floating: number;
  real: number;
  /** Total of all debits (successful withdrawals). */
  withdrawn: number;
  pendingCount: number;
  withdrawalCount: number;
  /** Earliest moment any floating funds become available, if any. */
  nextAvailableAt: string | null;
};

export type CompletedPayment = {
  id?: number;
  invoice_no?: string;
  student_name?: string;
  amount?: string | number;
  payment_method?: string | null;
  status?: string;
  paid_at?: string | null;
  verified_at?: string | null;
  submitted_at?: string;
  created_at?: string;
};

const WORKING_DAYS_TO_SETTLE = 1;

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Adds `count` working days (Mon–Fri) to `from`, keeping the time of day. */
export function addWorkingDays(from: Date, count = WORKING_DAYS_TO_SETTLE): Date {
  const result = new Date(from.getTime());
  let remaining = count;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}

export function isFloating(entry: LedgerEntry, now = new Date()): boolean {
  return entry.type === "credit" && Date.parse(entry.availableAt) > now.getTime();
}

export function toLedgerEntry(payment: CompletedPayment): LedgerEntry | null {
  if ((payment.status || "").toLowerCase() !== "completed") return null;
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const settledRaw = payment.paid_at || payment.verified_at || payment.submitted_at || payment.created_at;
  const settledTime = settledRaw ? Date.parse(settledRaw) : NaN;
  if (Number.isNaN(settledTime)) return null;
  const settledAt = new Date(settledTime);
  return {
    id: `payment-${payment.id ?? payment.invoice_no ?? settledAt.toISOString()}`,
    type: "credit",
    settledAt: settledAt.toISOString(),
    availableAt: addWorkingDays(settledAt).toISOString(),
    amount,
    description: payment.student_name ? `Pembayaran ${payment.student_name}` : "Pembayaran siswa",
    reference: payment.invoice_no || "-",
    studentName: payment.student_name || "-",
    invoiceNo: payment.invoice_no || "-",
    paymentId: payment.id,
    paymentMethod: payment.payment_method,
  };
}

/** Newest settlement first. */
export function buildLedger(payments: readonly CompletedPayment[]): LedgerEntry[] {
  return payments
    .map(toLedgerEntry)
    .filter((entry): entry is LedgerEntry => entry !== null)
    .sort((a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt));
}

export function summarize(ledger: readonly LedgerEntry[], now = new Date()): WalletSummary {
  let floating = 0;
  let real = 0;
  let withdrawn = 0;
  let pendingCount = 0;
  let withdrawalCount = 0;
  let nextAvailable: number | null = null;
  for (const entry of ledger) {
    if (entry.type === "debit") {
      real -= entry.amount;
      withdrawn += entry.amount;
      withdrawalCount += 1;
      continue;
    }
    if (isFloating(entry, now)) {
      floating += entry.amount;
      pendingCount += 1;
      const available = Date.parse(entry.availableAt);
      if (nextAvailable === null || available < nextAvailable) nextAvailable = available;
    } else {
      real += entry.amount;
    }
  }
  return {
    floating,
    real,
    withdrawn,
    pendingCount,
    withdrawalCount,
    nextAvailableAt: nextAvailable === null ? null : new Date(nextAvailable).toISOString(),
  };
}

/** Running balance per row, computed oldest-first then returned newest-first. */
export function withRunningBalance(ledger: readonly LedgerEntry[]): (LedgerEntry & { balanceAfter: number })[] {
  const oldestFirst = [...ledger].sort((a, b) => Date.parse(a.settledAt) - Date.parse(b.settledAt));
  let balance = 0;
  const rows = oldestFirst.map((entry) => {
    balance += entry.type === "credit" ? entry.amount : -entry.amount;
    return { ...entry, balanceAfter: balance };
  });
  return rows.reverse();
}

/** "YYYY-MM" month key of an ISO timestamp, in the viewer's local time. */
export function monthKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Entries settled in the given "YYYY-MM" month; all entries when month is empty. */
export function filterByMonth<T extends { settledAt: string }>(entries: readonly T[], month: string): T[] {
  if (!month) return [...entries];
  return entries.filter((entry) => monthKey(entry.settledAt) === month);
}

/** Distinct months present in the ledger, newest first. */
export function availableMonths(ledger: readonly LedgerEntry[]): string[] {
  return Array.from(new Set(ledger.map((entry) => monthKey(entry.settledAt)))).sort().reverse();
}

export function monthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, monthIndex - 1, 1));
}

export function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function methodLabel(method?: string | null) {
  if (!method) return "-";
  return method === "bank_transfer" ? "Transfer Bank" : method === "cash" ? "Tunai" : method.replace(/_/g, " ");
}
