// Temporary dummy ledger while the backend e-wallet API is being prepared.
// Replace `loadDummyLedger` with the API loader once endpoints exist.
import { buildLedger, maskAccountNumber, type CompletedPayment, type LedgerEntry, type PayoutAccount, type WithdrawalRequest } from "./walletData";

export const dummyPayoutAccount: PayoutAccount = {
  bankName: "BCA",
  accountNumber: "5271234567",
  accountHolderName: "YAYASAN PENDIDIKAN CLASSPING",
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const daysAgo = (days: number) => hoursAgo(days * 24);

function payment(id: number, name: string, amount: number, paidAt: string, method = "bank_transfer"): CompletedPayment {
  return {
    id,
    invoice_no: `INV-${paidAt.slice(0, 7).replace("-", "")}-${String(id).padStart(3, "0")}`,
    student_name: name,
    amount: String(amount),
    payment_method: method,
    status: "completed",
    submitted_at: paidAt,
    paid_at: paidAt,
    verified_at: paidAt,
    created_at: paidAt,
  };
}

function withdrawal(id: number, amount: number, settledAt: string, bank: string): LedgerEntry {
  return {
    id: `withdraw-${id}`,
    type: "debit",
    settledAt,
    availableAt: settledAt,
    amount,
    description: `Penarikan ke ${bank}`,
    withdrawal: { bankName: bank.split(" ")[0], accountNumber: maskAccountNumber(bank), accountHolderName: dummyPayoutAccount.accountHolderName, fee: 2500, transferAmount: amount - 2500, status: "success" },
    reference: `WD-${settledAt.slice(0, 10).replace(/-/g, "")}-${String(id).padStart(2, "0")}`,
    studentName: "-",
    invoiceNo: "-",
    paymentMethod: "bank_transfer",
  };
}

const payments: CompletedPayment[] = [
  payment(101, "Alya Putri Ramadhani", 250000, hoursAgo(3)),
  payment(102, "Raka Aditya Pratama", 250000, hoursAgo(20)),
  payment(103, "Nayla Zahra Aulia", 300000, daysAgo(2)),
  payment(104, "Daffa Alfarizi", 250000, daysAgo(3), "cash"),
  payment(105, "Keisha Amalia Putri", 275000, daysAgo(5)),
  payment(106, "Zafran Hidayat", 250000, daysAgo(8)),
  payment(107, "Mira Putri", 250000, daysAgo(12)),
  payment(108, "Hafiz Ardiansyah", 250000, daysAgo(15)),
  payment(109, "Nadya Salsabila", 250000, daysAgo(20)),
  payment(110, "Ariq Hadi Wijaya", 250000, daysAgo(25)),
  payment(111, "Bima Satria", 250000, daysAgo(33)),
  payment(112, "Citra Lestari", 250000, daysAgo(38)),
  payment(113, "Alya Putri Ramadhani", 250000, daysAgo(45)),
  payment(114, "Raka Aditya Pratama", 250000, daysAgo(52)),
  payment(115, "Nayla Zahra Aulia", 300000, daysAgo(64)),
  payment(116, "Daffa Alfarizi", 250000, daysAgo(70), "cash"),
];

const withdrawals: LedgerEntry[] = [
  withdrawal(1, 500000, daysAgo(10), "BCA 123-456-7890"),
  withdrawal(2, 400000, daysAgo(29), "BCA 123-456-7890"),
  withdrawal(3, 650000, daysAgo(58), "BCA 123-456-7890"),
];

export function dummyLedger(): LedgerEntry[] {
  return [...buildLedger(payments), ...withdrawals].sort((a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt));
}

export async function loadDummyLedger(): Promise<LedgerEntry[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  return [...readSessionWithdrawals(), ...dummyLedger()].sort((a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt));
}

// Dummy payout account and withdrawals submitted in this browser session.
// Replace with GET /api/wallet (payout_account) and POST /api/withdrawals.

const SESSION_KEY = "classping.wallet.dummyWithdrawals";


function readSessionWithdrawals(): LedgerEntry[] {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

/** Records a withdrawal as a ledger debit of the full requested amount (transfer + fee). */
export async function submitDummyWithdrawal(request: WithdrawalRequest): Promise<LedgerEntry> {
  await new Promise((resolve) => window.setTimeout(resolve, 600));
  const existing = readSessionWithdrawals();
  const settledAt = new Date().toISOString();
  const entry: LedgerEntry = {
    id: `withdraw-session-${existing.length + 1}`,
    type: "debit",
    settledAt,
    availableAt: settledAt,
    amount: request.amount,
    description: `Penarikan ke ${request.bankName} ${maskAccountNumber(request.accountNumber)}`,
    withdrawal: { bankName: request.bankName, accountNumber: maskAccountNumber(request.accountNumber), accountHolderName: request.accountHolderName, fee: 2500, transferAmount: request.amount - 2500, status: "processing" },
    reference: `WD-${settledAt.slice(0, 10).replace(/-/g, "")}-${String(withdrawals.length + existing.length + 1).padStart(2, "0")}`,
    studentName: "-",
    invoiceNo: "-",
    paymentMethod: "bank_transfer",
  };
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify([entry, ...existing]));
  } catch {
    /* sessionStorage unavailable: the entry still shows until reload */
  }
  return entry;
}
