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
  /** Set on withdrawal debits: where the money went and how the fee was applied. */
  withdrawal?: WithdrawalDetail;
};

export type WithdrawalDetail = {
  bankName: string;
  /** Masked, e.g. "****4567". */
  accountNumber: string;
  accountHolderName: string;
  fee: number;
  transferAmount: number;
  status: "processing" | "success" | "failed";
};

export type WalletSummary = {
  floating: number;
  real: number;
  /** floating + real: everything the school has collected but not yet withdrawn. */
  total: number;
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
    total: floating + real,
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

// Withdrawals (proposal §3.2): the school asks for an amount, a flat fee is
// taken out of it, and the rest is transferred to the branch's bank account.
export const WITHDRAWAL_FEE = 2500;
export const MIN_WITHDRAWAL = 10000;

export const BANKS = ["BCA", "BNI", "BRI", "MANDIRI", "CIMB", "PERMATA", "BSI", "BNC", "JAGO", "SEABANK"] as const;

export type PayoutAccount = {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
};

export type WithdrawalRequest = PayoutAccount & { amount: number };

/** Digits only; bank account numbers never carry separators when submitted. */
export function normalizeAccountNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function maskAccountNumber(value: string) {
  const digits = normalizeAccountNumber(value);
  return digits.length <= 4 ? digits : `****${digits.slice(-4)}`;
}

/** Parses "1.500.000", "1500000", or "Rp 1.500.000" into a number; NaN when empty or invalid. */
export function parseAmount(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : NaN;
}

export function withdrawalPreview(amount: number) {
  return { amount, fee: WITHDRAWAL_FEE, transferAmount: Math.max(0, amount - WITHDRAWAL_FEE) };
}

/** Field-level validation; empty object when the request can be submitted. */
export function validateWithdrawal(request: WithdrawalRequest, available: number): Partial<Record<keyof WithdrawalRequest, string>> {
  const errors: Partial<Record<keyof WithdrawalRequest, string>> = {};
  if (!request.accountHolderName.trim()) errors.accountHolderName = "Nama pemilik rekening wajib diisi.";
  if (!request.bankName.trim()) errors.bankName = "Pilih bank tujuan.";
  const digits = normalizeAccountNumber(request.accountNumber);
  if (!digits) errors.accountNumber = "Nomor rekening wajib diisi.";
  else if (digits.length < 8 || digits.length > 20) errors.accountNumber = "Nomor rekening harus 8–20 digit angka.";
  if (!Number.isFinite(request.amount) || request.amount <= 0) errors.amount = "Masukkan jumlah penarikan.";
  else if (request.amount < MIN_WITHDRAWAL) errors.amount = `Jumlah penarikan minimal ${rupiah(MIN_WITHDRAWAL)}.`;
  else if (request.amount > available) errors.amount = `Jumlah melebihi saldo riil yang dapat ditarik (${rupiah(available)}).`;
  return errors;
}
