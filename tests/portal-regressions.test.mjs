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
const session = load('app/api/auth/session/route.ts');
const gate = load('proxy.ts');
const originalFetch = global.fetch;
test.afterEach(() => { global.fetch = originalFetch; });
const json = (value, status = 200) => Response.json(value, { status });
const ctx = (name = 'activities') => ({ params: Promise.resolve({ path: [name] }) });
const req = (cookie = '', method = 'GET', body) => new NextRequest('https://school.test/api/proxy/activities/?class_id=5', {
  method, headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body,
});
const jwt = (seconds) => `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000) + seconds })).toString('base64url')}.signature`;
const user = { id: 1, email: 'admin@example.test', first_name: 'System', last_name: 'Admin', full_name: 'System Admin', role: 'ADMIN', is_active: true, created_at: '2026-09-30T03:05:17Z', updated_at: '2026-09-30T03:05:17Z' };

test('login sets School-only HTTP-only cookies with backend token lifetimes', async () => {
  global.fetch = async () => json({ access: jwt(300), refresh: jwt(86400), user });
  const response = await login.POST(new NextRequest('https://school.test/api/auth/login', { method: 'POST', body: '{}' }));
  assert.equal(response.status, 200);
  const access = response.cookies.get('school_access_token');
  assert(access.httpOnly);
  assert(access.maxAge <= 300 && access.maxAge >= 298);
  assert.equal(response.cookies.get('access_token'), undefined);
  assert(response.cookies.get('school_refresh_token').maxAge <= 86400);
  assert.deepEqual((await response.json()).user, user);
  const storedUser = response.cookies.get('school_user');
  assert(storedUser.httpOnly);
  assert.equal(storedUser.sameSite, 'lax');
  assert(storedUser.maxAge <= 86400 && storedUser.maxAge >= 86398);
  assert.deepEqual(JSON.parse(storedUser.value), user);
});

