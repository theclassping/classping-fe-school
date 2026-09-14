import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { NextRequest } from 'next/server.js';
const nodeRequire = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the actual TypeScript handlers without starting Next or contacting a backend.
const root = path.resolve(__dirname, '..');
const modules = new Map();
function load(relative) {
  const filename = path.resolve(root, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const loadedModule = { exports: {} };
  modules.set(filename, loadedModule);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (id) => id.startsWith('@/') ? load(`${id.slice(2)}.ts`)
    : id.startsWith('.') ? load(`${path.resolve(path.dirname(filename), id)}.ts`) : nodeRequire(id);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
process.env.DJANGO_API_URL = 'https://backend.test';
const api = load('app/api/proxy/[...path]/route.ts');
const login = load('app/api/auth/login/route.ts');
const logout = load('app/api/auth/logout/route.ts');
const gate = load('proxy.ts');
const originalFetch = global.fetch;
test.afterEach(() => { global.fetch = originalFetch; });
const json = (value, status = 200) => Response.json(value, { status });
const ctx = (name = 'activities') => ({ params: Promise.resolve({ path: [name] }) });
const req = (cookie = '', method = 'GET', body) => new NextRequest('https://school.test/api/proxy/activities/?class_id=5', {
  method, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body,
});
const jwt = (seconds) => `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000) + seconds })).toString('base64url')}.signature`;

test('login sets School-only HTTP-only cookies with backend token lifetimes', async () => {
  global.fetch = async () => json({ access: jwt(300), refresh: jwt(86400) });
  const response = await login.POST(new NextRequest('https://school.test/api/auth/login', { method: 'POST', body: '{}' }));
  assert.equal(response.status, 200);
  const access = response.cookies.get('school_access_token');
  assert(access.httpOnly);
  assert(access.maxAge <= 300 && access.maxAge >= 298);
  assert.equal(response.cookies.get('access_token'), undefined);
  assert(response.cookies.get('school_refresh_token').maxAge <= 86400);
});

test('expired access refreshes once and retries PATCH with the same body and query', async () => {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, ...init });
    if (String(url).includes('/auth/refresh/')) return json({ access: 'renewed-access', refresh: 'rotated-refresh' });
    return init.headers.get('Authorization') === 'Bearer renewed-access' ? json({ id: 8 }) : json({}, 401);
  };
  const body = JSON.stringify({ branch: 7 });
  const response = await api.PATCH(req('school_access_token=expired; school_refresh_token=valid', 'PATCH', body), ctx());
  assert.equal(response.status, 200);
  assert.equal(calls.length, 3);
  assert.equal(Buffer.from(calls[0].body).toString(), body);
  assert.equal(Buffer.from(calls[2].body).toString(), body);
  assert.match(calls[2].url, /class_id=5/);
  assert.equal(response.cookies.get('school_refresh_token').value, 'rotated-refresh');
});

test('an expired access cookie can be renewed from refresh alone, including page navigation', async () => {
  const calls = [];
  global.fetch = async (url) => { calls.push(url); return String(url).includes('/auth/refresh/') ? json({ access: 'renewed' }) : json([]); };
  const response = await api.GET(req('school_refresh_token=valid'), ctx());
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  const page = gate.proxy(new NextRequest('https://school.test/dashboard/settings', { headers: { cookie: 'school_refresh_token=valid' } }));
  assert.equal(page.headers.get('location'), null);
  assert.equal(response.cookies.get('school_refresh_token'), undefined, 'do not extend an unrotated refresh lifetime');
});

test('invalid refresh clears only School cookies and returns 401', async () => {
  global.fetch = async () => json({ detail: 'invalid' }, 401);
  const response = await api.GET(req('school_refresh_token=invalid; access_token=guardian'), ctx());
  assert.equal(response.status, 401);
  assert.equal(response.cookies.get('school_access_token').value, '');
  assert.equal(response.cookies.get('access_token'), undefined);
});

