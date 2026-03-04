import { NextResponse } from 'next/server';

interface TmdbMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
}

interface TmdbCreditsResponse {
  cast: Array<{ id: number; name: string; order: number }>;
  crew: Array<{ id: number; name: string; job: string }>;
}

interface TmdbPersonMovieCreditsResponse {
  crew?: Array<{ id: number; title: string; release_date?: string; job?: string }>;
  cast?: Array<{ id: number; title: string; release_date?: string }>;
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

function sortByDateDesc<T extends { release_date?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ad = a.release_date || '';
    const bd = b.release_date || '';
    return bd.localeCompare(ad);
  });
}

function normalizeTitleList(
  items: Array<{ id: number; title: string; release_date?: string }>,
  excludeId: number,
  limit: number
): string[] {
  const seen = new Set<string>();
  const filtered = sortByDateDesc(items)
    .filter((item) => item.id !== excludeId && item.title?.trim())
    .filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((item) => item.title.trim());

  return filtered;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get('tmdbId');
  const tmdbId = Number(idParam);

  if (!tmdbId || Number.isNaN(tmdbId)) {
    return NextResponse.json({ error: 'tmdbId is required' }, { status: 400 });
  }

  try {
    const [details, credits] = await Promise.all([
      tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, { language: 'en-US' }),
      tmdbFetch<TmdbCreditsResponse>(`/movie/${tmdbId}/credits`, { language: 'en-US' })
    ]);

    const director = credits.crew.find((person) => person.job === 'Director') || null;
    const topCast = [...credits.cast].sort((a, b) => a.order - b.order).slice(0, 8);

    const rows: Array<{ key: string; label: string; titles: string[] }> = [];

    if (director) {
      const directorCredits = await tmdbFetch<TmdbPersonMovieCreditsResponse>(`/person/${director.id}/movie_credits`, {
        language: 'en-US'
      });

      const directed = (directorCredits.crew || [])
        .filter((item) => item.job === 'Director')
        .map((item) => ({ id: item.id, title: item.title, release_date: item.release_date }));

      rows.push({
        key: `director-${director.id}`,
        label: `More by ${director.name}`,
        titles: normalizeTitleList(directed, tmdbId, 20)
      });
    }

    for (const actor of topCast) {
      const actorCredits = await tmdbFetch<TmdbPersonMovieCreditsResponse>(`/person/${actor.id}/movie_credits`, {
        language: 'en-US'
      });
      const acted = (actorCredits.cast || []).map((item) => ({
        id: item.id,
        title: item.title,
        release_date: item.release_date
      }));

      rows.push({
        key: `actor-${actor.id}`,
        label: `More with ${actor.name}`,
        titles: normalizeTitleList(acted, tmdbId, 12)
      });
    }

    return NextResponse.json({
      hero: {
        tmdbId: details.id,
        title: details.title,
        year: details.release_date ? Number(details.release_date.slice(0, 4)) : 0,
        poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
        overview: details.overview || ''
      },
      rows: rows.filter((row) => row.titles.length > 0)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build discover context';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
