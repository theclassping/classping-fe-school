import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/loadTs.mjs';

const format = loadTs('lib/format.ts');
const { ApiError, errorMessage, describeErrorBody, isAbortError, isForbidden } = loadTs('lib/api/errors.ts');
const client = loadTs('lib/api/client.ts');

const plain = (text) => text.replace(/\s/g, ' ');

test('formatRupiah accepts numbers and backend decimal strings', () => {
  assert.equal(plain(format.formatRupiah(1500000)), 'Rp 1.500.000');
  assert.equal(plain(format.formatRupiah('250000.00')), 'Rp 250.000');
  assert.equal(plain(format.formatRupiah(-2500)), '-Rp 2.500');
  assert.equal(format.formatRupiah(''), '—');
  assert.equal(format.formatRupiah(null, '-'), '-');
  assert.equal(format.formatRupiah('abc'), '—');
});

test('formatThousands, formatDateTime and formatMonth', () => {
  assert.equal(plain(format.formatSignedRupiah(250000)), '+Rp 250.000');
  assert.equal(plain(format.formatSignedRupiah(-2500)), '-Rp 2.500');
  assert.equal(format.formatThousands(1500000), '1.500.000');
  assert.equal(format.formatThousands(0), '');
  assert.equal(format.formatDateTime(null), '-');
  assert.equal(format.formatDateTime('not a date'), 'not a date');
  assert.match(format.formatDateTime('2026-11-10T07:05:00Z', 'long'), /November 2026/);
  assert.equal(format.formatMonth('2026-10'), 'Oktober 2026');
});

test('proxyUrl trims slashes and drops empty query values', () => {
  assert.equal(client.proxyUrl('/wallet/ledger/'), '/api/proxy/wallet/ledger');
  assert.equal(client.proxyUrl('wallet/ledger', { search: 'INV 1', page: 2, entry_type: '', date_from: undefined }), '/api/proxy/wallet/ledger?search=INV+1&page=2');
});

test('errorMessage prefers the feature code message, then the status, then the fallback', () => {
  const coded = new ApiError('x', 400, 'OTP_INVALID', {});
  assert.equal(errorMessage(coded, 'fallback', { OTP_INVALID: 'OTP salah.' }), 'OTP salah.');
  assert.equal(errorMessage(coded, 'fallback'), 'fallback');
  assert.match(errorMessage(new ApiError('x', 403, null, {}), 'fallback'), /tidak memiliki akses/);
  assert.match(errorMessage(new ApiError('x', 502, null, {}), 'fallback'), /Server/);
  assert.equal(errorMessage(new Error('boom'), 'fallback'), 'fallback');
  assert.equal(isForbidden(new ApiError('x', 403, 'WITHDRAWAL_ROLE_FORBIDDEN', {})), true);
  assert.equal(isForbidden(coded), false);
  assert.equal(describeErrorBody({ amount: ['Too small.'], code: 'X' }), 'amount: Too small.');
  const abort = new Error('aborted');
  abort.name = 'AbortError';
  assert.equal(isAbortError(abort), true);
});

function withFetch(handler, run) {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const assigned = [];
  globalThis.fetch = handler;
  globalThis.window = { location: { origin: 'http://localhost:3000', assign: (url) => assigned.push(String(url)) } };
  return run(assigned).finally(() => {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  });
}

test('apiGetPage reads the pagination headers forwarded by the proxy', () =>
  withFetch(async (url, init) => {
    assert.equal(url, '/api/proxy/wallet/ledger?search=a&page=2&page_size=10');
    assert.equal(init.credentials, 'include');
    return new Response(JSON.stringify([{ id: 11 }]), { headers: { 'X-Total-Count': '11', 'X-Page': '2', 'X-Page-Size': '10', 'X-Total-Pages': '2' } });
  }, async () => {
    const page = await client.apiGetPage('wallet/ledger', 2, 10, { search: 'a' });
    assert.deepEqual(page, { items: [{ id: 11 }], total: 11, page: 2, pageSize: 10, totalPages: 2 });
  }));

test('apiPost sends JSON and throws ApiError with the backend code', () =>
  withFetch(async (url, init) => {
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body), { otp: '123456' });
    return new Response(JSON.stringify({ detail: 'The OTP is incorrect.', code: 'OTP_INVALID', remaining_attempts: 2 }), { status: 400 });
  }, async () => {
    await assert.rejects(client.apiPost('withdrawals', { otp: '123456' }), (error) =>
      error instanceof ApiError && error.status === 400 && error.code === 'OTP_INVALID' && error.body.remaining_attempts === 2);
  }));

test('a 401 after the proxy gave up sends the user to the login page', () =>
  withFetch(async () => new Response(JSON.stringify({ detail: 'expired' }), { status: 401 }), async (assigned) => {
    await assert.rejects(client.apiGet('wallet'), (error) => error.status === 401);
    assert.deepEqual(assigned, ['http://localhost:3000/login']);
  }));
