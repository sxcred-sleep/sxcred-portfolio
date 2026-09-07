// Exercises only the local database and restores the original roster.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const base = process.env.TEST_ORIGIN || 'http://localhost:3000';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Use a local test server.');
const password = readFileSync(new URL('../.admin-password.local.txt', import.meta.url), 'utf8').trim().split(/\r?\n/).at(-1);
let cookie = ''; let original; let changed = false;
async function request(path, { authenticated = true, ...options } = {}) {
  return fetch(base + path, { ...options, headers: { Origin: base, ...(authenticated && cookie ? { Cookie: cookie } : {}), ...options.headers } });
}
async function save(clients, revision, status = 200) {
  const response = await request('/api/admin/clients', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clients, revision }) });
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}
try {
  assert.equal((await request('/api/admin/clients', { authenticated: false })).status, 401);
  const login = await request('/api/admin/session', { method: 'POST', body: JSON.stringify({ password }) });
  assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0];
  original = await (await request('/api/admin/clients')).json();
  assert.ok(Array.isArray(original.clients));
  const upload = await request('/api/admin/uploads?purpose=avatar&name=avatar-test.webp', { method: 'POST', body: readFileSync(new URL('../public/media/cat-transparent-poster.webp', import.meta.url)) });
  assert.equal(upload.status, 201); const { media } = await upload.json();
  assert.equal((await request(media.src, { authenticated: false })).status, 404);
  const video = await request('/api/admin/uploads?purpose=avatar&name=bad.mp4', { method: 'POST', body: readFileSync(new URL('../public/media/cat.mp4', import.meta.url)) });
  assert.equal(video.status, 400);
  const test = { id: crypto.randomUUID(), name: 'sxcred-roster-check', category: 'Стример', workType: 'Оформление канала', link: 'https://example.com/channel', avatarId: media.id };
  await save([{ ...test, link: 'javascript:alert(1)' }], original.revision, 400);
  const forbidden = await request('/api/admin/clients', { method: 'PUT', headers: { Origin: 'https://other.example' }, body: JSON.stringify({ clients: [test], revision: original.revision }) });
  assert.equal(forbidden.status, 403);
  let saved = await save([test], original.revision); changed = true;
  assert.equal(saved.clients[0].avatar, media.src);
  assert.equal((await request(media.src, { authenticated: false })).status, 200);
  let home = await (await request('/', { authenticated: false })).text();
  assert.ok(home.includes(test.name)); assert.ok(home.includes(test.link)); assert.ok(home.includes(media.src));
  await save([test], original.revision, 409);
  const second = { ...test, id: crypto.randomUUID(), name: 'second-roster-check', avatarId: null, link: null };
  saved = await save([second, test], saved.revision);
  const reloaded = await (await request('/api/admin/clients')).json();
  assert.deepEqual(reloaded.clients.map(c => c.id), [second.id, test.id]);
  saved = await save([{ ...second, name: 'edited-roster-check' }], saved.revision);
  assert.equal((await request(media.src, { authenticated: false })).status, 404, 'Removed avatars must become private');
  saved = await save([], saved.revision);
  assert.equal((await (await request('/api/admin/clients')).json()).clients.length, 0);
  home = await (await request('/', { authenticated: false })).text();
  assert.ok(!home.includes(test.name)); assert.ok(!home.includes('blindzonexgod'), 'An intentionally empty roster must not reset to defaults');
  await save(original.clients, saved.revision); changed = false;
  console.log('PASS: authentication, initial roster, avatar upload/privacy, video rejection, URL validation, origin protection, save, homepage, reorder, edit, remove, empty list, concurrent edit protection. Original roster restored.');
} finally {
  if (changed && original) {
    const current = await (await request('/api/admin/clients')).json();
    await save(original.clients, current.revision);
  }
  if (cookie) await request('/api/admin/session', { method: 'DELETE' });
}
