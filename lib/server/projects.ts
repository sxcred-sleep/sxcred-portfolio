import type { ManagedProject, Project, ProjectImage } from '@/data/projects';
import { projects as placeholders } from '@/data/projects';
import { HttpError, runtime } from './runtime';

export type WorkRow = {
  id: string;
  data: string;
  status: 'draft' | 'published';
  updated_at: number;
};
export function workFromRow(row: WorkRow): ManagedProject {
  return {
    ...JSON.parse(row.data),
    id: row.id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}
export async function listWorks(admin = false): Promise<ManagedProject[]> {
  const { results } = await runtime()
    .DB.prepare(
      `SELECT id, data, status, updated_at FROM works ${admin ? '' : "WHERE status = 'published'"} ORDER BY created_at DESC, id`,
    )
    .all<WorkRow>();
  return results.map(workFromRow);
}
export async function publicWorks(): Promise<Project[]> {
  const works = await listWorks();
  return works.length ? works : placeholders;
}
function field(
  input: Record<string, unknown>,
  key: string,
  max: number,
  required = false,
) {
  const value = input[key];
  if (value !== undefined && value !== null && typeof value !== 'string')
    throw new HttpError(400, 'Проверьте поля работы.');
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > max || (required && !text))
    throw new HttpError(
      400,
      `Проверьте поле «${({ title: 'Название', category: 'Категория', description: 'Описание' } as Record<string, string>)[key] || key}».`,
    );
  return text;
}
export async function saveWork(input: Record<string, unknown>) {
  const { DB } = runtime();
  const id =
    typeof input.id === 'string' && /^[a-f0-9-]{36}$/.test(input.id)
      ? input.id
      : crypto.randomUUID();
  const title = field(input, 'title', 120, true);
  const category = field(input, 'category', 80, true);
  const year = field(input, 'year', 4);
  if (year && !/^(19|20)\d{2}$/.test(year))
    throw new HttpError(400, 'Укажите год четырьмя цифрами.');
  const client = field(input, 'client', 120);
  const description = field(input, 'description', 5000);
  const layouts = ['featured', 'portrait', 'wide', 'compact'];
  if (typeof input.layout !== 'string' || !layouts.includes(input.layout))
    throw new HttpError(400, 'Выберите формат обложки.');
  if (input.status !== 'draft' && input.status !== 'published')
    throw new HttpError(400, 'Неверный статус работы.');
  if (!Array.isArray(input.images) || input.images.length > 20)
    throw new HttpError(400, 'Можно добавить до 20 файлов.');
  if (input.status === 'published' && input.images.length === 0)
    throw new HttpError(400, 'Для публикации добавьте хотя бы один файл.');
  const images: ProjectImage[] = [];
  const ids = new Set<string>();
  for (const item of input.images) {
    if (!item || typeof item.id !== 'string' || ids.has(item.id))
      throw new HttpError(400, 'Некорректный список файлов.');
    ids.add(item.id);
    const media = await DB.prepare(
      'SELECT id, mime, name, project_id FROM media WHERE id = ?',
    )
      .bind(item.id)
      .first<{
        id: string;
        mime: string;
        name: string;
        project_id: string | null;
      }>();
    if (!media || (media.project_id && media.project_id !== id))
      throw new HttpError(
        400,
        'Файл отсутствует или относится к другой работе.',
      );
    images.push({
      id: media.id,
      src: `/api/media/${media.id}`,
      alt:
        typeof item.alt === 'string'
          ? item.alt.trim().slice(0, 300) || title
          : title,
      type: media.mime.startsWith('video/') ? 'video' : 'image',
      name: media.name,
    });
  }
  const data: Project = {
    id,
    title,
    category,
    year: year || null,
    client: client || null,
    description,
    images,
    placeholder: false,
    layout: input.layout as Project['layout'],
    art: 'dota',
    coverText: title,
  };
  const now = Date.now();
  await DB.batch([
    DB.prepare(
      'INSERT INTO works (id, data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, status = excluded.status, updated_at = excluded.updated_at',
    ).bind(id, JSON.stringify(data), input.status, now, now),
    DB.prepare('UPDATE media SET project_id = NULL WHERE project_id = ?').bind(
      id,
    ),
    ...images.map((item) =>
      DB.prepare('UPDATE media SET project_id = ? WHERE id = ?').bind(
        id,
        item.id!,
      ),
    ),
  ]);
  return { ...data, status: input.status, updatedAt: now } as ManagedProject;
}
