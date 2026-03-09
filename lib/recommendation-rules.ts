import type { Movie } from '@/types/movie';

import { dedupeMovies } from '@/lib/discovery';

export interface TonightPack {
  pick: Movie | null;
  doubleFeature: Movie[];
  tripleFeature: Movie[];
  label: string;
}

const NOISE_TITLE_PATTERN =
  /\b(concert|benefit|live\s+at|tv\s+special|behind\s+the\s+scenes|making\s+of|episode)\b/i;

function isLikelyFeatureFilm(movie: Movie): boolean {
  if (!movie.poster || movie.notFound) {
    return false;
  }
  if (NOISE_TITLE_PATTERN.test(movie.title)) {
    return false;
  }
  if (movie.year && (movie.year < 1920 || movie.year > new Date().getFullYear() + 1)) {
    return false;
  }
  if (movie.imdbRating < 5.8) {
    return false;
  }
  if (movie.runtime > 0 && (movie.runtime < 65 || movie.runtime > 230)) {
    return false;
  }
  return true;
}

function overlapCount(seed: Movie, movie: Movie): number {
  return movie.genres.filter((genre) => seed.genres.includes(genre)).length;
}

function connectionScore(seed: Movie, movie: Movie): number {
  const overlap = overlapCount(seed, movie);
  const yearDistance = seed.year && movie.year ? Math.abs(seed.year - movie.year) : 50;
  const yearBoost = yearDistance <= 8 ? 2 : yearDistance <= 15 ? 1 : 0;
  const firstGenreBoost = seed.genres[0] && movie.genres.includes(seed.genres[0]) ? 2 : 0;
  return overlap * 4 + yearBoost + firstGenreBoost + movie.imdbRating * 0.35;
}

function connectedPool(seed: Movie | null, candidates: Movie[], minRating = 6.4): Movie[] {
  if (!seed) {
    return [];
  }

  return candidates
    .filter((movie) => movie.id !== seed.id)
    .filter((movie) => movie.imdbRating >= minRating)
    .filter(isLikelyFeatureFilm)
    .filter((movie) => (seed.genres.length ? overlapCount(seed, movie) > 0 : true))
    .sort((a, b) => connectionScore(seed, b) - connectionScore(seed, a) || b.year - a.year);
}

export function pickSomethingTonight(seed: Movie | null, candidates: Movie[]): Movie | null {
  return connectedPool(seed, candidates)[0] ?? null;
}

export function buildDoubleFeature(seed: Movie | null, candidates: Movie[]): Movie[] {
  const pool = connectedPool(seed, candidates);

  if (pool.length < 2) {
    return pool.slice(0, 2);
  }

  const first = pool[0];
  const second = pool.find((movie) =>
    movie.id !== first.id &&
    (movie.genres.some((genre) => first.genres.includes(genre)) || Math.abs(movie.year - first.year) <= 10)
  ) ?? pool[1];

  return dedupeMovies([first, second]).slice(0, 2);
}

export function buildTripleFeature(seed: Movie | null, candidates: Movie[]): Movie[] {
  const pool = connectedPool(seed, candidates, 6.2);

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