test('login rejects an incomplete user response without setting session cookies', async () => {
  global.fetch = async () => json({ access: jwt(300), refresh: jwt(86400), user: { id: 1 } });
  const response = await login.POST(new NextRequest('https://school.test/api/auth/login', { method: 'POST', body: '{}' }));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('session metadata retains the role across requests and is not cached', async () => {
  const cookie = `school_refresh_token=valid; school_user=${encodeURIComponent(JSON.stringify(user))}`;
  const response = session.GET(req(cookie));
  assert.deepEqual(await response.json(), { user });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(session.GET(req(`school_user=${encodeURIComponent(JSON.stringify(user))}`)).status, 401);
  assert.deepEqual(await session.GET(req('school_access_token=valid; school_user=invalid')).json(), { user: null });
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
  assert.equal(response.cookies.get('school_user').value, '');
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
  assert.equal(response.cookies.get('school_user').value, '');
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

test('photo tags PATCH the selected image with multiple student IDs', async () => {
  const { saveActivityPhoto } = load('app/dashboard/activities/activityPhotos.ts');
  let captured;
  global.fetch = async (url, init) => {
    captured = { url, ...init };
    return json({ id: 8, image_url: '/photo.jpg', student_id: JSON.parse(init.body).student_id });
  };
  const photo = { id: '8', url: '/photo.jpg', caption: '', studentIds: ['31', '32'], savedStudentIds: [], studentId: '31', savedStudentId: '' };
  const saved = await saveActivityPhoto(4, photo, 0);
  assert.equal(captured.url, '/api/proxy/activity-images/8/');
  assert.equal(captured.method, 'PATCH');
  assert.deepEqual(JSON.parse(captured.body), { student_ids: [31, 32], student_id: 31 });
  assert.deepEqual(saved.studentIds, ['31', '32']);
  await saveActivityPhoto(4, { ...photo, studentIds: [] }, 0);
  assert.deepEqual(JSON.parse(captured.body), { student_ids: [], student_id: null });
});

test('a failed photo save rejects rather than reporting success', async () => {
  const { saveActivityPhoto } = load('app/dashboard/activities/activityPhotos.ts');
  global.fetch = async () => json({ detail: 'Upload unavailable' }, 503);
  await assert.rejects(saveActivityPhoto(4, { id: '8', studentIds: ['31'], savedStudentIds: [], studentId: '31', savedStudentId: '' }, 0), /Upload unavailable/);
});

test('saved activity photos can be deleted through the activity image endpoint', async () => {
  const { deleteActivityPhoto } = load('app/dashboard/activities/activityPhotos.ts');
  let captured;
  global.fetch = async (url, init) => {
    captured = { url, ...init };
    return new Response(null, { status: 204 });
  };
  await deleteActivityPhoto('8');
  assert.equal(captured.url, '/api/proxy/activity-images/8/');
  assert.equal(captured.method, 'DELETE');
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
  const saved = await saveActivityPhoto(42, { id: 'temporary', url: 'blob:preview', caption: '', studentIds: ['32'], savedStudentIds: [], studentId: '32', savedStudentId: '', file }, 2);
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].body, file);
  assert.equal(calls[2].url, '/api/proxy/activity-images/');
  assert.deepEqual(JSON.parse(calls[2].body), { student_ids: [32], student_id: 32, activity_id: 42, image_data: 'fixture/photo.png', position: 2 });
  assert.equal(saved.id, '99');
  assert.equal(saved.file, undefined);
});

test('school profile resolves the logged-in user branch across staff pages', async () => {
  const { loadCurrentBranch } = load('app/dashboard/profile/branchApi.ts');
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    if (url === '/api/auth/session') return json({ user: { id: 12 } });
    if (url === '/api/proxy/staffs/?user=12') return json({ results: [{ user: 2, branch: 99, is_active: true }], next: 'https://backend.test/api/staffs/?page=2' });
    if (String(url).includes('/staffs/?page=2')) return json({ results: [{ user: 12, branch: 3, is_active: true }], next: null });
    if (url === '/api/proxy/branches/3/') return json({ id: 3, name: 'Main Campus', code: 'MAIN', location: { path: [{ name: 'Indonesia' }] } });
    throw new Error(`Unexpected request: ${url}`);
  };
  const branch = await loadCurrentBranch();
  assert.equal(branch.id, 3);
  assert.equal(branch.code, 'MAIN');
  assert.equal(branch.location.path[0].name, 'Indonesia');
  assert.equal(calls[2], '/api/proxy/staffs/?page=2&user=12');
});

test('admin school profile can load every school across paginated results', async () => {
  const { loadSchools } = load('app/dashboard/profile/branchApi.ts');
  const requested = [];
  global.fetch = async (url) => {
    requested.push(String(url));
    if (url === '/api/proxy/schools/') {
      return json({
        results: [{ id: 1, name: 'Harapan Bangsa', is_active: true, branches: [{ id: 11, name: 'Main Campus' }] }],
        next: 'https://backend.test/api/schools/?page=2',
      });
    }
    if (url === '/api/proxy/schools/?page=2') {
      return json({ results: [{ id: 2, name: 'ClassPing Preschool', is_active: true, branches: [] }], next: null });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const schools = await loadSchools();
  assert.deepEqual(schools.map((school) => school.name), ['Harapan Bangsa', 'ClassPing Preschool']);
  assert.equal(schools[0].branches[0].name, 'Main Campus');
  assert.deepEqual(requested, ['/api/proxy/schools/', '/api/proxy/schools/?page=2']);
});

test('school profile does not use another user branch when staff is missing', async () => {
  const { loadCurrentBranch } = load('app/dashboard/profile/branchApi.ts');
  global.fetch = async (url) => url === '/api/auth/session' ? json({ user: { id: 1 } })
    : json({ results: [{ user: 2, branch: 99, is_active: true }], next: null });
  await assert.rejects(loadCurrentBranch(), /Tidak ada cabang/);
});

test('school profile saves supported branch fields through PATCH and surfaces failures', async () => {
  const { saveBranch } = load('app/dashboard/profile/branchApi.ts');
  const fields = { name: 'Updated Campus', code: 'MAIN', address: 'Bandung', phone: '0221234567', email: 'main@example.test' };
  global.fetch = async (url, init) => {
    assert.equal(url, '/api/proxy/branches/3/');
    assert.equal(init.method, 'PATCH');
    assert.deepEqual(JSON.parse(init.body), fields);
    return json({ id: 3, ...fields });
  };
  assert.equal((await saveBranch(3, fields)).name, fields.name);
  global.fetch = async () => json({}, 500);
  await assert.rejects(saveBranch(3, fields), /Gagal/);
});

test('editing own profile forwards only names and refreshes session user metadata', async () => {
  const profileApi = load('app/api/auth/profile/route.ts');
  const token = `header.${Buffer.from(JSON.stringify({ user_id: '1', exp: Math.floor(Date.now()/1000) + 300 })).toString('base64url')}.signature`;
  const updated = { ...user, first_name: 'New', last_name: 'Name', full_name: 'New Name' };
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, ...init });
    return init.method === 'PATCH' ? json({ first_name: 'New', last_name: 'Name' }) : json(updated);
  };
  const response = await profileApi.PATCH(new NextRequest('https://school.test/api/auth/profile', {
    method: 'PATCH', headers: { cookie: `school_access_token=${token}; school_refresh_token=${jwt(86400)}` },
    body: JSON.stringify({ first_name: ' New ', last_name: 'Name', id: 99, role: 'ADMIN', email: 'other@example.test' }),
  }));
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, 'https://backend.test/api/users/1/');
  assert.deepEqual(JSON.parse(calls[0].body), { first_name: 'New', last_name: 'Name' });
  assert.equal(calls[1].method, 'GET');
  assert.deepEqual((await response.json()).user, updated);
  assert.deepEqual(JSON.parse(response.cookies.get('school_user').value), updated);
});

