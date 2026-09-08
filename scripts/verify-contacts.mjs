// Local integration check. Restores original contact values after testing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const base = process.env.TEST_ORIGIN || 'http://localhost:3000';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Use a local test server.');
const password = readFileSync(new URL('../.admin-password.local.txt', import.meta.url), 'utf8').trim().split(/\r?\n/).at(-1);
let cookie = ''; let original; let changed = false;
async function request(path, { authenticated = true, ...options } = {}) {
  return fetch(base + path, { ...options, headers: { Origin: base, ...(authenticated && cookie ? { Cookie: cookie } : {}), ...options.headers } });
}
async function save(contacts, revision, status = 200) {
  const response = await request('/api/admin/contacts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contacts, revision }) });
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}
try {
  assert.equal((await request('/api/admin/contacts', { authenticated: false })).status, 401);
  assert.equal((await request('/api/admin/contacts', { authenticated: false, method: 'PUT', body: '{}' })).status, 401);
  const login = await request('/api/admin/session', { method: 'POST', body: JSON.stringify({ password }) });
  assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0];
  original = await (await request('/api/admin/contacts')).json();
  assert.ok(original.contacts.some(c => c.label === 'Twitch'));
  const contacts = original.contacts.map(c => ({ ...c, url: c.label === 'Discord' ? 'test_discord.user' : c.label === 'Email' ? 'mailto:contacts-check@example.com' : `https://example.com/contacts-check/${c.label}` }));
  await save(contacts.map(c => c.label === 'Discord' ? { ...c, url: 'javascript:alert(1)' } : c), original.revision, 400);
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'https://user:pass@example.com', 'https://exa\nmple.com']) {
    await save(contacts.map((c, i) => i === 0 ? { ...c, url } : c), original.revision, 400);
  }
  await save([], original.revision, 400);
  await save(contacts, -1, 400);
  const forbidden = await request('/api/admin/contacts', { method: 'PUT', headers: { Origin: 'https://other.example' }, body: JSON.stringify({ contacts, revision: original.revision }) });
  assert.equal(forbidden.status, 403);
  let saved = await save(contacts, original.revision); changed = true;
  assert.deepEqual((await (await request('/api/admin/contacts')).json()).contacts, contacts);
  let home = await (await request('/', { authenticated: false })).text();
  for (const c of contacts.filter(c => c.label !== 'Discord')) assert.ok(home.includes(`href="${c.url}"`));
  assert.ok(home.includes('aria-label="Скопировать Discord"'));
  assert.ok(!home.includes('href="test_discord.user"'));
  assert.ok(home.includes('Я Миля.'));
  assert.ok(home.includes('https://steamcommunity.com/profiles/76561199395835195'));
  for (const path of ['/media/invoker.png', '/media/immortal.png']) {
    assert.ok(home.includes(path));
    const asset = await request(path, { authenticated: false });
    assert.equal(asset.status, 200); assert.match(asset.headers.get('content-type'), /image\/png/);
  }
  await save(contacts, original.revision, 409);
  saved = await save(contacts.map(c => ({ ...c, url: '' })), saved.revision);
  assert.ok(saved.contacts.every(c => c.url === null));
  home = await (await request('/', { authenticated: false })).text();
  assert.ok(!home.includes('href="https://example.com/contacts-check/'));
  assert.ok(home.includes('Контакты появятся здесь чуть позже.'));
  await save(original.contacts, saved.revision); changed = false;
  console.log('PASS: auth, origin, invalid URLs, save/reload, public links, mailto, chapter 04/assets, conflict protection, cleared links. Original contacts restored.');
} finally {
  if (changed && original) {
    const current = await (await request('/api/admin/contacts')).json();
    await save(original.contacts, current.revision);
  }
  if (cookie) await request('/api/admin/session', { method: 'DELETE' });
}
