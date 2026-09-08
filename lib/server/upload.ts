import { HttpError } from './runtime';

export const MAX_UPLOAD = 25 * 1024 * 1024;
export function detectType(bytes: Uint8Array) {
  const text = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes[0] === 0x89 &&
    text(1, 4) === 'PNG' &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  )
    return 'image/png';
  if (text(0, 6) === 'GIF87a' || text(0, 6) === 'GIF89a') return 'image/gif';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
  if (
    text(4, 8) === 'ftyp' &&
    /^(isom|iso2|mp41|mp42|avc1|M4V )$/.test(text(8, 12))
  )
    return 'video/mp4';
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3 &&
    text(0, 512).includes('webm')
  )
    return 'video/webm';
  throw new HttpError(415, 'Поддерживаются JPG, PNG, WebP, GIF, MP4 и WebM.');
}
export async function readUpload(request: Request) {
  const length = Number(request.headers.get('content-length'));
  if (length > MAX_UPLOAD)
    throw new HttpError(413, 'Максимальный размер файла — 25 МБ.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Выберите файл.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_UPLOAD) {
      await reader.cancel();
      throw new HttpError(413, 'Максимальный размер файла — 25 МБ.');
    }
    chunks.push(value);
  }
  if (size < 12) throw new HttpError(400, 'Файл пустой или повреждён.');
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes, mime: detectType(bytes.subarray(0, 512)), size };
}

// Browser File uploads have a known Content-Length. Inspect only the signature,
// then stream to R2 without assembling and copying the entire file in JS.
export async function storeUpload(request: Request, bucket: R2Bucket, key: string, avatar: boolean) {
  const max = avatar ? 5 * 1024 * 1024 : MAX_UPLOAD;
  const validate = (mime: string, size: number) => {
    if (avatar && (!mime.startsWith('image/') || size > max))
      throw new HttpError(400, 'Аватар должен быть изображением до 5 МБ.');
  };
  if (!request.headers.has('content-length')) {
    // Keep support for chunked clients, with the existing bounded reader.
    const { bytes, mime, size } = await readUpload(request);
    validate(mime, size);
    await bucket.put(key, bytes, { httpMetadata: { contentType: mime } });
    return { mime, size };
  }
  const size = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(size) || size < 12) throw new HttpError(400, 'Файл пустой или повреждён.');
  if (size > max) throw new HttpError(413, avatar ? 'Максимальный размер аватара — 5 МБ.' : 'Максимальный размер файла — 25 МБ.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Выберите файл.');
  const prefix: Uint8Array[] = [];
  const signature = new Uint8Array(Math.min(512, size));
  let copied = 0;
  let mime: string;
  try {
    while (copied < signature.length) {
      const { done, value } = await reader.read();
      if (done) throw new HttpError(400, 'Файл передан не полностью.');
      prefix.push(value);
      const count = Math.min(value.length, signature.length - copied);
      signature.set(value.subarray(0, count), copied);
      copied += count;
    }
    mime = detectType(signature);
    validate(mime, size);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  const source = new ReadableStream<Uint8Array>({
    start(controller) { for (const chunk of prefix) controller.enqueue(chunk); },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    cancel(reason) { return reader.cancel(reason); },
  });
  const fixed = new FixedLengthStream(size);
  const abort = new AbortController();
  const transfer = source.pipeTo(fixed.writable, { signal: abort.signal });
  try {
    await Promise.all([
      transfer,
      bucket.put(key, fixed.readable, { httpMetadata: { contentType: mime } }),
    ]);
  } catch (error) {
    abort.abort();
    await transfer.catch(() => {});
    throw error;
  }
  return { mime, size };
}