test('profile update rejection preserves existing session metadata', async () => {
  const profileApi = load('app/api/auth/profile/route.ts');
  const token = `header.${Buffer.from(JSON.stringify({ user_id: '1' })).toString('base64url')}.signature`;
  global.fetch = async () => json({ detail: 'Permission denied' }, 403);
  const response = await profileApi.PATCH(new NextRequest('https://school.test/api/auth/profile', {
    method: 'PATCH', headers: { cookie: `school_access_token=${token}` },
    body: JSON.stringify({ first_name: 'New', last_name: 'Name' }),
  }));
  assert.equal(response.status, 403);
  assert.equal(response.cookies.get('school_user'), undefined);
});

test('staff account profile selects the matching user even on later pages', async () => {
  const { loadStaffProfile } = load('app/dashboard/user-profile/staffProfileApi.ts');
  global.fetch = async (url) => String(url).includes('page=2')
    ? json({ results: [{ id: 5, user: 12, branch: 1, is_active: true, phone: '080989999' }], next: null })
    : json({ results: [{ id: 1, user: 2, branch: 99, is_active: true }], next: 'https://backend.test/api/staffs/?page=2' });
  const staff = await loadStaffProfile(12);
  assert.equal(staff.id, 5);
  assert.equal(staff.phone, '080989999');
  global.fetch = async () => json({ results: [{ id: 1, user: 2, branch: 99, is_active: true }], next: null });
  await assert.rejects(loadStaffProfile(12), /tidak ditemukan/);
});

test('staff account edits PATCH the staff ID and preserve account and branch links', async () => {
  const { saveStaffProfile } = load('app/dashboard/user-profile/staffProfileApi.ts');
  const staff = { id: 5, user: 12, branch: 1 };
  const fields = { first_name: 'Soraya', last_name: 'Staff', email: 'soraya@example.test', phone: '080989999', hire_date: '2024-10-06', qualification: 'S1' };
  global.fetch = async (url, init) => {
    assert.equal(url, '/api/proxy/staffs/5/');
    assert.equal(init.method, 'PATCH');
    assert.deepEqual(JSON.parse(init.body), { branch: 1, user: 12, ...fields });
    return json({ ...staff, ...fields });
  };
  assert.equal((await saveStaffProfile(staff, fields)).email, fields.email);
  global.fetch = async () => json({ email: ['Email already exists'] }, 400);
  await assert.rejects(saveStaffProfile(staff, fields), /Email already exists/);
});
