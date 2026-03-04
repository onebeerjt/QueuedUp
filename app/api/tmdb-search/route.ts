import { NextResponse } from 'next/server';

interface TmdbSearchItem {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
}

interface TmdbSearchResponse {
  results: TmdbSearchItem[];
}

function getTmdbKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error('TMDB_API_KEY is not set');
  }
  return key;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL('https://api.themoviedb.org/3/search/movie');
    url.searchParams.set('api_key', getTmdbKey());
    url.searchParams.set('query', query);
    url.searchParams.set('language', 'en-US');
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('page', '1');

    const res = await fetch(url.toString(), { next: { revalidate: 21600 } });
    if (!res.ok) {
      throw new Error(`TMDB search failed: ${res.status}`);
    }

    const data = (await res.json()) as TmdbSearchResponse;
    const results = (data.results || []).slice(0, 8).map((item) => ({
      id: item.id,
      title: item.title,
      year: item.release_date ? Number(item.release_date.slice(0, 4)) : 0,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : ''
    }));

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TMDB search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
