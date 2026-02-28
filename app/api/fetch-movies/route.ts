import { NextResponse } from 'next/server';

import { SERVICES, getServiceLogoPath, normalizeServiceName } from '@/lib/services';
import {
  buildPosterUrl,
  getTmdbGenreMap,
  getTmdbMovieDetails,
  getTmdbWatchProviders,
  searchTmdbMovie
} from '@/lib/tmdb';
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

function preferredServiceUrl(serviceId: string, title: string): string | null {
  const encoded = encodeURIComponent(title);
  if (serviceId === 'netflix') {
    return `https://www.netflix.com/search?q=${encoded}`;
  }
  if (serviceId === 'hbo') {
    return `https://play.max.com/search?q=${encoded}`;
  }
  if (serviceId === 'hulu') {
    return `https://www.hulu.com/search?q=${encoded}`;
  }
  if (serviceId === 'prime') {
    return `https://www.amazon.com/s?k=${encoded}&i=instant-video`;
  }
  if (serviceId === 'apple') {
    return `https://tv.apple.com/search?term=${encoded}`;
  }
  if (serviceId === 'disney') {
    return `https://www.disneyplus.com/search/${encoded}`;
  }
  if (serviceId === 'peacock') {
    return `https://www.peacocktv.com/watch/search?query=${encoded}`;
  }
  if (serviceId === 'paramount') {
    return `https://www.paramountplus.com/search/?term=${encoded}`;
  }
  if (serviceId === 'tubi') {
    return `https://tubitv.com/search/${encoded}`;
  }
  if (serviceId === 'plex') {
    return `https://watch.plex.tv/search?q=${encoded}`;
  }
  if (serviceId === 'pluto') {
    return `https://pluto.tv/en/search?query=${encoded}`;
  }
  if (serviceId === 'roku') {
    return `https://therokuchannel.roku.com/search/${encoded}`;
  }
  return null;
}

function normalizeStreamingUrl(serviceId: string, title: string, rawUrl: string): string {
  const serviceUrlMap: Record<string, RegExp> = {
    netflix: /netflix\.com/i,
    hbo: /(max\.com|hbo\.com|hbomax\.com)/i,
    hulu: /hulu\.com/i,
    prime: /(amazon\.com|primevideo\.com)/i,
    apple: /(apple\.com|tv\.apple\.com)/i,
    disney: /disneyplus\.com/i,
    peacock: /peacocktv\.com/i,
    paramount: /paramountplus\.com/i,
    tubi: /tubi(tv)?\.com/i,
    plex: /plex\.tv/i,
    pluto: /pluto\.tv/i,
    roku: /(roku\.com|therokuchannel)/i
  };

  const isDirect = serviceUrlMap[serviceId]?.test(rawUrl) ?? false;
  if (isDirect) {
    return rawUrl;
  }

  return preferredServiceUrl(serviceId, title) ?? rawUrl;
}

function toStreamingSources(rawSources: Array<{ name: string; web_url: string }>, movieTitle: string): StreamingSource[] {
  const filtered = rawSources
    .map((source) => {
      const serviceId = normalizeServiceName(source.name);
      if (!serviceId) {
        return null;
      }

      const service = SERVICES.find((item) => item.id === serviceId);
      return {
        name: service?.name ?? source.name,
        web_url: normalizeStreamingUrl(serviceId, movieTitle, source.web_url),
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
      tmdbTitle: tmdbMatch.title,
      originalTitle: title,
      year: tmdbYear,
      imdbId: details.imdb_id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.warn(`[watchmode] resolve failed for "${tmdbMatch.title}": ${message}`);
    watchmodeId = null;
  }

  let streamingSources: StreamingSource[] = [];
  if (watchmodeId) {
    try {
      const sources = await getWatchmodeSources(watchmodeId);
      streamingSources = toStreamingSources(sources, tmdbMatch.title);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.warn(`[watchmode] sources failed for "${tmdbMatch.title}" (${watchmodeId}): ${message}`);
      streamingSources = [];
    }
  }

  if (!streamingSources.length) {
    try {
      const tmdbProviders = await getTmdbWatchProviders(tmdbMatch.id);
      streamingSources = toStreamingSources(tmdbProviders, tmdbMatch.title);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.warn(`[tmdb] watch providers failed for "${tmdbMatch.title}" (${tmdbMatch.id}): ${message}`);
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
