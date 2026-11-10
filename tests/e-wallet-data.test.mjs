import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/loadTs.mjs';

const mappers = loadTs('features/e-wallet/mappers.ts');
const rules = loadTs('features/e-wallet/rules.ts');
const filters = loadTs('features/e-wallet/ledgerFilters.ts');
const api = loadTs('features/e-wallet/api.ts');

const ledgerEntry = (overrides = {}) => ({
  id: 1, created_at: '2026-11-09T07:00:00Z', entry_type: 'payment_credit', amount: '250000.00', balance_after: '250000.00',
  settlement_status: 'pending_settlement', settled_at: null, gateway_payment_id: 9, withdrawal_id: null, note: 'PAY-20261109-000009', ...overrides,
});

const withdrawalResponse = {
  id: 4, withdrawal_no: 'WDR-20261110-000004', status: 'processing', amount: '100000.00', fee: '2500.00', transfer_amount: '97500.00',
  bank_code: 'BCA', bank_name: 'BCA', account_number_masked: '****4567', account_holder_name: 'YAYASAN', failure_reason: '',
  created_at: '2026-11-10T03:00:00Z', completed_at: null,
};

test('wallet summary turns decimals into numbers and adds the total', () => {
  const summary = mappers.toWalletSummary({
    branch_id: 1, available_balance: '450000.00', pending_balance: '250000.00', pending_count: 1,
    withdrawn_total: '100000.00', withdrawn_count: 1, withdrawal_fee: '2500.00',
  });
  assert.deepEqual(summary, { available: 450000, pending: 250000, total: 700000, pendingCount: 1, withdrawnTotal: 100000, withdrawnCount: 1, withdrawalFee: 2500 });
});

test('ledger rows label payments by settlement and withdrawals by type, keeping signed amounts', () => {
  const pending = mappers.toLedgerRow(ledgerEntry());
  assert.equal(pending.pending, true);
  assert.deepEqual(pending.badge, { label: 'Mengambang', tone: 'pending' });
  assert.equal(pending.description, 'Pembayaran siswa');
  assert.equal(pending.reference, 'PAY-20261109-000009');

  const settled = mappers.toLedgerRow(ledgerEntry({ settlement_status: 'settled', settled_at: '2026-11-10T01:00:00Z' }));
  assert.deepEqual(settled.badge, { label: 'Tersedia', tone: 'available' });

  const fee = mappers.toLedgerRow(ledgerEntry({ entry_type: 'withdrawal_fee', amount: '-2500.00', settlement_status: null, note: 'WDR-1' }));
  assert.equal(fee.amount, -2500);
  assert.equal(fee.description, 'Biaya penarikan');
  assert.equal(fee.pending, false);

  const unknown = mappers.toLedgerRow(ledgerEntry({ entry_type: 'something_new', settlement_status: null, note: '' }));
  assert.equal(unknown.description, 'Transaksi');
  assert.equal(unknown.reference, '-');
});

test('ledger detail nests the payment or the withdrawal', () => {
  const detail = mappers.toLedgerDetail({
    ...ledgerEntry(),
    gateway_payment: { id: 9, payment_no: 'PAY-9', status: 'paid', student_name: 'Alya', channel_name: 'BCA VA', invoice_total: '250000.00', paid_at: '2026-11-09T07:00:00Z', needs_refund: false,
      items: [{ student_invoice_id: 3, invoice_no: 'INV-3', fee_type: 'SPP', amount: '250000.00' }] },
    withdrawal: null,
  });
  assert.equal(detail.payment.studentName, 'Alya');
  assert.deepEqual(detail.payment.items, [{ invoiceNo: 'INV-3', feeType: 'SPP', amount: 250000 }]);
  assert.equal(detail.withdrawal, null);
  assert.equal(mappers.toWithdrawal(withdrawalResponse).statusLabel, 'Sedang diproses');
});

test('preview request uses the saved account id, or the new account details', () => {
  const base = { payoutAccountId: 7, bankCode: 'BNI', accountNumber: '1234567890', accountHolderName: ' YAYASAN ', amount: 100000 };
  assert.deepEqual(mappers.toPreviewRequest({ ...base, target: 'saved' }), { amount: '100000', payout_account_id: 7 });
  assert.deepEqual(mappers.toPreviewRequest({ ...base, target: 'new' }), { amount: '100000', bank_code: 'BNI', account_number: '1234567890', account_holder_name: 'YAYASAN' });
});

