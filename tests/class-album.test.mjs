import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
// Loads a TypeScript module and its relative, "@/" and "classping-album/" imports (the shared package copied into node_modules).
function environment() {
  const modules = new Map();
  function resolveFile(id, from) {
    if (id.startsWith('@/')) return path.join(root, id.slice(2));
    if (id.startsWith('classping-album/')) return path.join(root, 'node_modules', id);
    if (id.startsWith('.')) return path.join(path.dirname(from), id);
    throw new Error(`Unexpected import ${id}`);
  }
  function load(base) {
    const filename = ['.ts', '.tsx'].map((ext) => `${base}${ext}`).find((candidate) => fs.existsSync(candidate));
    if (!filename) throw new Error(`Missing module ${base}`);
    if (modules.has(filename)) return modules.get(filename).exports;
    const mod = { exports: {} }; modules.set(filename, mod);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })((id) => load(resolveFile(id, filename)), mod, mod.exports);
    return mod.exports;
  }
  return load(path.join(root, 'features/album/source'));
}

const image = (id, extra = {}) => ({ id, image_url: `https://media.test/${id}.jpg`, caption: '', ...extra });

test('a class album keeps every published photo, in the teacher\'s order, and names the teacher', () => {
  const source = environment();
  const teachers = source.teacherNames([{ id: 5, teacher_name: ' Bu Anna ' }, { id: 6, teacher_name: '' }]);
  const activities = source.albumActivitiesFrom([
    { id: 1, name: ' Senam Pagi ', activity_date: '2026-10-02T00:00:00Z', class_teacher_id: 5, is_publish: true, description: ' Senam bersama. ',
      activity_images: [image('b', { position: 2, student_id: 9, caption: ' Lompat ' }), image('a', { position: 1, student_id: null }), image('c', { position: 0, student_id: 11 }), { id: 'x', image_url: null }] },
    { id: 2, name: 'Draf', activity_date: '2026-10-03', is_publish: false, activity_images: [image('d')] },
    { id: 3, name: 'Tanpa tanggal', activity_images: [image('e')] },
    { id: 4, name: 'Guru lain', activity_date: '2026-10-05', class_teacher_id: 6, activity_images: [] },
  ], teachers);
  assert.deepEqual(activities.map((activity) => activity.id), ['1', '4']);
  assert.equal(activities[0].title, 'Senam Pagi');
  assert.equal(activities[0].date, '2026-10-02');
  assert.equal(activities[0].teacher, 'Bu Anna');
  assert.equal(activities[0].description, 'Senam bersama.');
  assert.deepEqual(activities[0].photos.map((photo) => photo.id), ['c', 'a', 'b']);
  assert.equal(activities[0].photos[2].caption, 'Lompat');
  assert.equal(activities[0].remark, undefined);
  assert.equal(activities[1].teacher, undefined);
});

test('the source asks the backend for the class, published only, within the period', async () => {
  const source = environment();
  const paths = [];
  const list = async (p) => { paths.push(p); return p.startsWith('class-teachers') ? [{ id: 2, teacher_name: 'Pak Budi' }] : [{ id: 7, name: 'Melukis', activity_date: '2026-10-20', class_teacher_id: 2, activity_images: [image('p')] }]; };
  const album = await source.classAlbumSource(3, 'A1 Matahari', { kind: 'month', year: 2026, month: 10 }, { name: 'TK Ceria', branchName: 'Cabang Utama' }, list);
  assert.deepEqual(paths.sort(), ['activities/?class_id=3&is_publish=true&date_from=2026-10-01&date_to=2026-10-31', 'class-teachers/?class_id=3']);
  assert.deepEqual(album.subject, { kind: 'class', id: 3, name: 'A1 Matahari', initials: 'AM', className: 'Kelas A1 Matahari' });
  assert.equal(source.classSubject(4, 'Kelas B').className, 'Kelas B');
  assert.equal(album.activities[0].teacher, 'Pak Budi');
  assert.match(album.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('months and academic years come back newest first', async () => {
  const source = environment();
  const months = await source.classAlbumMonths(3, async () => [
    { activity_date: '2026-08-03' }, { activity_date: '2026-10-09' }, { activity_date: '2026-10-21' }, { activity_date: '2026-11-01', is_publish: false }, { activity_date: null },
  ]);
  assert.deepEqual(months, [{ year: 2026, month: 10 }, { year: 2026, month: 8 }]);
  const years = await source.academicYearOptions(2, async (p) => { assert.equal(p, 'academic-years/?branch_id=2'); return [
    { id: 1, name: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30' }, { id: 2, name: '2026/2027', start_date: '2026-07-01T00:00:00', end_date: '2027-06-30' }, { id: 3, name: 'incomplete' },
  ]; });
  assert.deepEqual(years.map((year) => year.id), ['2', '1']);
  assert.equal(years[0].start, '2026-07-01');
  assert.deepEqual(await source.academicYearOptions(null, async () => { throw new Error('not called'); }), []);
});
