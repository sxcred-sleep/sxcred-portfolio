// Local integration test. Creates its own temporary work and removes it again.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const base = process.env.TEST_ORIGIN || 'http://localhost:3000';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Use a local test server.');
const password = readFileSync(new URL('../.admin-password.local.txt', import.meta.url), 'utf8').trim().split(/\r?\n/).at(-1);
let cookie = ''; let workId;
async function request(path, { authenticated = true, ...options } = {}) {
  return fetch(`${base}${path}`, { ...options, headers: { Origin: base, ...(authenticated && cookie ? { Cookie: cookie } : {}), ...options.headers } });
}
async function save(work) {
  const response = await request('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(work) });
  assert.equal(response.status, 200, await response.clone().text());
  return (await response.json()).project;
}
try {
  assert.equal((await request('/api/admin/projects', { authenticated: false })).status, 401);
  const forgedOrigin = await request('/api/admin/session', { method: 'POST', headers: { Origin: 'https://other.example' }, body: JSON.stringify({ password }) });
  assert.equal(forgedOrigin.status, 403);
  const wrong = await request('/api/admin/session', { method: 'POST', body: JSON.stringify({ password: 'wrong-password' }) });
  assert.equal(wrong.status, 401);
  const login = await request('/api/admin/session', { method: 'POST', body: JSON.stringify({ password }) });
  assert.equal(login.status, 200, await login.clone().text());
  const setCookie = login.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/);
  cookie = setCookie.split(';')[0];
  const invalid = await request('/api/admin/uploads?name=fake.png', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: '<script>alert(1)</script>' });
  assert.equal(invalid.status, 415);
  const upload = await request('/api/admin/uploads?name=verification.webp', { method: 'POST', body: readFileSync(new URL('../public/media/cat-transparent-poster.webp', import.meta.url)) });
  assert.equal(upload.status, 201, await upload.clone().text());
  const { media } = await upload.json();
  assert.equal((await request(media.src, { authenticated: false })).status, 404);
  assert.equal((await request(media.src)).status, 200);
  const videoUpload = await request('/api/admin/uploads?name=verification.mp4', { method: 'POST', body: readFileSync(new URL('../public/media/cat.mp4', import.meta.url)) });
  assert.equal(videoUpload.status, 201);
  const video = (await videoUpload.json()).media;
  assert.equal(video.type, 'video');
  const original = { title: 'Проверка загрузки — временная работа', category: 'ТЕСТ', year: '2026', client: '', description: 'Автоматическая проверка', layout: 'featured', images: [media, video], status: 'draft' };
  const work = await save(original); workId = work.id;
  const list = await request('/api/admin/projects');
  assert.ok((await list.json()).projects.some(project => project.id === work.id));
  assert.equal((await request(media.src, { authenticated: false })).status, 404);
  await save({ ...work, status: 'published' });
  const publicMedia = await request(media.src, { authenticated: false });
  assert.equal(publicMedia.status, 200); assert.equal(publicMedia.headers.get('content-type'), 'image/webp');
  const home = await request('/', { authenticated: false }); assert.equal(home.status, 200);
  assert.ok((await home.text()).includes(work.id), 'Published work must appear in the public homepage');
  const range = await request(media.src, { authenticated: false, headers: { Range: 'bytes=0-15' } });
  assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 16);
  const videoRange = await request(video.src, { authenticated: false, headers: { Range: 'bytes=0-1023' } });
  assert.equal(videoRange.status, 206); assert.equal(videoRange.headers.get('content-type'), 'video/mp4');
  assert.equal((await videoRange.arrayBuffer()).byteLength, 1024);
  assert.equal((await request(media.src, { authenticated: false, headers: { Range: 'bytes=999999999-' } })).status, 416);
  await save({ ...work, status: 'draft', title: 'Проверка редактирования' });
  assert.equal((await request(media.src, { authenticated: false })).status, 404);
  const removed = await request('/api/admin/projects', { method: 'DELETE', body: JSON.stringify({ id: work.id }) }); assert.equal(removed.status, 200); workId = undefined;
  const logout = await request('/api/admin/session', { method: 'DELETE' }); assert.equal(logout.status, 200);
  assert.equal((await request('/api/admin/projects')).status, 401, 'Revoked session must stop working');
  console.log('PASS: password login, origin protection, private drafts, validated upload, persistence, edit, publish, homepage, media range, unpublish, delete, logout.');
} finally {
  if (workId) await request('/api/admin/projects', { method: 'DELETE', body: JSON.stringify({ id: workId }) });
}
