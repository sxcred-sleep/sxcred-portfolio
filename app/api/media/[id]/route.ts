import { signedIn } from '@/lib/server/auth';
import { failure, HttpError, runtime } from '@/lib/server/runtime';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { DB, MEDIA } = runtime();
    const row = await DB.prepare(
      'SELECT media.key, media.mime, media.size, works.status FROM media LEFT JOIN works ON works.id = media.project_id WHERE media.id = ?',
    )
      .bind(id)
      .first<{ key: string; mime: string; size: number; status: string | null }>();
    if (!row || (row.status !== 'published' && !(await signedIn(request))))
      throw new HttpError(404, 'Файл не найден.');
    const requestedRange = request.headers.get('range');
    let range: { offset: number; length: number } | undefined;
    if (requestedRange) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(requestedRange);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, row.size - Number(match?.[2]));
      const end = match?.[1] && match[2] ? Math.min(row.size - 1, Number(match[2])) : row.size - 1;
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= row.size) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${row.size}`, 'Cache-Control': 'no-store' } });
      }
      range = { offset: start, length: end - start + 1 };
    }
    const object = await MEDIA.get(row.key, range ? { range } : undefined);
    if (!object) throw new HttpError(404, 'Файл не найден.');
    const headers = new Headers({
      'Content-Type': row.mime,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': 'inline',
    });
    let status = 200;
    if (
      range && object.range &&
      'offset' in object.range &&
      object.range.offset !== undefined
    ) {
      const start = object.range.offset;
      const length = object.range.length ?? object.size - start;
      headers.set(
        'Content-Range',
        `bytes ${start}-${start + length - 1}/${object.size}`,
      );
      headers.set('Content-Length', String(length));
      status = 206;
    } else headers.set('Content-Length', String(object.size));
    return new Response(object.body as unknown as BodyInit, {
      status,
      headers,
    });
  } catch (error) {
    return failure(error);
  }
}
