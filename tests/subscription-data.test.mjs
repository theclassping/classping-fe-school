import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/loadTs.mjs';

const mappers = loadTs('features/subscription/mappers.ts');
const rules = loadTs('features/subscription/rules.ts');
const api = loadTs('features/subscription/api.ts');

const GB = 1024 ** 3;
const NOW = Date.parse('2026-11-20T03:00:00Z');

const invoiceResponse = (overrides = {}) => ({
  id: 45, number: 'SINV-2026-000045', kind: 'first', start: 'period', plan_code: 'starter',
  period_start: '2026-11-25T00:00:00Z', period_end: '2026-12-25T00:00:00Z',
  lines: [{ description: 'Starter — 25 Nov – 25 Dec 2026', quantity: 1, unit_price: '199000.00', amount: '199000.00' }],
  subtotal: '199000.00', tax: '21890.00', total: '220890.00', currency: 'IDR', status: 'open',
  due_at: '2026-11-25T00:00:00Z', paid_at: null, ...overrides,
});

const subscriptionResponse = (overrides = {}) => ({
  id: 7, status: 'trialing', plan: { code: 'starter', name: 'Starter', price_id: 1, amount: '199000.00' }, pending_plan: null,
  trial_start: '2026-05-29T00:00:00Z', trial_end: '2026-11-25T00:00:00Z', current_period_start: null, current_period_end: null,
  access_until: '2026-11-25T00:00:00Z', grace_ends_at: null, cancel_at_period_end: false, currency: 'IDR',
  features: {
    max_students: { state: 'active', value: 100, kind: 'limit' },
    storage_bytes: { state: 'active', value: 50 * GB, kind: 'limit' },
    payment_gateway: { state: 'active', value: true, kind: 'boolean' },
  },
  open_invoices: [], usage: { max_students: 80, storage_bytes: 10 * GB }, ...overrides,
});

const planResponse = (code, name, priceId, amount, students, gigabytes) => ({
  id: priceId, code, name, description: '', price_id: priceId, amount, interval: 'month',
  features: { max_students: students, storage_bytes: gigabytes * GB, payment_gateway: true },
});

const plansResponse = {
  currency: 'IDR', tax_rate: '0.11',
  plans: [planResponse('pro', 'Pro', 3, '699000.00', 500, 100), planResponse('starter', 'Starter', 1, '199000.00', 100, 50), planResponse('growth', 'Growth', 2, '449000.00', 300, 75)],
};

const paymentResponse = (overrides = {}) => ({
  id: 31, payment_no: 'SUB-20261120-000031', invoice_id: 45, invoice_number: 'SINV-2026-000045', status: 'pending',
  channel_code: 'VIRTUAL_ACCOUNT_BCA', channel_name: 'BCA Virtual Account', payment_method: 'virtual_account',
  invoice_total: '220890.00', transaction_fee: '2775.00', amount: '223665.00', payment_code: '8808123456789', payment_link: '',
  billing_url: 'https://pay.example/abc', expires_at: '2026-11-20T04:00:00Z', paid_at: null, created_at: '2026-11-20T03:00:00Z', ...overrides,
});

test('subscription maps status, usage against limits and open invoices', () => {
  const subscription = mappers.toSubscription(subscriptionResponse({ open_invoices: [invoiceResponse()] }));
  assert.equal(subscription.statusLabel, 'Masa gratis');
  assert.equal(subscription.planAmount, 199000);
  assert.deepEqual(subscription.students, { used: 80, limit: 100, percent: 80, locked: false });
  assert.equal(subscription.storage.percent, 20);
  assert.equal(subscription.onlinePayment, true);
  assert.equal(subscription.openInvoices[0].total, 220890);
  assert.equal(subscription.openInvoices[0].statusLabel, 'Belum dibayar');
});

test('an expired subscription locks its limits and switches online payment off', () => {
  const subscription = mappers.toSubscription(subscriptionResponse({
    status: 'expired',
    features: {
      max_students: { state: 'read_only', value: 100, kind: 'limit' },
      storage_bytes: { state: 'read_only', value: null, kind: 'limit' },
      payment_gateway: { state: 'read_only', value: true, kind: 'boolean' },
    },
  }));
  assert.equal(subscription.tone, 'danger');
  assert.equal(subscription.students.locked, true);
  assert.deepEqual(subscription.storage, { used: 10 * GB, limit: null, percent: 0, locked: true });
  assert.equal(subscription.onlinePayment, false);
});

test('plans are sorted by price and read their limits from the feature values', () => {
  const catalog = mappers.toPlanCatalog(plansResponse);
  assert.equal(catalog.taxRate, 0.11);
  assert.deepEqual(catalog.plans.map((plan) => plan.code), ['starter', 'growth', 'pro']);
  assert.deepEqual(catalog.plans[1], { code: 'growth', name: 'Growth', priceId: 2, amount: 449000, maxStudents: 300, storageBytes: 75 * GB, onlinePayment: true });
});

