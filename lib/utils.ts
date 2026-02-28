import type { Movie } from '@/types/movie';

export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T, index: number) => Promise<R>,
  delayMs = 0
): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map((item, offset) => worker(item, index + offset)));
    results.push(...batchResults);
    if (delayMs > 0 && index + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareState(movies: Movie[], activeServices: string[]): string {
  const payload = {
    titles: movies.map((movie) => movie.title),
    services: activeServices
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeShareState(param: string): { titles: string[]; services: string[] } {
  const decoded = fromBase64Url(param);
  const parsed = JSON.parse(decoded) as { titles?: unknown; services?: unknown };

  const titles = Array.isArray(parsed.titles)
    ? parsed.titles.filter((item): item is string => typeof item === 'string')
    : [];
  const services = Array.isArray(parsed.services)
    ? parsed.services.filter((item): item is string => typeof item === 'string')
    : [];

  return { titles, services };
}
