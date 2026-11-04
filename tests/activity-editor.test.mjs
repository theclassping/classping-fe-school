import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const originalFetch = global.fetch;
const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
test.after(() => { Object.defineProperty(globalThis, 'navigator', navigatorDescriptor); });
test.afterEach(() => { global.fetch = originalFetch; navigator.onLine = true; });
function environment() {
  let stored;
  const store = { writeDraft: async value => { stored = structuredClone(value); }, removeDraft: async () => { stored = undefined; } };
  const modules = new Map();
  function load(name) {
    const filename = path.isAbsolute(name) ? `${name}.ts` : path.join(root, 'app/dashboard/activities', `${name}.ts`);
    if (name === 'activityDraftStore') return store;
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} }; modules.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(id => id.startsWith('@/') ? load(path.join(root, id.slice(2))) : id.startsWith('.') ? load(id.slice(2)) : require(id), module, module.exports);
    return module.exports;
  }
  const state = load('activityEditorState');
  const { ActivityDraftController } = load('ActivityDraftController');
  const draft = { ...state.emptyDraft(), title: 'Paper cutting', classId: '1', teacherId: '2', version: 1 };
  const controller = new ActivityDraftController('user:activity', draft, () => {});
  return { state, controller, draft, stored: () => stored, ActivityDraftController };
}
function server(draft, extra = {}) { return { id: 17, revision: 1, workflow_version: 2, activity_images: [], is_publish: false, ...draft, ...extra }; }
const photo = (studentId, index = studentId) => ({ key: `photo-${index}`, tagState: studentId ? 'individual' : 'group', studentId: String(studentId || ''), upload: 'complete', imageData: { object_key: `photo-${index}.jpg` }, caption: '' });

