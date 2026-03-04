'use client';

import { useMemo, useState } from 'react';

import FilterBar from '@/app/components/FilterBar';
import MovieSpotlight from '@/app/components/MovieSpotlight';
import DiscoverRow from '@/app/components/discover/DiscoverRow';
import { normalizeServiceName } from '@/lib/services';
import type { Movie } from '@/types/movie';

interface SearchResult {
  id: number;
  title: string;
  year: number;
  poster: string;
}

interface DiscoverContextResponse {
  hero: {
    tmdbId: number;
    title: string;
    year: number;
    poster: string;
    overview: string;
  };
  rows: Array<{ key: string; label: string; titles: string[] }>;
}

interface LoadedRow {
  key: string;
  label: string;
  movies: Movie[];
}

function movieIsAvailable(movie: Movie, activeServices: string[]): boolean {
  if (!activeServices.length) {
    return true;
  }

  const sourceIds = movie.streamingSources
    .map((source) => normalizeServiceName(source.name))
    .filter(Boolean) as string[];
  return sourceIds.some((id) => activeServices.includes(id));
}

function sortMovies(movies: Movie[], sortBy: string): Movie[] {
  const next = [...movies];
  if (sortBy === 'rating-desc') {
    next.sort((a, b) => b.imdbRating - a.imdbRating);
  } else if (sortBy === 'year-desc') {
    next.sort((a, b) => b.year - a.year);
  } else if (sortBy === 'title-asc') {
    next.sort((a, b) => a.title.localeCompare(b.title));
  }
  return next;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const output: R[] = new Array(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(workers);
  return output;
}

export default function DiscoverPage(): JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [rememberedServices, setRememberedServices] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('best-match');
  const [hero, setHero] = useState<Movie | null>(null);
  const [rows, setRows] = useState<LoadedRow[]>([]);
  const [toast, setToast] = useState('');

  async function handleSearchInput(value: string): Promise<void> {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(value.trim())}`);
      const payload = (await res.json()) as { results?: SearchResult[]; error?: string };
      if (!res.ok) {
        throw new Error(payload.error || 'Search failed');
      }
      setResults(payload.results || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      setToast(message);
      window.setTimeout(() => setToast(''), 2200);
    } finally {
      setSearching(false);
    }
  }

  async function fetchMoviesByTitles(titles: string[]): Promise<Movie[]> {
    const res = await fetch('/api/fetch-movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titles })
    });

    const payload = (await res.json()) as Movie[] | { error?: string };
    if (!res.ok) {
      throw new Error((payload as { error?: string }).error || 'Movie fetch failed');
    }
    return payload as Movie[];
  }

  async function loadDiscover(seed: SearchResult): Promise<void> {
    setLoading(true);
    setResults([]);
    setQuery(seed.title);

    try {
      const contextRes = await fetch(`/api/discover-context?tmdbId=${seed.id}`);
      const contextPayload = (await contextRes.json()) as DiscoverContextResponse | { error?: string };
      if (!contextRes.ok) {
        throw new Error((contextPayload as { error?: string }).error || 'Failed to load context');
      }

      const context = contextPayload as DiscoverContextResponse;

      const [heroMovie] = await fetchMoviesByTitles([context.hero.title]);
      setHero(heroMovie || null);

      const loaded = await mapWithConcurrency(context.rows, 5, async (row) => {
        const movies = await fetchMoviesByTitles(row.titles);
        const deduped = movies.filter((movie, index, arr) => arr.findIndex((m) => m.id === movie.id) === index);
        return { key: row.key, label: row.label, movies: deduped };
      });

      setRows(loaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load discover';
      setToast(message);
      window.setTimeout(() => setToast(''), 2200);
    } finally {
      setLoading(false);
    }
  }

  function toggleService(serviceId: string): void {
    setActiveServices((prev) => {
      const exists = prev.includes(serviceId);
      const next = exists ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      if (next.length) {
        setRememberedServices(next);
      }
      return next;
    });
  }

  function handleTonight(): void {
    const next = rememberedServices.length ? rememberedServices : activeServices;
    setActiveServices(next);
    setSortBy('rating-desc');
    document.getElementById('discover-rows')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleShare(): Promise<void> {
    const url = new URL(window.location.href);
    if (hero?.title) {
      url.searchParams.set('seed', hero.title);
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setToast('Link copied!');
      window.setTimeout(() => setToast(''), 1800);
    } catch {
      setToast('Clipboard unavailable');
      window.setTimeout(() => setToast(''), 1800);
    }
  }

  const filteredRows = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      movies: sortMovies(row.movies, sortBy).filter((movie) => movieIsAvailable(movie, activeServices))
    }));
  }, [rows, activeServices, sortBy]);

  const totalCount = useMemo(() => rows.reduce((acc, row) => acc + row.movies.length, 0), [rows]);
  const visibleCount = useMemo(() => filteredRows.reduce((acc, row) => acc + row.movies.length, 0), [filteredRows]);

  return (
    <main className="page">
      <section className="discoverSearch">
        <h1>Connected Discovery</h1>
        <input
          type="text"
          value={query}
          onChange={(event) => void handleSearchInput(event.target.value)}
          placeholder="Search one movie title..."
          className="discoverInput"
        />
        {searching ? <p className="discoverHint">Searching…</p> : null}
        {!searching && results.length > 0 ? (
          <div className="discoverResults">
            {results.map((result) => (
              <button key={result.id} type="button" className="discoverResultItem" onClick={() => void loadDiscover(result)}>
                <span>{result.title}</span>
                <small>{result.year || '—'}</small>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {(hero || loading) && (
        <FilterBar
          totalCount={totalCount}
          visibleCount={visibleCount}
          activeServices={activeServices}
          onToggleService={toggleService}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onTonight={handleTonight}
          onShare={handleShare}
        />
      )}

      {hero ? <MovieSpotlight movie={hero} unavailable={!movieIsAvailable(hero, activeServices)} /> : null}

      <section id="discover-rows" className="discoverRowsWrap">
        {filteredRows.map((row) => (
          <DiscoverRow
            key={row.key}
            title={row.label}
            movies={row.movies}
            onSelect={(movie) => {
              setHero(movie);
              document.getElementById('discover-rows')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        ))}
      </section>

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          <span className="check">✓</span> {toast}
        </div>
      ) : null}
    </main>
  );
}
