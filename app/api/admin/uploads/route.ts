import { requireAdmin } from '@/lib/server/auth';
import { failure, json, runtime } from '@/lib/server/runtime';
import { readUpload } from '@/lib/server/upload';
export async function POST(request: Request) {
  try {
    await requireAdmin(request, true);
    const { bytes, mime, size } = await readUpload(request);
    const { DB, MEDIA } = runtime();
    const id = crypto.randomUUID();
    const key = `works/${id}`;
    const name = (
      new URL(request.url).searchParams.get('name') || 'Работа'
    ).slice(0, 200);
    await MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });
    try {
      await DB.prepare(
        'INSERT INTO media (id, key, mime, name, size, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(id, key, mime, name, size, Date.now())
        .run();
    } catch (error) {
      await MEDIA.delete(key);
      throw error;
    }
    return json(
      {
        media: {
          id,
          src: `/api/media/${id}`,
          alt: '',
          name,
          type: mime.startsWith('video/') ? 'video' : 'image',
        },
      },
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
