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

const { fitWithin, jpegName, shouldResize, resizeImageForUpload, MAX_IMAGE_EDGE } = load('lib/imageResize.ts');

test('scales the longest edge down to the limit and keeps the aspect ratio', () => {
  assert.deepEqual(fitWithin(4032, 3024), { width: MAX_IMAGE_EDGE, height: 1200 });
  assert.deepEqual(fitWithin(3024, 4032), { width: 1200, height: MAX_IMAGE_EDGE });
  assert.deepEqual(fitWithin(1200, 800), { width: 1200, height: 800 });
  assert.deepEqual(fitWithin(10000, 2, 1600), { width: 1600, height: 1 });
});

test('renames converted files to .jpg', () => {
  assert.equal(jpegName('IMG_0001.HEIC'), 'IMG_0001.jpg');
  assert.equal(jpegName('bukti.transfer.png'), 'bukti.transfer.jpg');
  assert.equal(jpegName('noext'), 'noext.jpg');
  assert.equal(jpegName('.png'), 'image.jpg');
});

test('only raster images are resized; PDFs, GIFs and SVGs pass through', async () => {
  assert.equal(shouldResize('image/jpeg'), true);
  assert.equal(shouldResize('image/png'), true);
  assert.equal(shouldResize('application/pdf'), false);
  assert.equal(shouldResize('image/gif'), false);
  assert.equal(shouldResize('image/svg+xml'), false);
  // Plain objects stand in for File, which Node 18 does not expose globally.
  const pdf = { name: 'bukti.pdf', type: 'application/pdf', size: 4 };
  assert.equal(await resizeImageForUpload(pdf), pdf);
});

test('uploads the original when the browser cannot decode the image', async () => {
  globalThis.createImageBitmap = async () => { throw new Error('unsupported'); };
  try {
    const heic = { name: 'IMG.heic', type: 'image/heic', size: 1 };
    assert.equal(await resizeImageForUpload(heic), heic);
  } finally {
    delete globalThis.createImageBitmap;
  }
});
