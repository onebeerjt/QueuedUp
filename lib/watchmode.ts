interface WatchmodeSearchResult {
  id?: number | string;
  title_id?: number | string;
  name: string;
  year?: number | string;
  tmdb_id?: number | string;
  imdb_id?: string;
  type?: string;
}

interface WatchmodeSearchResponse {
  title_results: WatchmodeSearchResult[];
}

interface WatchmodeSearchApiResponse {
  title_results?: WatchmodeSearchResult[];
  results?: WatchmodeSearchResult[];
}

interface WatchmodeSource {
  name: string;
  web_url: string;
}

interface WatchmodeSourcesResponse {
  title_id: string;
  title: string;
  sources: Array<{
    name: string;
    web_url: string;
    region: string;
    type: string;
  }>;
}

const WATCHMODE_BASE = 'https://api.watchmode.com/v1';

function getWatchmodeKey(): string {
  const key = process.env.WATCHMODE_API_KEY;
  if (!key) {
    throw new Error('WATCHMODE_API_KEY is not set');
  }
  return key;
}

async function watchmodeFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${WATCHMODE_BASE}${path}`);
  url.searchParams.set('apiKey', getWatchmodeKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Watchmode request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreCandidate(
  queryTitle: string,
  queryYear: number | undefined,
  candidate: WatchmodeSearchResult
): number {
  const query = normalizeTitle(queryTitle);
  const candidateTitle = normalizeTitle(candidate.name);
  let score = 0;

  if (candidate.type?.toLowerCase() === 'movie') {
    score += 30;
  }

  if (candidateTitle === query) {
    score += 120;
  } else if (candidateTitle.startsWith(query) || query.startsWith(candidateTitle)) {
    score += 80;
  } else if (candidateTitle.includes(query) || query.includes(candidateTitle)) {
    score += 45;
  }

  const candidateYear = coerceNumericId(candidate.year);
  if (queryYear && candidateYear) {
    const diff = Math.abs(candidateYear - queryYear);
    if (diff === 0) {
      score += 90;
    } else if (diff === 1) {
      score += 55;
    } else if (diff <= 3) {
      score += 25;
    } else {
      score -= diff;
    }
  }

  return score;
}

function coerceNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const exact = Number(trimmed);
    if (Number.isFinite(exact)) {
      return exact;
    }
    const match = trimmed.match(/\d+/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function extractWatchmodeId(result: WatchmodeSearchResult | undefined): number | null {
  if (!result) {
    return null;
  }
  return coerceNumericId(result.title_id) ?? coerceNumericId(result.id);
}

export async function searchWatchmodeTitle(title: string, year?: number): Promise<number | null> {
  const data = await watchmodeFetch<WatchmodeSearchResponse>('/autocomplete-search/', {
    search_value: title,
    search_type: '2'
  });

  const ranked = [...(data.title_results ?? [])].sort(
    (a, b) => scoreCandidate(title, year, b) - scoreCandidate(title, year, a)
  );
  return extractWatchmodeId(ranked[0]);
}

async function searchWatchmodeByField(
  searchField: 'imdb_id' | 'tmdb_id' | 'name',
  searchValue: string
): Promise<number | null> {
  const data = await watchmodeFetch<WatchmodeSearchApiResponse>('/search/', {
    search_field: searchField,
    search_value: searchValue,
    types: 'movie'
  });

  const results = data.title_results ?? data.results ?? [];
  return extractWatchmodeId(results[0]);
}

async function searchWatchmodeByNameRanked(params: {
  title: string;
  year?: number;
  tmdbId?: number;
  imdbId?: string | null;
}): Promise<number | null> {
  const data = await watchmodeFetch<WatchmodeSearchApiResponse>('/search/', {
    search_field: 'name',
    search_value: params.title,
    types: 'movie'
  });

  const results = data.title_results ?? data.results ?? [];
  if (!results.length) {
    return null;
  }

  const ranked = [...results].sort((a, b) => {
    const aTmdb = coerceNumericId(a.tmdb_id);
    const bTmdb = coerceNumericId(b.tmdb_id);

    const aBoost =
      (params.tmdbId && aTmdb === params.tmdbId ? 1000 : 0) +
      (params.imdbId && a.imdb_id === params.imdbId ? 900 : 0);
    const bBoost =
      (params.tmdbId && bTmdb === params.tmdbId ? 1000 : 0) +
      (params.imdbId && b.imdb_id === params.imdbId ? 900 : 0);

    return bBoost + scoreCandidate(params.title, params.year, b) - (aBoost + scoreCandidate(params.title, params.year, a));
  });

  return extractWatchmodeId(ranked[0]);
}

export async function resolveWatchmodeTitleId(params: {
  tmdbId?: number;
  tmdbTitle: string;
  originalTitle: string;
  year?: number;
  imdbId?: string | null;
}): Promise<number | null> {
  const { tmdbId, tmdbTitle, originalTitle, year, imdbId } = params;

  if (tmdbId) {
    try {
      const byTmdb = await searchWatchmodeByField('tmdb_id', String(tmdbId));
      if (byTmdb) {
        return byTmdb;
      }
    } catch {
      // Fallback to additional strategies.
    }
  }

  if (imdbId) {
    try {
      const byImdb = await searchWatchmodeByField('imdb_id', imdbId);
      if (byImdb) {
        return byImdb;
      }
    } catch {
      // Fallback to title-based matching below.
    }
  }

  const nameAttempts = new Set<string>([tmdbTitle, originalTitle]);
  for (const attempt of nameAttempts) {
    if (!attempt.trim()) {
      continue;
    }
    try {
      const byName = await searchWatchmodeByNameRanked({
        title: attempt,
        year,
        tmdbId,
        imdbId
      });
      if (byName) {
        return byName;
      }
    } catch {
      // Continue to autocomplete fallback.
    }
  }

  const attempts = new Set<string>([tmdbTitle, originalTitle]);
  if (year) {
    attempts.add(`${tmdbTitle} ${year}`);
    attempts.add(`${originalTitle} ${year}`);
  }

  for (const attempt of attempts) {
    if (!attempt.trim()) {
      continue;
    }
    try {
      const id = await searchWatchmodeTitle(attempt, year);
      if (id) {
        return id;
      }
    } catch {
      // Keep trying additional strategies.
    }
  }

  return null;
}

export async function getWatchmodeSources(titleId: number): Promise<WatchmodeSource[]> {
  const data = await watchmodeFetch<WatchmodeSourcesResponse>(`/title/${titleId}/sources/`);

  const blockedTypes = new Set(['buy', 'rent']);

  return data.sources
    .filter((source) => {
      if (!source.web_url) {
        return false;
      }
      const region = (source.region ?? '').toUpperCase();
      if (region && region !== 'US') {
        return false;
      }
      const type = (source.type ?? '').toLowerCase();
      return !blockedTypes.has(type);
    })
    .map((source) => ({
      name: source.name,
      web_url: source.web_url
    }));
}
