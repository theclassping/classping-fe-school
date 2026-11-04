import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
function loadUuid(cryptoImpl) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/uuid.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, crypto: cryptoImpl, Uint8Array, Array });
  return module.exports;
}

test('randomId falls back to a v4 UUID when crypto.randomUUID is missing on plain-HTTP LAN pages', () => {
  const { randomId } = loadUuid({ getRandomValues: bytes => globalThis.crypto.getRandomValues(bytes) });
  const ids = new Set(Array.from({ length: 50 }, () => randomId()));
  assert.equal(ids.size, 50);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('randomId uses crypto.randomUUID when the page is a secure context', () => {
  const { randomId } = loadUuid({ randomUUID: () => 'native-id', getRandomValues: () => { throw new Error('unused'); } });
  assert.equal(randomId(), 'native-id');
});
