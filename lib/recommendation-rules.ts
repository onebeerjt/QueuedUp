import type { Movie } from '@/types/movie';

import { dedupeMovies } from '@/lib/discovery';

export interface TonightPack {
  pick: Movie | null;
  doubleFeature: Movie[];
  tripleFeature: Movie[];
  label: string;
}

function rated(movies: Movie[], minRating = 6.4): Movie[] {
  return movies.filter((movie) => movie.poster && movie.imdbRating >= minRating && !movie.notFound);
}

export function pickSomethingTonight(seed: Movie | null, candidates: Movie[]): Movie | null {
  if (!seed) {
    return null;
  }
  return rated(candidates)
    .filter((movie) => movie.id !== seed.id)
    .sort((a, b) => b.imdbRating - a.imdbRating || b.year - a.year)[0] ?? null;
}

export function buildDoubleFeature(seed: Movie | null, candidates: Movie[]): Movie[] {
  if (!seed) {
    return [];
  }

  const pool = rated(candidates)
    .filter((movie) => movie.id !== seed.id)
    .sort((a, b) => b.imdbRating - a.imdbRating || b.year - a.year);

  if (pool.length < 2) {
    return pool.slice(0, 2);
  }

  const first = pool[0];
  const second = pool.find((movie) =>
    movie.genres.some((genre) => first.genres.includes(genre)) || Math.abs(movie.year - first.year) <= 10
  ) ?? pool[1];

  return dedupeMovies([first, second]).slice(0, 2);
}

export function buildTripleFeature(seed: Movie | null, candidates: Movie[]): Movie[] {
  if (!seed) {
    return [];
  }

  const pool = rated(candidates)
    .filter((movie) => movie.id !== seed.id)
    .sort((a, b) => b.imdbRating - a.imdbRating || b.year - a.year);

  const triple: Movie[] = [];
  for (const movie of pool) {
    if (!triple.length) {
      triple.push(movie);
      continue;
    }

    const overlap = movie.genres.some((genre) => triple.some((item) => item.genres.includes(genre)));
    const eraNear = triple.some((item) => Math.abs(item.year - movie.year) <= 12);
    if (overlap || eraNear) {
      triple.push(movie);
    }
    if (triple.length >= 3) {
      break;
    }
  }

  return dedupeMovies(triple).slice(0, 3);
}

export function tripleLabel(seed: Movie | null, triple: Movie[]): string {
  if (!seed || !triple.length) {
    return 'Tonight picks';
  }

  const allGenres = [...seed.genres, ...triple.flatMap((movie) => movie.genres)];
  const counts = new Map<string, number>();
  for (const genre of allGenres) {
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }

  const topGenre = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topGenre) {
    return `${topGenre} starter pack`;
  }

  const decade = Math.floor((seed.year || 2000) / 10) * 10;
  return `${decade}s connections`;
}

export function blindSpotReason(movie: Movie, seedGenres: string[]): string {
  if (movie.genres.some((genre) => seedGenres.includes(genre))) {
    return `Because you liked ${movie.genres.find((genre) => seedGenres.includes(genre))?.toLowerCase()} films`;
  }
  if (movie.year) {
    const decade = Math.floor(movie.year / 10) * 10;
    return `Great ${decade}s blind spot`;
  }
  return 'Connected to your taste map';
}

export function buildTonightPack(seed: Movie | null, candidates: Movie[]): TonightPack {
  const pick = pickSomethingTonight(seed, candidates);
  const doubleFeature = buildDoubleFeature(seed, candidates);
  const tripleFeature = buildTripleFeature(seed, candidates);
  const label = tripleLabel(seed, tripleFeature);

  return { pick, doubleFeature, tripleFeature, label };
}
