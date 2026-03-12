import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

interface SearchResult {
  id: number;
  title: string;
  release_date?: string;
  overview?: string;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
}

interface SearchResponse {
  results: SearchResult[];
}

interface DetailsResponse {
  id: number;
  title: string;
  release_date?: string;
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  popularity?: number;
}

interface CreditsResponse {
  cast: Array<{ id: number; name: string; order: number }>;
  crew: Array<{ id: number; name: string; job: string }>;
}

interface PersonCreditsResponse {
  cast?: Array<{ id: number; title: string; release_date?: string; genre_ids?: number[]; vote_average?: number; popularity?: number }>;
  crew?: Array<{ id: number; title: string; release_date?: string; job?: string; genre_ids?: number[]; vote_average?: number; popularity?: number }>;
}

interface SimilarResponse {
  results: SearchResult[];
}

function getTmdbKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error('TMDB_API_KEY is not set');
  }
  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('api_key', getTmdbKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 21600 } });
  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function resolveSeed(title: string): Promise<SearchResult | null> {
  const data = await tmdbFetch<SearchResponse>('/search/movie', {
    query: title,
    include_adult: 'false',
    language: 'en-US',
    page: '1'
  });
  return data.results?.[0] ?? null;
}

function yearToDecade(year: number): number {
  return Math.floor(year / 10) * 10;
}

function scoreCandidate(
  movie: SearchResult,
  knownGenreIds: Set<number>,
  knownDecades: Set<number>,
  knownDirectors: Set<number>,
  candidateDirectorIds: Set<number>
): number {
  const year = movie.release_date ? Number(movie.release_date.slice(0, 4)) : 0;
  const decade = year ? yearToDecade(year) : 0;
  const genreOverlap = (movie.genre_ids || []).filter((id) => knownGenreIds.has(id)).length;
  const sameDecade = decade ? knownDecades.has(decade) : false;
  const directorOverlap = Array.from(candidateDirectorIds).some((id) => knownDirectors.has(id));

  let score = 0;
  score += genreOverlap * 3;
  if (sameDecade) {
    score += 2;
  }
  if (directorOverlap) {
    score += 4;
  }
  if ((movie.vote_average ?? 0) >= 6.5) {
    score += 2;
  }
  if ((movie.popularity ?? 999) < 20) {
    score += 2;
  }

  return score;
}

