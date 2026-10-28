import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function load(relative) {
  const filename = path.resolve(root, relative);
  const loadedModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(nodeRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const { buildRemoteNotifications, mergeNotifications, formatNotificationDate } = load('lib/notifications.ts');

test('turns submitted payments and published activities into staff notifications, newest first', () => {
  const items = buildRemoteNotifications(
    { results: [
      { id: 7, status: 'submitted', student_name: 'Joshua Tesla', invoice_no: 'INV-7', amount: '50000.00', submitted_at: '2026-10-28T02:00:00Z' },
      { id: 8, status: 'completed', student_name: 'Sudah', submitted_at: '2026-10-28T03:00:00Z' },
    ] },
    [
      { id: 3, name: 'Bermain balok', class_name: 'Kelas Demo', is_publish: true, updated_at: '2026-10-28T01:00:00Z' },
      { id: 4, name: 'Draft', is_publish: false, updated_at: '2026-10-28T04:00:00Z' },
    ],
  );
  assert.deepEqual(items.map((item) => item.kind), ['payment', 'activity']);
  assert.equal(items[0].href, '/dashboard/payments/view?payment=7');
  assert.match(items[0].copy, /Joshua Tesla/);
  assert.match(items[0].copy, /INV-7/);
  assert.match(items[0].copy, /50\.000/);
  assert.equal(items[1].href, '/dashboard/activities/view?activity=3');
  assert.match(items[1].copy, /Kelas Demo/);
});

test('ignores malformed payloads instead of throwing', () => {
  assert.deepEqual(buildRemoteNotifications(null, 'nope'), []);
  assert.deepEqual(buildRemoteNotifications({ detail: 'error' }, undefined), []);
});

test('merges local and remote lists without duplicates and keeps the newest on top', () => {
  const older = { id: 'update:1', kind: 'update', title: 'a', copy: '', href: '/', occurredAt: '2026-10-27T00:00:00Z' };
  const newer = { id: 'payment:9:x', kind: 'payment', title: 'b', copy: '', href: '/', occurredAt: '2026-10-28T00:00:00Z' };
  const merged = mergeNotifications([older, newer], [newer]);
  assert.deepEqual(merged.map((item) => item.id), ['payment:9:x', 'update:1']);
});

test('caps the merged list at fifty entries', () => {
  const many = Array.from({ length: 70 }, (_, index) => ({ id: `u:${index}`, kind: 'update', title: '', copy: '', href: '/', occurredAt: new Date(index * 1000).toISOString() }));
  assert.equal(mergeNotifications(many).length, 50);
});

test('formats recent timestamps relatively and tolerates bad input', () => {
  assert.equal(formatNotificationDate(undefined), '');
  assert.equal(formatNotificationDate('not a date'), '');
  assert.equal(formatNotificationDate(new Date().toISOString()), 'Baru saja');
  assert.match(formatNotificationDate(new Date(Date.now() - 5 * 60_000).toISOString()), /^5 menit lalu$/);
});