test('ten photos require seven remarks, preserve participants, and keep group photos explicit', () => {
  const { state, draft } = environment();
  draft.photos = [...Array.from({ length: 7 }, (_, i) => photo(i+1)), ...Array.from({ length: 3 }, (_, i) => photo(null, i+8))];
  draft.participants = ['12'];
  assert(state.reportIssues(draft).some(text => text.includes('catatan')));
  draft.remarks = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i+1), `Observation ${i+1}`]));
  assert.deepEqual(state.reportIssues(draft), []);
  const body = state.reportPayload(draft, true, 'save');
  assert.equal(body.activity_images.length, 10);
  assert.equal(body.activity_images.filter(p => p.tag_state === 'group' && p.student_id === null).length, 3);
  assert.equal(body.student_remarks.filter(r => r.remark).length, 7);
  assert.deepEqual(body.student_ids, [12,1,2,3,4,5,6,7]);
});
test('repeated photos share one student remark; retagging never copies it to another student', () => {
  const { state, draft } = environment();
  draft.photos = [photo(1,1), photo(1,2)]; draft.remarks = { '1': 'Mark cuts carefully.' };
  assert.equal(state.reportPayload(draft, false, 'save').student_remarks.length, 1);
  draft.photos[1].studentId = '2';
  assert.equal(state.reportPayload(draft, false, 'save').student_remarks.find(r => r.student_id === 2).remark, '');
  assert(state.reportIssues(draft).some(text => text.includes('catatan')));
  draft.photos[1].tagState = 'unreviewed'; draft.photos[1].studentId = '';
  assert(state.reportIssues(draft).some(text => text.includes('Foto bersama')));
});
test('changes made during a delayed save survive and the next write uses the acknowledged revision', async () => {
  const { controller: c } = environment();
  let release, started;
  const startedPromise = new Promise(resolve => { started = resolve; });
  const bodies = [];
  global.fetch = async (url, init) => {
    bodies.push(JSON.parse(init.body));
    if (bodies.length === 1) { started(); await new Promise(resolve => { release = resolve; }); }
    return Response.json(server({}, { revision: bodies.length }));
  };
  const first = c.sync(); await startedPromise;
  c.change(d => ({ ...d, title: 'Latest title' }));
  release(); await first;
  assert.equal(c.draft.title, 'Latest title');
  await c.sync();
  assert.equal(bodies[1].name, 'Latest title');
  assert.equal(bodies[1].expected_revision, 1);
  assert.equal(c.draft.syncedVersion, c.draft.version);
  c.dispose();
});
test('offline incomplete drafts persist without sending requests', async () => {
  const { controller: c, stored } = environment();
  navigator.onLine = false;
  c.draft.title = ''; c.draft.expanded = 'last-photo';
  global.fetch = async () => { assert.fail('must not send while offline'); };
  await c.sync();
  assert.equal(stored().draft.title, ''); assert.equal(stored().draft.expanded, 'last-photo');
  c.dispose();
});
test('an ambiguous save can be recovered and replayed with the exact same request identity', async () => {
  const { controller: c, stored, ActivityDraftController } = environment();
  let originalBody;
  global.fetch = async (url, init) => { originalBody = init.body; throw new TypeError('Network interrupted after commit'); };
  await assert.rejects(c.sync(), /Network interrupted/); await c.flushLocal(); c.dispose();
  const recovery = stored();
  const resumed = new ActivityDraftController(recovery.key, recovery.draft, () => {}, recovery.pending);
  global.fetch = async (url, init) => { assert.equal(init.body, originalBody); return Response.json(server({})); };
  await resumed.sync(); assert.equal(resumed.draft.activityId, 17); assert.equal(resumed.pending, undefined); resumed.dispose();
});
test('revision conflicts retain local edits and stop automatic overwrites', async () => {
  const { controller: c, stored } = environment();
  c.draft.activityId = 17; c.draft.revision = 1;
  let calls = 0;
  global.fetch = async () => { calls++; return Response.json({ detail: 'Newer server version' }, { status: 409 }); };
  await assert.rejects(c.sync(), /Newer server version/); await c.flushLocal();
  assert.equal(c.conflict, true); assert.equal(stored().draft.title, 'Paper cutting');
  await assert.rejects(c.sync(), /versi server/); assert.equal(calls, 1); c.dispose();
});
test('publishing waits for uploads and remarks, while saving a draft remains possible', async () => {
  const { controller: c } = environment();
  c.draft.photos = [{ ...photo(1), upload: 'pending' }];
  let calls = 0;
  global.fetch = async () => { calls++; return Response.json(server({})); };
  await assert.rejects(c.sync(true), /unggahan/); assert.equal(calls, 0);
  await c.sync(); assert.equal(calls, 1); c.dispose();
});
test('autosave starts after one second idle', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller: c } = environment();
  let calls = 0;
  global.fetch = async () => { calls++; return Response.json(server({})); };
  c.change(d => ({ ...d, title: 'Idle save' }));
  t.mock.timers.tick(999); assert.equal(c.saving, false); assert.equal(calls, 0);
  t.mock.timers.tick(1); assert.equal(c.saving, true);
  await c.sync(); assert.equal(calls, 1); c.dispose();
});
test('continuous editing still starts a save at the five-second deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { controller: c } = environment();
  let calls = 0;
  global.fetch = async () => { calls++; return Response.json(server({})); };
  c.change(d => ({ ...d, title: 'Typing' }));
  for (let i=0; i<9; i++) { t.mock.timers.tick(500); c.change(d => ({ ...d, title: d.title + '.' })); }
  assert.equal(c.saving, false); assert.equal(calls, 0);
  t.mock.timers.tick(500); assert.equal(c.saving, true);
  await c.sync(); assert.equal(calls, 1); c.dispose();
});
test('removing a new photo during its initial save queues deletion of the acknowledged server photo', async () => {
  const { controller: c } = environment();
  c.draft.photos = [photo(null,1)];
  let release, started;
  const startedPromise = new Promise(resolve => { started = resolve; });
  const bodies=[];
  global.fetch = async (url, init) => {
    const body=JSON.parse(init.body); bodies.push(body);
    if(bodies.length===1) { started(); await new Promise(resolve => { release=resolve; }); }
    return Response.json(server({}, {revision:bodies.length, activity_images:bodies.length===1?[{id:5,client_id:'photo-1'}]:[]}));
  };
  const first=c.sync(); await startedPromise;
  c.change(d => ({...d,photos:[]})); release(); await first;
  assert.deepEqual(c.draft.removedPhotoIds,[5]);
  await c.sync();
  assert(bodies[1].activity_images.some(p => p.id===5 && p._destroy));
  c.dispose();
});
test('new photos learn their ids from the file key when the API does not echo client_id, so later saves never recreate them', async () => {
  const { controller: c } = environment();
  c.draft.photos = [{ ...photo(null,1), imageData: undefined, uploadKey: 'media/one.jpg' }, { ...photo(null,2), imageData: undefined, uploadKey: 'media/two.jpg' }];
  const bodies=[];
  global.fetch = async (url, init) => {
    bodies.push(JSON.parse(init.body));
    return Response.json(server({}, {revision:bodies.length, activity_images:[
      {id:8,image_data:{id:'media/two.jpg',object_key:'media/two.jpg'}},{id:7,image_data:{id:'media/one.jpg',object_key:'media/one.jpg'}},
    ]}));
  };
  await c.sync();
  assert.deepEqual(c.draft.photos.map(p => p.id), [7,8]);
  assert.deepEqual(c.draft.removedPhotoIds, []);
  c.change(d => ({...d, title: 'Paper cutting II'}));
  await c.sync();
  assert(bodies[1].activity_images.every(p => p.id && !p.client_id && !p.image_data));
  c.dispose();
});
test('focused editor keeps the selected photo when reordered and restores its position from a saved draft', async () => {
  const {state, controller:c, stored} = environment();
  c.draft.photos=Array.from({length:40},(_,i)=>photo(null,i+1));
  c.change(d=>state.selectReportPhoto(d,37),false,false);
  await c.flushLocal();
  assert.equal(state.activePhotoIndex(stored().draft),37);
  assert.equal(c.draft.version,1,'navigation is local UI state, not a report content edit');
  const selected=c.draft.expanded;
  c.draft.photos.reverse();
  assert.equal(c.draft.photos[state.activePhotoIndex(c.draft)].key,selected);
  c.dispose();
});
test('removing the focused photo selects its neighbour and preserves other student remarks',()=>{
  const {state,draft}=environment();
  draft.photos=[{...photo(1,1),id:1},{...photo(2,2),id:2},{...photo(3,3),id:3}];
  draft.remarks={'1':'Mark remark','2':'Sarah remark','3':'Alya remark'};
  const selected=state.selectReportPhoto(draft,1);
  const removed=state.removeReportPhoto(selected,'photo-2');
  assert.equal(removed.expanded,'photo-3');
  assert.deepEqual(removed.removedPhotoIds,[2]);
  assert.equal(removed.remarks['2'],'Sarah remark');
  const last=state.removeReportPhoto(removed,'photo-3');
  assert.equal(last.expanded,'photo-1');
  const empty=state.removeReportPhoto(last,'photo-1');
  assert.equal(state.activePhotoIndex(empty),-1);
  assert.equal(empty.expanded,'');
});
