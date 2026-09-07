import { env } from 'cloudflare:workers';

type Runtime = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ADMIN_PASSWORD_HASH?: string;
};
export function runtime() {
  return env as unknown as Runtime;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200, headers: HeadersInit = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', 'no-store');
  return Response.json(value, { status, headers: responseHeaders });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  console.error(
    'Portfolio request failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  return json(
    { error: 'Не удалось выполнить запрос. Попробуйте ещё раз.' },
    500,
  );
}
export async function readJson(request: Request) {
  const size = Number(request.headers.get('content-length'));
  if (size > 64 * 1024) throw new HttpError(413, 'Слишком много текста.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Пустой запрос.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 64 * 1024) {
      await reader.cancel();
      throw new HttpError(413, 'Слишком много текста.');
    }
    chunks.push(value);
  }
  try {
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Expected object');
    return result as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'Некорректный запрос.');
  }
}
