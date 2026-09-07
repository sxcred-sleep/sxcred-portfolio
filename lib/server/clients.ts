import { clients as initialClients, type ManagedClient } from '@/data/clients';
import { HttpError, runtime } from './runtime';

export async function getClients(): Promise<{
  clients: ManagedClient[];
  revision: number;
}> {
  const row = await runtime()
    .DB.prepare("SELECT data, revision FROM site_content WHERE key = 'clients'")
    .first<{ data: string; revision: number }>();
  return row
    ? { clients: JSON.parse(row.data), revision: row.revision }
    : {
        clients: initialClients.map((client, index) => ({
          ...client,
          id: `client-${index + 1}`,
          avatarId: null,
        })),
        revision: 0,
      };
}
function field(
  item: Record<string, unknown>,
  name: string,
  max: number,
  required = false,
) {
  if (
    item[name] !== null &&
    item[name] !== undefined &&
    typeof item[name] !== 'string'
  )
    throw new HttpError(400, 'Проверьте поля стримера.');
  const value = typeof item[name] === 'string' ? item[name].trim() : '';
  if ((required && !value) || value.length > max)
    throw new HttpError(400, 'Укажите никнейм и проверьте длину полей.');
  return value;
}
export async function saveClients(input: Record<string, unknown>) {
  if (!Array.isArray(input.clients) || input.clients.length > 30)
    throw new HttpError(400, 'Можно добавить до 30 стримеров.');
  if (!Number.isSafeInteger(input.revision) || (input.revision as number) < 0)
    throw new HttpError(400, 'Обновите панель перед сохранением.');
  const clients: ManagedClient[] = [];
  const ids = new Set<string>();
  for (const raw of input.clients) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new HttpError(400, 'Некорректные данные стримера.');
    const item = raw as Record<string, unknown>;
    const id = field(item, 'id', 80, true);
    if (!/^[a-zA-Z0-9-]+$/.test(id) || ids.has(id))
      throw new HttpError(400, 'Некорректный идентификатор стримера.');
    ids.add(id);
    const name = field(item, 'name', 80, true);
    const category = field(item, 'category', 120);
    const workType = field(item, 'workType', 160);
    let link = field(item, 'link', 2000);
    if (link) {
      try {
        const url = new URL(link);
        if (
          !['https:', 'http:'].includes(url.protocol) ||
          url.username ||
          url.password
        )
          throw new Error('Invalid link');
        link = url.href;
      } catch {
        throw new HttpError(
          400,
          `Ссылка для ${name} должна начинаться с https:// или http://.`,
        );
      }
    }
    const avatarId = field(item, 'avatarId', 80);
    if (avatarId) {
      const file = await runtime()
        .DB.prepare('SELECT mime, project_id FROM media WHERE id = ?')
        .bind(avatarId)
        .first<{ mime: string; project_id: string | null }>();
      if (!file || !file.mime.startsWith('image/') || file.project_id)
        throw new HttpError(400, `Загрузите изображение для аватара ${name}.`);
    }
    clients.push({
      id,
      name,
      category,
      workType: workType || null,
      link: link || null,
      avatarId: avatarId || null,
      avatar: avatarId ? `/api/media/${avatarId}` : null,
    });
  }
  // Compare-and-swap prevents one open admin tab from overwriting another.
  const revision = input.revision as number;
  const result =
    revision === 0
      ? await runtime()
          .DB.prepare(
            "INSERT INTO site_content (key, data, revision) VALUES ('clients', ?, 1) ON CONFLICT(key) DO NOTHING",
          )
          .bind(JSON.stringify(clients))
          .run()
      : await runtime()
          .DB.prepare(
            "UPDATE site_content SET data = ?, revision = revision + 1 WHERE key = 'clients' AND revision = ?",
          )
          .bind(JSON.stringify(clients), revision)
          .run();
  if (result.meta.changes !== 1)
    throw new HttpError(
      409,
      'Список изменён в другой вкладке. Скопируйте нужные изменения и обновите страницу.',
    );
  return { clients, revision: revision + 1 };
}
