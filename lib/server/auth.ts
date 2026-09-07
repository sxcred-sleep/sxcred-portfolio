import { HttpError, runtime } from './runtime';

const COOKIE = 'sxcred_admin';
const encoder = new TextEncoder();
export async function digest(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (
    origin !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    throw new HttpError(
      403,
      'Запрос с другого сайта отклонён. Обновите страницу.',
    );
  }
}
function cookieToken(request: Request) {
  return (
    request.headers
      .get('cookie')
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1) ?? ''
  );
}
export async function signedIn(request: Request) {
  const { DB, ADMIN_PASSWORD_HASH } = runtime();
  const token = cookieToken(request);
  if (!ADMIN_PASSWORD_HASH || !/^[a-f0-9]{64}$/.test(token)) return false;
  return !!(await DB.prepare(
    'SELECT token FROM admin_sessions WHERE token = ? AND expires_at > ? AND credential = ?',
  )
    .bind(await digest(token), Date.now(), await digest(ADMIN_PASSWORD_HASH))
    .first());
}
export async function requireAdmin(request: Request, mutation = false) {
  if (mutation) sameOrigin(request);
  if (!(await signedIn(request)))
    throw new HttpError(401, 'Войдите в панель управления.');
}
export function sessionCookie(request: Request, token: string, maxAge: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
export async function login(request: Request, password: unknown) {
  sameOrigin(request);
  const { DB, ADMIN_PASSWORD_HASH } = runtime();
  if (!ADMIN_PASSWORD_HASH)
    throw new HttpError(503, 'Пароль администратора ещё не настроен.');
  if (typeof password !== 'string' || password.length > 256)
    throw new HttpError(400, 'Введите пароль.');
  const now = Date.now();
  const key = await digest(request.headers.get('cf-connecting-ip') || 'local');
  // The atomic increment happens before verification, so parallel guesses count.
  const attempt = await DB.prepare(
    'INSERT INTO login_attempts (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END, expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END RETURNING count',
  )
    .bind(key, now + 15 * 60_000, now, now)
    .first<{ count: number }>();
  if (!attempt || attempt.count > 5)
    throw new HttpError(
      429,
      'Слишком много попыток. Повторите через 15 минут.',
    );
  const [salt, expected] = ADMIN_PASSWORD_HASH.split(':');
  if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{64}$/.test(expected))
    throw new HttpError(503, 'Пароль администратора настроен некорректно.');
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bytes = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 100_000,
      salt: encoder.encode(salt),
    },
    material,
    256,
  );
  const actual = [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  let difference = 0;
  for (let i = 0; i < expected.length; i++)
    difference |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  if (difference !== 0) throw new HttpError(401, 'Неверный пароль.');
  const token = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await DB.batch([
    DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now),
    DB.prepare(
      'DELETE FROM login_attempts WHERE expires_at <= ? OR key = ?',
    ).bind(now, key),
    DB.prepare(
      'INSERT INTO admin_sessions (token, expires_at, credential) VALUES (?, ?, ?)',
    ).bind(
      await digest(token),
      now + 12 * 60 * 60_000,
      await digest(ADMIN_PASSWORD_HASH),
    ),
  ]);
  return sessionCookie(request, token, 12 * 60 * 60);
}
export async function logout(request: Request) {
  sameOrigin(request);
  await runtime()
    .DB.prepare('DELETE FROM admin_sessions WHERE token = ?')
    .bind(await digest(cookieToken(request)))
    .run();
  return sessionCookie(request, '', 0);
}
