import { requireAdmin } from '@/lib/server/auth';
import { listWorks, saveWork } from '@/lib/server/projects';
import {
  failure,
  HttpError,
  json,
  readJson,
  runtime,
} from '@/lib/server/runtime';
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return json({ projects: await listWorks(true) });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    await requireAdmin(request, true);
    return json({ project: await saveWork(await readJson(request)) });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    await requireAdmin(request, true);
    const { id } = await readJson(request);
    if (typeof id !== 'string') throw new HttpError(400, 'Не выбрана работа.');
    // Files remain private and recoverable after removing the project.
    await runtime().DB.batch([
      runtime()
        .DB.prepare('UPDATE media SET project_id = NULL WHERE project_id = ?')
        .bind(id),
      runtime().DB.prepare('DELETE FROM works WHERE id = ?').bind(id),
    ]);
    return json({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
