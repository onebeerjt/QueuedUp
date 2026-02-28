interface WatchmodeSearchResult {
  id: number;
  name: string;
  year?: number;
  type?: string;
}

interface WatchmodeSearchResponse {
  title_results: WatchmodeSearchResult[];
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

  if (queryYear && candidate.year) {
    const diff = Math.abs(candidate.year - queryYear);
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

export async function searchWatchmodeTitle(title: string, year?: number): Promise<number | null> {
  const data = await watchmodeFetch<WatchmodeSearchResponse>('/autocomplete-search/', {
    search_value: title,
    search_type: '2'
  });

  const ranked = [...(data.title_results ?? [])].sort(
    (a, b) => scoreCandidate(title, year, b) - scoreCandidate(title, year, a)
  );
  const match = ranked[0];
  return match?.id ?? null;
}

export async function getWatchmodeSources(titleId: number): Promise<WatchmodeSource[]> {
  const data = await watchmodeFetch<WatchmodeSourcesResponse>(`/title/${titleId}/sources/`, {
    regions: 'US'
  });

  const allowedTypes = new Set(['sub', 'free']);

  return data.sources
    .filter(
      (source) => source.region === 'US' && allowedTypes.has(source.type.toLowerCase()) && Boolean(source.web_url)
    )
    .map((source) => ({
      name: source.name,
      web_url: source.web_url
    }));
}
