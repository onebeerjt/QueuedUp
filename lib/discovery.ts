import { normalizeServiceName } from '@/lib/services';
import type { Movie } from '@/types/movie';

export interface ConnectedRow {
  key: string;
  label: string;
  titles: string[];
}

export function movieIsAvailable(movie: Movie, activeServices: string[]): boolean {
  if (!activeServices.length) {
    return true;
  }

  const sourceIds = movie.streamingSources
    .map((source) => normalizeServiceName(source.name))
    .filter(Boolean) as string[];
  return sourceIds.some((id) => activeServices.includes(id));
}

export function sortMovies(movies: Movie[], sortBy: string): Movie[] {
  const next = [...movies];
  if (sortBy === 'rating-desc') {
    next.sort((a, b) => b.imdbRating - a.imdbRating);
  } else if (sortBy === 'year-desc') {
    next.sort((a, b) => b.year - a.year);
  } else if (sortBy === 'title-asc') {
    next.sort((a, b) => a.title.localeCompare(b.title));
  }
  return next;
}

export function dedupeMovies(movies: Movie[]): Movie[] {
  const seen = new Set<string>();
  return movies.filter((movie) => {
    const key = `${movie.id}-${movie.title.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function flattenRows(rows: Array<{ movies: Movie[] }>): Movie[] {
  return dedupeMovies(rows.flatMap((row) => row.movies));
}

export function limitTitles(titles: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const title of titles) {
    const t = title.trim();
    if (!t) {
      continue;
    }
    const key = t.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(t);
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}
