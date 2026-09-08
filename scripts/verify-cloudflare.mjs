// Isolated, ephemeral D1/R2: never connects to the production account.
import assert from 'node:assert/strict';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const root = fileURLToPath(new URL('..', import.meta.url));
const password = randomBytes(24).toString('hex');
const salt = randomBytes(16).toString('hex');
const hash = `${salt}:${pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')}`;
const config = JSON.parse(await readFile(new URL('../dist/server/wrangler.json', import.meta.url), 'utf8'));
const mf = new Miniflare(convertV4MiniflareOptions({
  rootPath: root,
  name: 'cpu-regression',
  modules: true,
  scriptPath: 'dist/server/index.js',
  compatibilityDate: config.compatibility_date,
  compatibilityFlags: config.compatibility_flags,
  bindings: { ADMIN_PASSWORD_HASH: hash },
  d1Databases: ['DB'], r2Buckets: ['MEDIA'],
  assets: {
    routerConfig: { has_user_worker: true },
    directory: 'dist/client', binding: 'ASSETS',
    run_worker_first: config.assets.run_worker_first,
    assetConfig: { not_found_handling: config.assets.not_found_handling },
  },
}));
let cookie = '';
async function request(path, options = {}, authenticated = true) {
  return mf.dispatchFetch(`http://localhost${path}`, {
    ...options,
    headers: { Origin: 'http://localhost', ...(authenticated && cookie ? { Cookie: cookie } : {}), ...options.headers },
  });
}
async function json(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}
try {
  const db = await mf.getD1Database('DB');
  for (const file of (await readdir(new URL('../drizzle/', import.meta.url))).filter(file => file.endsWith('.sql')).sort()) {
    const sql = await readFile(new URL(`../drizzle/${file}`, import.meta.url), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint').filter(part => part.trim())) await db.prepare(statement).run();
  }
  for (const path of ['/', '/admin', '/admin/clients', '/admin/contacts']) {
    const response = await request(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('id="root"'));
    assert.ok(!html.includes('__next_f'));
    for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
      const asset = await request(match[1]);
      assert.equal(asset.status, 200);
      assert.ok(!asset.headers.get('content-type').includes('text/html'));
      await asset.arrayBuffer();
    }
  }
  await json(await request('/api/missing'), 404);
  assert.equal((await request('/api/public', { method: 'POST' })).status, 405);
  assert.ok(Array.isArray((await json(await request('/api/public'))).projects));
  assert.equal((await request('/api/admin/uploads', { method: 'POST', body: 'invalid' }, false)).status, 401);
  assert.equal((await request('/api/admin/session', { method: 'POST', body: JSON.stringify({ password }), headers: { Origin: 'https://other.example' } })).status, 403);
  const login = await request('/api/admin/session', { method: 'POST', body: JSON.stringify({ password }) });
  await json(login);
  cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/admin/uploads', { method: 'POST', body: 'invalid-file-content' })).status, 415);
  const image = await readFile(new URL('../public/media/cat-transparent-poster.webp', import.meta.url));
  const video = await readFile(new URL('../public/media/cat.mp4', import.meta.url));
  const upload = async (bytes, suffix = '') => (await json(await request(`/api/admin/uploads${suffix}`, { method: 'POST', body: bytes, headers: { 'Content-Length': String(bytes.length) } }), 201)).media;
  const media = await upload(image);
  const movie = await upload(video);
  assert.equal(movie.type, 'video');
  assert.equal((await request('/api/admin/uploads?purpose=avatar', { method: 'POST', body: video })).status, 400);
  const large = Buffer.alloc(25 * 1024 * 1024); image.copy(large);
  const largeMedia = await upload(large);
  assert.equal((await request(largeMedia.src)).headers.get('content-length'), String(large.length));
  assert.equal((await request('/api/admin/uploads', { method: 'POST', body: Buffer.alloc(large.length + 1) })).status, 413);
  assert.equal((await request(media.src, {}, false)).status, 404);
  const work = { title: 'CPU regression fixture', category: 'TEST', year: '2026', client: '', description: '', layout: 'featured', images: [media, movie], status: 'draft' };
  const save = async data => (await json(await request('/api/admin/projects', { method: 'POST', body: JSON.stringify(data) }))).project;
  const draft = await save(work);
  assert.ok(!(await json(await request('/api/public'))).projects.some(project => project.id === draft.id));
  await save({ ...draft, status: 'published' });
  assert.ok((await json(await request('/api/public'))).projects.some(project => project.id === draft.id));
  const range = await request(movie.src, { headers: { Range: 'bytes=0-1023' } }, false);
  assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 1024);
  await save({ ...draft, status: 'draft' });
  assert.equal((await request(media.src, {}, false)).status, 404);
  for (const field of ['clients', 'contacts']) {
    const original = await json(await request(`/api/admin/${field}`));
    const updated = field === 'clients' ? [] : original.contacts.map(contact => ({ ...contact, url: 'https://example.com/updated' }));
    await json(await request(`/api/admin/${field}`, { method: 'PUT', body: JSON.stringify({ [field]: updated, revision: original.revision }) }));
    assert.deepEqual((await json(await request('/api/public')))[field], updated);
  }
  await json(await request('/api/admin/session', { method: 'DELETE' }));
  assert.equal((await request('/api/admin/projects')).status, 401);
  console.log('PASS: static routes/assets, API routing, login/origin protection, image/video/25 MB uploads, size/type rejection, draft privacy, publication, media ranges, public data updates, logout.');
} finally {
  await mf.dispose();
}
