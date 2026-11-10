// Loads a TypeScript module for node:test without a build step.
// Imports of "@/…" and relative paths resolve to other .ts files in the repo
// (loaded the same way); anything else comes from node_modules.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const nodeRequire = createRequire(path.join(root, 'package.json'));
const cache = new Map();

function resolveFile(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve ${base}`);
}

function loadFile(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = { exports: {} };
  cache.set(filename, loaded);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const localRequire = (id) => {
    if (id.startsWith('@/')) return loadFile(resolveFile(path.join(root, id.slice(2))));
    if (id.startsWith('.')) return loadFile(resolveFile(path.resolve(path.dirname(filename), id)));
    return nodeRequire(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

/** Exports of a repo file, e.g. loadTs('lib/format.ts'). */
export function loadTs(relativePath) {
  return loadFile(resolveFile(path.resolve(root, relativePath)));
}
