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
