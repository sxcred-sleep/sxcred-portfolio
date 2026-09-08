import { site } from '@/data/site';
import type { Contact, ContactSettings } from '@/data/contacts';
import { HttpError, runtime } from './runtime';

export async function getContacts(): Promise<ContactSettings> {
  const row = await runtime()
    .DB.prepare(
      "SELECT data, revision FROM site_content WHERE key = 'contacts'",
    )
    .first<{ data: string; revision: number }>();
  const saved: Contact[] = row ? JSON.parse(row.data) : [];
  return {
    contacts: site.contacts.map(contact => ({
      ...contact,
      url: saved.find(item => item.label === contact.label)?.url ?? contact.url,
    })),
    revision: row?.revision ?? 0,
  };
}

export async function saveContacts(
  input: Record<string, unknown>,
): Promise<ContactSettings> {
  if (
    !Array.isArray(input.contacts) ||
    input.contacts.length !== site.contacts.length ||
    !Number.isSafeInteger(input.revision) ||
    (input.revision as number) < 0
  )
    throw new HttpError(400, 'Проверьте список контактов и обновите панель.');
  const submitted = input.contacts;
  const contacts: Contact[] = site.contacts.map((contact, index) => {
    const raw = submitted[index];
    if (
      !raw ||
      typeof raw !== 'object' ||
      raw.label !== contact.label ||
      (raw.url !== null && typeof raw.url !== 'string')
    )
      throw new HttpError(400, 'Некорректные данные контакта.');
    let link = (raw.url || '').trim();
    if (link.length > 2000)
      throw new HttpError(400, `Ссылка ${contact.label} слишком длинная.`);
    // Discord is copied as text; retain support for previously saved links.
    if (contact.label === 'Discord' && link && !/^https?:\/\//i.test(link)) {
      if (link.length > 100 || !/^@?[\p{L}\p{N}_.-]+(?:#\d{4})?$/u.test(link))
        throw new HttpError(400, 'Для Discord укажите никнейм без пробелов или полную ссылку https://.');
      return { label: contact.label, url: link };
    }
    if (link) {
      try {
        const url = new URL(link);
        const web =
          ['https:', 'http:'].includes(url.protocol) &&
          !url.username &&
          !url.password;
        const email =
          contact.label === 'Email' &&
          url.protocol === 'mailto:' &&
          /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(url.pathname) &&
          !url.search &&
          !url.hash;
        if (
          (!web && !email) ||
          [...link].some(
            (char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127,
          )
        )
          throw new Error('Invalid URL');
        link = url.href;
      } catch {
        throw new HttpError(
          400,
          `Для ${contact.label} укажите полную ссылку https:// или http://${contact.label === 'Email' ? ', либо mailto:name@example.com' : ''}.`,
        );
      }
    }
    return { label: contact.label, url: link || null };
  });
  const revision = input.revision as number;
  const result =
    revision === 0
      ? await runtime()
          .DB.prepare(
            "INSERT INTO site_content (key, data, revision) VALUES ('contacts', ?, 1) ON CONFLICT(key) DO NOTHING",
          )
          .bind(JSON.stringify(contacts))
          .run()
      : await runtime()
          .DB.prepare(
            "UPDATE site_content SET data = ?, revision = revision + 1 WHERE key = 'contacts' AND revision = ?",
          )
          .bind(JSON.stringify(contacts), revision)
          .run();
  if (result.meta.changes !== 1)
    throw new HttpError(
      409,
      'Контакты изменены в другой вкладке. Скопируйте нужные изменения и обновите страницу.',
    );
  return { contacts, revision: revision + 1 };
}