test('withdrawal form validation mirrors the backend rules', () => {
  const limits = { available: 200000, fee: 2500 };
  const saved = { target: 'saved', payoutAccountId: 7, bankCode: '', accountNumber: '', accountHolderName: '', amount: 200000 };
  assert.deepEqual(rules.validateWithdrawalForm(saved, limits), {});
  assert.match(rules.validateWithdrawalForm({ ...saved, payoutAccountId: null }, limits).payoutAccountId, /Pilih rekening/);
  assert.match(rules.validateWithdrawalForm({ ...saved, amount: 200001 }, limits).amount, /melebihi saldo riil/);
  assert.match(rules.validateWithdrawalForm({ ...saved, amount: 2500 }, limits).amount, /lebih dari biaya/);
  assert.match(rules.validateWithdrawalForm({ ...saved, amount: Number.NaN }, limits).amount, /Masukkan jumlah/);

  const fresh = { ...saved, target: 'new', payoutAccountId: null, bankCode: 'BCA', accountNumber: '5271234567', accountHolderName: 'YAYASAN' };
  assert.deepEqual(rules.validateWithdrawalForm(fresh, limits), {});
  assert.match(rules.validateWithdrawalForm({ ...fresh, accountNumber: '1234' }, limits).accountNumber, /5–30 digit/);
  assert.match(rules.validateWithdrawalForm({ ...fresh, bankCode: '' }, limits).bankCode, /Pilih bank/);
  assert.match(rules.validateWithdrawalForm({ ...fresh, accountHolderName: ' ' }, limits).accountHolderName, /wajib/);
});

test('input helpers parse amounts, account numbers and OTPs', () => {
  assert.equal(rules.parseAmount('Rp 1.500.000'), 1500000);
  assert.equal(Number.isNaN(rules.parseAmount('')), true);
  assert.equal(rules.normalizeAccountNumber('527-123 4567'), '5271234567');
  assert.equal(rules.normalizeOtp('12 34-5678'), '123456');
  assert.equal(rules.isCompleteOtp('123456'), true);
  assert.deepEqual(rules.withdrawalBreakdown(100000, 2500), { amount: 100000, fee: 2500, transferAmount: 97500 });
  assert.deepEqual(rules.withdrawalBreakdown(Number.NaN, 2500), { amount: 0, fee: 2500, transferAmount: 0 });
  assert.equal(new Set(rules.BANKS.map((bank) => bank.code)).size, rules.BANKS.length);
});

test('ledger filters become backend query parameters', () => {
  assert.deepEqual(filters.monthRange('2026-02'), { date_from: '2026-02-01', date_to: '2026-02-28' });
  assert.deepEqual(filters.recentMonths(new Date(2026, 0, 15), 3), ['2026-01', '2025-12', '2025-11']);
  assert.deepEqual(filters.ledgerQuery({ search: ' INV ', month: '2026-11', status: 'pending' }),
    { search: 'INV', date_from: '2026-11-01', date_to: '2026-11-30', settlement_status: 'pending_settlement' });
  assert.equal(filters.ledgerQuery({ ...filters.EMPTY_LEDGER_FILTERS, status: 'withdrawal' }).entry_type, 'withdrawal,withdrawal_fee,withdrawal_reversal,withdrawal_fee_reversal');
  assert.equal(filters.hasActiveFilters(filters.EMPTY_LEDGER_FILTERS), false);
});

async function withFetch(routes, run) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined });
    const route = routes[`${init.method ?? 'GET'} ${url.split('?')[0]}`];
    if (!route) throw new Error(`Unexpected ${url}`);
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200, headers: route.headers });
  };
  try { await run(calls); } finally { globalThis.fetch = originalFetch; }
}

test('api functions call the wallet endpoints and return view models', () => withFetch({
  'GET /api/proxy/wallet/ledger': { body: [ledgerEntry()], headers: { 'X-Total-Count': '1', 'X-Page': '1', 'X-Page-Size': '10', 'X-Total-Pages': '1' } },
  'POST /api/proxy/withdrawals/preview': { body: { otp_reference: 'ref-1', otp_sent_to: 'branch@school.id', otp_expires_at: '2026-11-10T03:03:00Z',
    amount: '100000.00', fee: '2500.00', transfer_amount: '97500.00', payout_account: { bank_code: 'BCA', bank_name: 'BCA', account_number_masked: '****4567', account_holder_name: 'YAYASAN' } } },
  'POST /api/proxy/withdrawals': { status: 201, body: withdrawalResponse },
}, async (calls) => {
  const page = await api.getLedgerPage({ search: '', month: '', status: 'available' }, 1);
  assert.equal(calls[0].url, '/api/proxy/wallet/ledger?settlement_status=settled&page=1&page_size=10');
  assert.equal(page.total, 1);
  assert.equal(page.items[0].badge.label, 'Mengambang');

  const preview = await api.previewWithdrawal({ target: 'saved', payoutAccountId: 7, bankCode: '', accountNumber: '', accountHolderName: '', amount: 100000 });
  assert.deepEqual(calls[1].body, { amount: '100000', payout_account_id: 7 });
  assert.equal(preview.transferAmount, 97500);
  assert.equal(preview.destination.accountNumberMasked, '****4567');

  const withdrawal = await api.createWithdrawal(preview.otpReference, '123456', true);
  assert.deepEqual(calls[2].body, { otp_reference: 'ref-1', otp: '123456', fee_acknowledged: true });
  assert.equal(withdrawal.withdrawalNo, 'WDR-20261110-000004');
}));
