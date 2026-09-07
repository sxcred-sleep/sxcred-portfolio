import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const target = resolve(root, '.dev.vars');
if (existsSync(target) && !process.argv.includes('--rotate')) {
  console.log('Пароль уже настроен. Для смены: node scripts/admin-password.mjs --rotate');
  process.exit(0);
}
const password = process.env.SXCRED_NEW_PASSWORD || randomBytes(18).toString('base64url');
if (password.length < 14 || password.length > 256) throw new Error('Нужно от 14 до 256 символов.');
const salt = randomBytes(16).toString('hex');
const hash = `${salt}:${pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')}`;
const previous = existsSync(target) ? readFileSync(target, 'utf8') : '';
const other = previous.split(/\r?\n/).filter(line => !line.startsWith('ADMIN_PASSWORD_HASH=')).join('\n').trim();
writeFileSync(target, `${other ? `${other}\n` : ''}ADMIN_PASSWORD_HASH=${hash}\n`, { mode: 0o600 });
writeFileSync(resolve(root, '.admin-password.local.txt'), `SXCRED — вход в /admin\n\n${password}\n`, { mode: 0o600 });
console.log('Пароль сохранён в .admin-password.local.txt. В .dev.vars записан только хеш.');
