interface WatchmodeSearchResult {
  id: number;
  name: string;
  year: number;
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

export async function searchWatchmodeTitle(title: string): Promise<number | null> {
  const data = await watchmodeFetch<WatchmodeSearchResponse>('/autocomplete-search/', {
    search_value: title,
    search_type: '2'
  });

  const match = data.title_results?.[0];
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
