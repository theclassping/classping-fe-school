import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const requireFromNext = createRequire(import.meta.resolve("next/package.json"));
const sharp = requireFromNext("sharp");

test("the tab icon uses the existing ClassPing three-bar brand mark", async () => {
  const source = await readFile(new URL("../app/icon.svg", import.meta.url), "utf8");
  assert.match(source, /viewBox="0 0 32 32"/);
  assert.match(source, /stroke="#147d64"/);
  assert.equal((source.match(/<rect /g) || []).length, 4);
  assert(!source.includes("<script"));
  assert(!source.includes("<image"));
});

test("the legacy favicon contains the same ClassPing artwork at each tab resolution", async () => {
  const source = await readFile(new URL("../app/icon.svg", import.meta.url));
  const favicon = await readFile(new URL("../app/favicon.ico", import.meta.url));
  assert.equal(favicon.readUInt16LE(0), 0);
  assert.equal(favicon.readUInt16LE(2), 1);
  assert.equal(favicon.readUInt16LE(4), 3);
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + 16 * index;
    assert.equal(favicon[entry], size);
    assert.equal(favicon[entry + 1], size);
    const length = favicon.readUInt32LE(entry + 8);
    const offset = favicon.readUInt32LE(entry + 12);
    assert(offset + length <= favicon.length);
    const actual = await sharp(favicon.subarray(offset, offset + length)).ensureAlpha().raw().toBuffer();
    const expected = await sharp(source).resize(size, size).ensureAlpha().raw().toBuffer();
    assert.deepEqual(actual, expected);
  }
});