function reasonFor(movie: SearchResult, knownGenreIds: Set<number>, knownDecades: Set<number>): string {
  const year = movie.release_date ? Number(movie.release_date.slice(0, 4)) : 0;
  const decade = year ? yearToDecade(year) : 0;
  if ((movie.genre_ids || []).some((id) => knownGenreIds.has(id))) {
    return 'Because you liked similar genres';
  }
  if (decade && knownDecades.has(decade)) {
    return `Fits your ${decade}s taste`;
  }
  return 'Connected via your public movie graph';
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { titles?: string[]; maxCandidates?: number };
    const maxCandidates = Math.min(Math.max(Number(body.maxCandidates) || 100, 10), 150);
    const titles = Array.isArray(body.titles)
      ? Array.from(new Set(body.titles.map((title) => title.trim()).filter(Boolean))).slice(0, 30)
      : [];

    if (!titles.length) {
      return NextResponse.json({ error: 'titles are required' }, { status: 400 });
    }

    const cacheKey = titles.map((title) => title.toLowerCase()).sort().join('\u0001');
    const scored = await getCachedBlindSpotCandidates(cacheKey, maxCandidates);

    return NextResponse.json({ candidates: scored });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build blind spots context';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function buildBlindSpotCandidates(titles: string[], maxCandidates: number): Promise<Array<{ title: string; reason: string }>> {
  const seeds = (await Promise.all(titles.map((title) => resolveSeed(title)))).filter(
    (item): item is SearchResult => Boolean(item)
  );

  if (!seeds.length) {
    return [];
  }

  const knownIds = new Set<number>(seeds.map((seed) => seed.id));
  const knownGenreIds = new Set<number>();
  const knownDecades = new Set<number>();
  const knownDirectors = new Set<number>();

  const candidatesMap = new Map<number, SearchResult>();
  const candidateDirectors = new Map<number, Set<number>>();

  for (const seed of seeds) {
    const year = seed.release_date ? Number(seed.release_date.slice(0, 4)) : 0;
    if (year) {
      knownDecades.add(yearToDecade(year));
    }
    (seed.genre_ids || []).forEach((id) => knownGenreIds.add(id));

    const [details, credits, similar] = await Promise.all([
      tmdbFetch<DetailsResponse>(`/movie/${seed.id}`, { language: 'en-US' }),
      tmdbFetch<CreditsResponse>(`/movie/${seed.id}/credits`, { language: 'en-US' }),
      tmdbFetch<SimilarResponse>(`/movie/${seed.id}/similar`, { language: 'en-US', page: '1' })
    ]);

    (details.genres || []).forEach((genre) => knownGenreIds.add(genre.id));
    const director = credits.crew.find((person) => person.job === 'Director');
    if (director) {
      knownDirectors.add(director.id);
      const directorCredits = await tmdbFetch<PersonCreditsResponse>(`/person/${director.id}/movie_credits`, {
        language: 'en-US'
      });

      (directorCredits.crew || [])
        .filter((item) => item.job === 'Director')
        .slice(0, 20)
        .forEach((item) => {
          if (!knownIds.has(item.id) && item.title) {
            candidatesMap.set(item.id, {
              id: item.id,
              title: item.title,
              release_date: item.release_date,
              genre_ids: item.genre_ids,
              vote_average: item.vote_average,
              popularity: item.popularity
            });
            if (!candidateDirectors.has(item.id)) {
              candidateDirectors.set(item.id, new Set<number>());
            }
            candidateDirectors.get(item.id)?.add(director.id);
          }
        });
    }

    for (const actor of credits.cast.slice(0, 6)) {
      const actorCredits = await tmdbFetch<PersonCreditsResponse>(`/person/${actor.id}/movie_credits`, {
        language: 'en-US'
      });
      (actorCredits.cast || []).slice(0, 12).forEach((item) => {
        if (!knownIds.has(item.id) && item.title) {
          candidatesMap.set(item.id, {
            id: item.id,
            title: item.title,
            release_date: item.release_date,
            genre_ids: item.genre_ids,
            vote_average: item.vote_average,
            popularity: item.popularity
          });
        }
      });
    }

    (similar.results || []).slice(0, 20).forEach((item) => {
      if (!knownIds.has(item.id) && item.title) {
        candidatesMap.set(item.id, item);
      }
    });
  }

  return Array.from(candidatesMap.values())
    .filter((movie) => (movie.vote_average ?? 0) >= 6)
    .sort((a, b) => {
      const aDirectors = candidateDirectors.get(a.id) ?? new Set<number>();
      const bDirectors = candidateDirectors.get(b.id) ?? new Set<number>();

      const aScore = scoreCandidate(a, knownGenreIds, knownDecades, knownDirectors, aDirectors);
      const bScore = scoreCandidate(b, knownGenreIds, knownDecades, knownDirectors, bDirectors);
      return bScore - aScore;
    })
    .slice(0, maxCandidates)
    .map((movie) => ({
      title: movie.title,
      reason: reasonFor(movie, knownGenreIds, knownDecades)
    }));
}

const getCachedBlindSpotCandidates = unstable_cache(
  async (cacheKey: string, maxCandidates: number): Promise<Array<{ title: string; reason: string }>> => {
    const titles = cacheKey.split('\u0001').filter(Boolean);
    return buildBlindSpotCandidates(titles, maxCandidates);
  },
  ['blindspots-context-v2'],
  { revalidate: 21600 }
);
