import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const filename = path.join(root, 'app/dashboard/e-wallet/walletData.ts');
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(() => ({}), module, module.exports);
const wallet = module.exports;

const completed = (id, amount, paid_at, extra = {}) => ({ id, amount, paid_at, status: 'completed', invoice_no: `INV-${id}`, student_name: `Siswa ${id}`, payment_method: 'bank_transfer', ...extra });

test('one working day skips the weekend', () => {
  const friday = new Date('2026-11-06T10:00:00+07:00');
  assert.equal(wallet.addWorkingDays(friday).getTime(), new Date('2026-11-09T10:00:00+07:00').getTime());
  const monday = new Date('2026-11-09T10:00:00+07:00');
  assert.equal(wallet.addWorkingDays(monday).getTime(), new Date('2026-11-10T10:00:00+07:00').getTime());
});

test('payments settled less than one working day ago are floating, older ones are real', () => {
  const now = new Date('2026-11-10T09:00:00+07:00'); // Tuesday
  const ledger = wallet.buildLedger([
    completed(1, '250000', '2026-11-09T14:00:00+07:00'), // Monday afternoon → available Tue 14:00 → floating
    completed(2, '300000', '2026-11-06T08:00:00+07:00'), // Friday → available Mon 08:00 → real
    completed(3, '100000', null, { status: 'submitted' }), // not verified → excluded
    completed(4, '150000', null, { verified_at: '2026-11-05T08:00:00+07:00' }), // falls back to verified_at → real
  ]);
  assert.equal(ledger.length, 3);
  assert.equal(ledger[0].id, 'payment-1');
  const summary = wallet.summarize(ledger, now);
  assert.equal(summary.floating, 250000);
  assert.equal(summary.real, 450000);
  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.nextAvailableAt, new Date('2026-11-10T14:00:00+07:00').toISOString());
});

test('debits reduce the real balance and the running balance is newest first', () => {
  const ledger = wallet.buildLedger([completed(1, '200000', '2026-11-02T08:00:00+07:00'), completed(2, '50000', '2026-11-03T08:00:00+07:00')]);
  ledger.push({ id: 'withdraw-1', type: 'debit', settledAt: '2026-11-04T08:00:00+07:00', availableAt: '2026-11-04T08:00:00+07:00', amount: 120000, description: 'Penarikan', reference: 'WD-1', studentName: '-', invoiceNo: '-' });
  const summary = wallet.summarize(ledger, new Date('2026-11-10T08:00:00+07:00'));
  assert.equal(summary.real, 130000);
  assert.equal(summary.floating, 0);
  const rows = wallet.withRunningBalance(ledger);
  assert.deepEqual(rows.map((row) => row.balanceAfter), [130000, 250000, 200000]);
});

test('summary totals withdrawals and month helpers group entries by settlement month', () => {
  const ledger = wallet.buildLedger([completed(1, '200000', '2026-10-20T08:00:00+07:00'), completed(2, '300000', '2026-11-03T08:00:00+07:00')]);
  ledger.push({ id: 'withdraw-1', type: 'debit', settledAt: '2026-10-25T08:00:00+07:00', availableAt: '2026-10-25T08:00:00+07:00', amount: 150000, description: 'Penarikan', reference: 'WD-1', studentName: '-', invoiceNo: '-' });
  const summary = wallet.summarize(ledger, new Date('2026-11-10T08:00:00+07:00'));
  assert.equal(summary.withdrawn, 150000);
  assert.equal(summary.withdrawalCount, 1);
  assert.equal(summary.real, 350000);
  assert.deepEqual(wallet.availableMonths(ledger), ['2026-11', '2026-10']);
  const october = wallet.filterByMonth(ledger, '2026-10');
  assert.deepEqual(october.map((entry) => entry.id).sort(), ['payment-1', 'withdraw-1']);
  assert.equal(wallet.summarize(october, new Date('2026-11-10T08:00:00+07:00')).withdrawn, 150000);
  assert.equal(wallet.filterByMonth(ledger, '').length, 3);
  assert.equal(wallet.monthLabel('2026-10'), 'Oktober 2026');
});
