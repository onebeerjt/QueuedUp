interface TmdbSearchResult {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  genre_ids: number[];
  vote_average: number;
  release_date: string;
}

interface TmdbSearchResponse {
  results: TmdbSearchResult[];
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbMovieDetails {
  runtime: number | null;
  imdb_id: string | null;
}

interface TmdbProvider {
  provider_name: string;
}

interface TmdbWatchProvidersResponse {
  results?: Record<
    string,
    {
      link?: string;
      flatrate?: TmdbProvider[];
      free?: TmdbProvider[];
      ads?: TmdbProvider[];
    }
  >;
}

const TMDB_BASE = 'https://api.themoviedb.org/3';
let genreCache: Map<number, string> | null = null;

function getTmdbKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error('TMDB_API_KEY is not set');
  }
  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', getTmdbKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function searchTmdbMovie(title: string): Promise<TmdbSearchResult | null> {
  const data = await tmdbFetch<TmdbSearchResponse>('/search/movie', {
    query: title,
    include_adult: 'false',
    language: 'en-US',
    page: '1'
  });

  return data.results[0] ?? null;
}

export async function getTmdbMovieDetails(id: number): Promise<TmdbMovieDetails> {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, {
    language: 'en-US'
  });
}

export async function getTmdbWatchProviders(
  id: number
): Promise<Array<{ name: string; web_url: string }>> {
  const data = await tmdbFetch<TmdbWatchProvidersResponse>(`/movie/${id}/watch/providers`);
  const us = data.results?.US;
  if (!us) {
    return [];
  }

  const link = us.link || '';
  const providers = [...(us.flatrate ?? []), ...(us.free ?? []), ...(us.ads ?? [])];
  const unique = new Map<string, { name: string; web_url: string }>();
  for (const provider of providers) {
    const key = provider.provider_name.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, { name: provider.provider_name, web_url: link });
    }
  }
  return Array.from(unique.values());
}

export async function getTmdbGenreMap(): Promise<Map<number, string>> {
  if (genreCache) {
    return genreCache;
  }

  const data = await tmdbFetch<{ genres: TmdbGenre[] }>('/genre/movie/list', {
    language: 'en-US'
  });
  genreCache = new Map(data.genres.map((genre) => [genre.id, genre.name]));
  return genreCache;
}

export function buildPosterUrl(path: string | null): string {
  if (!path) {
    return '';
  }
  return `https://image.tmdb.org/t/p/w500${path}`;
}
