import { NextResponse } from 'next/server';

import { SERVICES, getServiceLogoPath, normalizeServiceName } from '@/lib/services';
import { buildPosterUrl, getTmdbGenreMap, getTmdbMovieDetails, searchTmdbMovie } from '@/lib/tmdb';
import { processInBatches, slugify } from '@/lib/utils';
import { getWatchmodeSources, resolveWatchmodeTitleId } from '@/lib/watchmode';
import type { Movie, StreamingSource } from '@/types/movie';

interface FetchMoviesRequest {
  titles: string[];
}

function dedupeSources(sources: StreamingSource[]): StreamingSource[] {
  const map = new Map<string, StreamingSource>();
  for (const source of sources) {
    const normalized = normalizeServiceName(source.name);
    const key = normalized ?? source.name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, source);
    }
  }
  return Array.from(map.values());
}

function toStreamingSources(rawSources: Array<{ name: string; web_url: string }>): StreamingSource[] {
  const filtered = rawSources
    .map((source) => {
      const serviceId = normalizeServiceName(source.name);
      if (!serviceId) {
        return null;
      }

      const service = SERVICES.find((item) => item.id === serviceId);
      return {
        name: service?.name ?? source.name,
        web_url: source.web_url,
        logo: getServiceLogoPath(source.name)
      } satisfies StreamingSource;
    })
    .filter((source): source is StreamingSource => Boolean(source));

  return dedupeSources(filtered);
}

async function fetchMovieByTitle(title: string, genreMap: Map<number, string>): Promise<Movie> {
  const tmdbMatch = await searchTmdbMovie(title);

  if (!tmdbMatch) {
    return {
      id: slugify(title),
      title,
      year: 0,
      poster: '',
      overview: 'No match found on TMDB.',
      genres: [],
      runtime: 0,
      imdbRating: 0,
      streamingSources: [],
      notFound: true
    };
  }

  const details = await getTmdbMovieDetails(tmdbMatch.id);
  const tmdbYear = tmdbMatch.release_date ? Number(tmdbMatch.release_date.slice(0, 4)) : undefined;

  let watchmodeId: number | null = null;
  try {
    watchmodeId = await resolveWatchmodeTitleId({
      tmdbId: tmdbMatch.id,
      tmdbTitle: tmdbMatch.title,
      originalTitle: title,
      year: tmdbYear,
      imdbId: details.imdb_id
    });
  } catch {
    watchmodeId = null;
  }

  let streamingSources: StreamingSource[] = [];
  if (watchmodeId) {
    try {
      const sources = await getWatchmodeSources(watchmodeId);
      streamingSources = toStreamingSources(sources);
    } catch {
      streamingSources = [];
    }
  }

  const genres = tmdbMatch.genre_ids.map((id) => genreMap.get(id)).filter((value): value is string => Boolean(value));

  return {
    id: String(tmdbMatch.id),
    title: tmdbMatch.title,
    year: tmdbYear ?? 0,
    poster: buildPosterUrl(tmdbMatch.poster_path),
    overview: tmdbMatch.overview || 'No overview available.',
    genres,
    runtime: details.runtime ?? 0,
    imdbRating: Number(tmdbMatch.vote_average.toFixed(1)),
    streamingSources
  };
}

export async function POST(request: Request): Promise<NextResponse<Movie[] | { error: string }>> {
  try {
    const body = (await request.json()) as FetchMoviesRequest;
    const titles = Array.isArray(body.titles)
      ? body.titles.map((title) => title.trim()).filter((title) => title.length > 0)
      : [];

    if (!titles.length) {
      return NextResponse.json({ error: 'No titles provided' }, { status: 400 });
    }

    const genreMap = await getTmdbGenreMap();
    const movies = await processInBatches(
      titles,
      8,
      async (title) => fetchMovieByTitle(title, genreMap),
      100
    );

    return NextResponse.json(movies);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch movies';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