test('temporary refresh outage keeps the session and returns 502', async () => {
  global.fetch = async () => json({}, 503);
  const response = await api.GET(req('school_refresh_token=valid'), ctx());
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('forbidden requests do not refresh or log the user out', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; return json({}, 403); };
  const response = await api.GET(req('school_access_token=valid; school_refresh_token=valid'), ctx());
  assert.equal(response.status, 403);
  assert.equal(calls, 1);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('concurrent renewals share one in-flight refresh per server instance', async () => {
  let refreshes = 0;
  global.fetch = async (url) => {
    if (String(url).includes('/auth/refresh/')) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return json({ access: 'renewed' });
    }
    return json([]);
  };
  const responses = await Promise.all(Array.from({ length: 4 }, () => api.GET(req('school_refresh_token=parallel'), ctx())));
  assert(responses.every((response) => response.status === 200));
  assert.equal(refreshes, 1);
});

test('Guardian cookies alone cannot authorize School requests', async () => {
  global.fetch = async () => { throw new Error('must not forward'); };
  const response = await api.GET(req('access_token=guardian; refresh_token=guardian'), ctx());
  assert.equal(response.status, 401);
  const page = gate.proxy(new NextRequest('https://school.test/dashboard', { headers: { cookie: 'access_token=guardian' } }));
  assert.equal(page.headers.get('location'), 'https://school.test/login');
});

test('logout clears School cookies without overwriting Guardian cookies', async () => {
  global.fetch = async () => json({});
  const response = await logout.POST(req('school_refresh_token=valid'));
  assert.equal(response.cookies.get('school_refresh_token').value, '');
  assert.equal(response.cookies.get('refresh_token'), undefined);
});

test('activity normalization reads actual API photo, student, and publication fields', () => {
  const { normalizeActivities } = load('app/dashboard/activities/activityApi.ts');
  const [activity] = normalizeActivities([{ id: 4, is_publish: false, activity_images: [{ id: 8 }, { id: 9 }], activity_students: [{ first_name: 'Siswa', last_name: 'Contoh' }] }]);
  assert.equal(activity.photos, 2);
  assert.deepEqual(activity.participants, ['Siswa Contoh']);
  assert.equal(activity.status, 'Draf');
  const { normalizeActivityStudents } = load('app/dashboard/activities/activityStudents.ts');
  assert.deepEqual(normalizeActivityStudents([{ id: 901, student_id: 31, student_name: 'Contoh' }]), [{ id: '31', name: 'Contoh' }]);
});

test('photo tags PATCH the selected image with the student ID, including clearing a tag', async () => {
  const { saveActivityPhoto } = load('app/dashboard/activities/activityPhotos.ts');
  let captured;
  global.fetch = async (url, init) => {
    captured = { url, ...init };
    return json({ id: 8, image_url: '/photo.jpg', student_id: JSON.parse(init.body).student_id });
  };
  const photo = { id: '8', url: '/photo.jpg', caption: '', studentId: '31', savedStudentId: '' };
  const saved = await saveActivityPhoto(4, photo, 0);
  assert.equal(captured.url, '/api/proxy/activity-images/8/');
  assert.equal(captured.method, 'PATCH');
  assert.deepEqual(JSON.parse(captured.body), { student_id: 31 });
  assert.equal(saved.savedStudentId, '31');
  await saveActivityPhoto(4, { ...photo, studentId: '' }, 0);
  assert.deepEqual(JSON.parse(captured.body), { student_id: null });
});

test('a failed photo save rejects rather than reporting success', async () => {
  const { saveActivityPhoto } = load('app/dashboard/activities/activityPhotos.ts');
  global.fetch = async () => json({ detail: 'Upload unavailable' }, 503);
  await assert.rejects(saveActivityPhoto(4, { id: '8', studentId: '31', savedStudentId: '' }, 0), /Upload unavailable/);
});

test('new photos upload before creating the image record with its selected student', async () => {
  const { saveActivityPhoto } = load('app/dashboard/activities/activityPhotos.ts');
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, ...init });
    if (url === '/api/proxy/media/presign/') return json({ file_key: 'fixture/photo.png', presigned_url: 'https://upload.test/photo' });
    if (url === 'https://upload.test/photo') return new Response(null, { status: 200 });
    return json({ id: 99, student_id: 32, image_url: '/saved-photo.png' });
  };
  const file = new File(['fixture-image'], 'photo.png', { type: 'image/png' });
  const saved = await saveActivityPhoto(42, { id: 'temporary', url: 'blob:preview', caption: '', studentId: '32', savedStudentId: '', file }, 2);
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].body, file);
  assert.equal(calls[2].url, '/api/proxy/activity-images/');
  assert.deepEqual(JSON.parse(calls[2].body), { student_id: 32, activity_id: 42, image_data: 'fixture/photo.png', position: 2 });
  assert.equal(saved.id, '99');
  assert.equal(saved.file, undefined);
});
