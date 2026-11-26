import test, { mock } from 'node:test';
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

const { pollWhileVisible } = load('lib/pollWhileVisible.ts');

function fakeTab() {
  const listeners = new Set();
  return {
    visibilityState: 'visible',
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    show(state) { this.visibilityState = state; for (const listener of listeners) listener(); },
    listeners,
  };
}

test('polls at the visible rate, slows down in a background tab and catches up on return', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const doc = fakeTab();
  let calls = 0;
  const stop = pollWhileVisible(() => { calls += 1; }, { visibleMs: 120_000, hiddenMs: 600_000, doc });

  mock.timers.tick(119_000);
  assert.equal(calls, 0);
  mock.timers.tick(1_000);
  assert.equal(calls, 1);

  doc.show('hidden');
  mock.timers.tick(480_000);
  assert.equal(calls, 1, 'no visible-rate calls while hidden');
  mock.timers.tick(120_000);
  assert.equal(calls, 2, 'hidden tabs still poll at the slow rate');

  // A quick switch away and back must not add a call.
  doc.show('visible');
  doc.show('hidden');
  doc.show('visible');
  mock.timers.tick(0);
  assert.equal(calls, 2);

  // Returning after a long absence refreshes at once.
  doc.show('hidden');
  mock.timers.tick(300_000);
  doc.show('visible');
  mock.timers.tick(0);
  assert.equal(calls, 3);

  stop();
  mock.timers.tick(1_000_000);
  assert.equal(calls, 3);
  assert.equal(doc.listeners.size, 0);
  mock.timers.reset();
});

test('makes no calls from a hidden tab when no hidden rate is given', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const doc = fakeTab();
  let calls = 0;
  const stop = pollWhileVisible(() => { calls += 1; }, { visibleMs: 120_000, doc });
  doc.show('hidden');
  mock.timers.tick(3_600_000);
  assert.equal(calls, 0);
  doc.show('visible');
  mock.timers.tick(0);
  assert.equal(calls, 1);
  stop();
  mock.timers.reset();
});