test('plan actions follow the subscription status', () => {
  const { plans } = mappers.toPlanCatalog(plansResponse);
  const [starter, growth, pro] = plans;
  const trial = mappers.toSubscription(subscriptionResponse());
  assert.deepEqual(rules.planAction(trial, starter), { kind: 'subscribe', canStartNow: false });
  assert.deepEqual(rules.planAction(trial, pro), { kind: 'subscribe', canStartNow: true });

  const overdue = mappers.toSubscription(subscriptionResponse({ status: 'past_due' }));
  assert.deepEqual(rules.planAction(overdue, growth), { kind: 'subscribe', canStartNow: false });

  const active = mappers.toSubscription(subscriptionResponse({ status: 'active', plan: { code: 'growth', name: 'Growth', price_id: 2, amount: '449000.00' } }));
  assert.equal(rules.planAction(active, growth).kind, 'current');
  assert.equal(rules.planAction(active, pro).kind, 'upgrade');
  assert.equal(rules.planAction(active, starter).kind, 'downgrade');
  assert.equal(rules.planAction(active, { ...pro, priceId: null }).kind, 'unavailable');

  assert.equal(rules.recommendedPlan(plans, 80).code, 'starter');
  assert.equal(rules.recommendedPlan(plans, 250).code, 'growth');
  assert.equal(rules.recommendedPlan(plans, 900), null);
});

test('status notices explain the trial, the grace period and read-only mode', () => {
  const date = (value) => (value ? value.slice(0, 10) : '-');
  const trial = rules.statusNotice(mappers.toSubscription(subscriptionResponse()), NOW, date);
  assert.equal(trial.title, 'Masa gratis tersisa 5 hari');
  assert.equal(trial.tone, 'warning');

  const overdue = rules.statusNotice(mappers.toSubscription(subscriptionResponse({ status: 'past_due', grace_ends_at: '2026-12-02T00:00:00Z' })), NOW, date);
  assert.match(overdue.body, /2026-12-02/);

  assert.equal(rules.statusNotice(mappers.toSubscription(subscriptionResponse({ status: 'expired' })), NOW, date).tone, 'danger');
  assert.equal(rules.statusNotice(mappers.toSubscription(subscriptionResponse({ status: 'active' })), NOW, date), null);
});

test('helpers format bytes, count days and pick the checkout to resume', () => {
  assert.equal(rules.formatBytes(50 * GB), '50 GB');
  assert.equal(rules.formatBytes(1.5 * GB), '1,5 GB');
  assert.equal(rules.formatBytes(0), '0 MB');
  assert.equal(rules.daysUntil('2026-11-25T00:00:00Z', NOW), 5);
  assert.equal(rules.daysUntil('2026-11-01T00:00:00Z', NOW), 0);

  const pending = mappers.toPayment(paymentResponse());
  const expired = mappers.toPayment(paymentResponse({ id: 30, status: 'expired' }));
  assert.equal(pending.payUrl, 'https://pay.example/abc');
  assert.equal(rules.resumablePayment([expired, pending], NOW).id, 31);
  assert.equal(rules.resumablePayment([expired, pending], Date.parse('2026-11-20T04:00:01Z')), null);
});

async function withFetch(routes, run) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers ?? {}, body: init.body ? JSON.parse(init.body) : undefined });
    const route = routes[`${init.method ?? 'GET'} ${url.split('?')[0]}`];
    if (!route) throw new Error(`Unexpected ${url}`);
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
  };
  try { await run(calls); } finally { globalThis.fetch = originalFetch; }
}

test('api functions call the subscription endpoints and return view models', () => withFetch({
  'GET /api/proxy/subscription': { body: subscriptionResponse() },
  'POST /api/proxy/subscription/subscribe': { status: 201, body: invoiceResponse() },
  'POST /api/proxy/subscription/change-plan': { body: { invoice: null } },
  'GET /api/proxy/subscription/invoices/45': { body: { ...invoiceResponse(), payments: [paymentResponse({ id: 30, status: 'expired' }), paymentResponse()] } },
  'GET /api/proxy/subscription/invoices/45/channels': { body: { invoice_total: '220890.00', channels: [{ code: 'VIRTUAL_ACCOUNT_BCA', name: 'BCA Virtual Account', payment_method: 'virtual_account', transaction_fee: '2775.00', amount: '223665.00' }] } },
  'POST /api/proxy/subscription/invoices/45/checkout': { status: 201, body: paymentResponse() },
  'GET /api/proxy/subscription/payments/31': { body: paymentResponse({ status: 'paid', paid_at: '2026-11-20T03:10:00Z' }) },
}, async (calls) => {
  assert.equal((await api.getSubscription()).planName, 'Starter');

  const invoice = await api.subscribe(3, 'now');
  assert.deepEqual(calls[1].body, { price_id: 3, start: 'now' });
  assert.equal(invoice.number, 'SINV-2026-000045');

  assert.equal(await api.changePlan(1), null);

  assert.deepEqual((await api.getInvoicePayments(45)).map((payment) => payment.id), [31, 30]);
  assert.deepEqual(await api.getInvoiceChannels(45), [{ code: 'VIRTUAL_ACCOUNT_BCA', name: 'BCA Virtual Account', method: 'virtual_account', fee: 2775, amount: 223665 }]);

  const payment = await api.startCheckout(45, 'VIRTUAL_ACCOUNT_BCA', 'key-1');
  assert.deepEqual(calls[5].body, { channel_code: 'VIRTUAL_ACCOUNT_BCA' });
  assert.equal(calls[5].headers['Idempotency-Key'], 'key-1');
  assert.equal(payment.amount, 223665);

  assert.equal((await api.getPayment(31)).status, 'paid');
}));
