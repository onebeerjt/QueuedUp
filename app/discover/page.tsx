'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import FilterBar from '@/app/components/FilterBar';
import DiscoveryHero from '@/app/components/discovery/DiscoveryHero';
import DynamicSection from '@/app/components/discovery/DynamicSection';
import PathRow from '@/app/components/discovery/PathRow';
import DiscoverRow from '@/app/components/discover/DiscoverRow';
import { dedupeMovies, movieIsAvailable, sortMovies } from '@/lib/discovery';
import { type LoadedRowLike, generateDiscoverySections } from '@/lib/path-generator';
import { nextSeed } from '@/lib/seeded-variation';
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
  const [tab, setTab] = useState<'discovery' | 'tonight' | 'blindspots'>('discovery');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [rememberedServices, setRememberedServices] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('rating-desc');
  const [hero, setHero] = useState<Movie | null>(null);
  const [rows, setRows] = useState<LoadedRow[]>([]);
  const [toast, setToast] = useState('');
  const [variationSeed, setVariationSeed] = useState(1);

  const bootedFromQuery = useRef(false);

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

  async function loadDiscover(seedMovie: SearchResult, initialSeed = 1): Promise<void> {
    setLoading(true);
    setResults([]);
    setQuery(seedMovie.title);

    try {
      const contextRes = await fetch(`/api/discover-context?tmdbId=${seedMovie.id}`);
      const contextPayload = (await contextRes.json()) as DiscoverContextResponse | { error?: string };
      if (!contextRes.ok) {
        throw new Error((contextPayload as { error?: string }).error || 'Failed to load context');
      }

      const context = contextPayload as DiscoverContextResponse;
      const [heroMovie] = await fetchMoviesByTitles([context.hero.title]);
      setHero(heroMovie || null);

      const loaded = await mapWithConcurrency(context.rows, 5, async (row) => {
        const movies = await fetchMoviesByTitles(row.titles);
        const deduped = dedupeMovies(movies);
        return { key: row.key, label: row.label, movies: deduped };
      });

      setRows(loaded);
      setVariationSeed(initialSeed);
      setTab('discovery');
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
    setTab('tonight');
    document.getElementById('discover-rows')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleShare(): Promise<void> {
    const url = new URL(window.location.href);
    if (hero?.title) {
      url.searchParams.set('seed', hero.title);
    }
    url.searchParams.set('v', String(variationSeed));
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
    const seen = new Set<string>();
    return rows
      .map((row) => {
        const movies = sortMovies(row.movies, sortBy)
          .filter((movie) => movieIsAvailable(movie, activeServices))
          .filter((movie) => {
            if (seen.has(movie.id)) {
              return false;
            }
            seen.add(movie.id);
            return true;
          })
          .slice(0, 20);

        return {
          ...row,
          movies
        };
      })
      .filter((row) => row.movies.length > 0);
  }, [rows, activeServices, sortBy]);

  const generated = useMemo(
    () => generateDiscoverySections(hero, filteredRows as LoadedRowLike[], variationSeed),
    [hero, filteredRows, variationSeed]
  );

  const totalCount = useMemo(() => rows.reduce((acc, row) => acc + row.movies.length, 0), [rows]);
  const visibleCount = useMemo(() => filteredRows.reduce((acc, row) => acc + row.movies.length, 0), [filteredRows]);

  useEffect(() => {
    if (bootedFromQuery.current || typeof window === 'undefined') {
      return;
    }
    bootedFromQuery.current = true;

    const url = new URL(window.location.href);
    const seed = (url.searchParams.get('seed') || '').trim();
    const seedValue = Number(url.searchParams.get('v') || '1');
    if (seedValue > 0 && Number.isFinite(seedValue)) {
      setVariationSeed(seedValue);
    }
    if (!seed) {
      return;
    }

    setQuery(seed);
    void (async () => {
      try {
        const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(seed)}`);
        const payload = (await res.json()) as { results?: SearchResult[] };
        const first = payload.results?.[0];
        if (first) {
          await loadDiscover(first, seedValue > 0 && Number.isFinite(seedValue) ? seedValue : 1);
        }
      } catch {
        // Keep page interactive if initial query bootstrap fails.
      }
    })();
  }, []);

  function regenerate(): void {
    setVariationSeed((prev) => nextSeed(prev));
  }

  return (
    <main className="page">
      <section className="discoverSearch">
        <h1>Connected Discovery</h1>
        <p className="discoverHint">Search a movie and explore connected films you can stream tonight.</p>
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

      <div className="viewSwitch" role="tablist" aria-label="Discovery tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'discovery'}
          className={`viewSwitchButton ${tab === 'discovery' ? 'active' : ''}`}
          onClick={() => setTab('discovery')}
        >
          Movie Discovery
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tonight'}
          className={`viewSwitchButton ${tab === 'tonight' ? 'active' : ''}`}
          onClick={() => setTab('tonight')}
        >
          Watch Tonight
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'blindspots'}
          className={`viewSwitchButton ${tab === 'blindspots' ? 'active' : ''}`}
          onClick={() => setTab('blindspots')}
        >
          Blind Spots
        </button>
      </div>

      <DiscoveryHero
        movie={hero}
        unavailable={hero ? !movieIsAvailable(hero, activeServices) : false}
        onShowTonight={() => setTab('tonight')}
        onShowDouble={() => {
          setTab('tonight');
          document.getElementById('double-feature')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onShowTriple={() => {
          setTab('tonight');
          document.getElementById('triple-feature')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onRegenerate={regenerate}
      />

      {tab === 'discovery' ? (
        <section id="discover-rows" className="discoverRowsWrap">
          {generated.dynamicSections.map((section) => (
            <DynamicSection
              key={`${section.key}-${variationSeed}`}
              title={section.title}
              subtitle={section.subtitle}
              movies={section.movies}
              onSelect={setHero}
            />
          ))}

          <h3 className="discoverRowTitle">Rabbit Hole Paths</h3>
          {generated.paths.map((path) => (
            <PathRow
              key={`${path.title}-${variationSeed}`}
              title={path.title}
              routeLabel={path.routeLabel}
              movies={path.movies}
              onSelect={setHero}
            />
          ))}
        </section>
      ) : null}

      {tab === 'tonight' ? (
        <section className="discoverRowsWrap">
          <h3 className="discoverRowTitle">Best Follow-Up</h3>
          {generated.featuredPick ? (
            <DiscoverRow title="Top pick" movies={[generated.featuredPick]} onSelect={setHero} />
          ) : (
            <p className="discoverHint">No streamable recommendation found for current filters.</p>
          )}

          <h3 id="double-feature" className="discoverRowTitle">Perfect Double Feature</h3>
          <DiscoverRow title="Double feature" movies={generated.doubleFeature} onSelect={setHero} />

          <h3 id="triple-feature" className="discoverRowTitle">Triple Feature Tonight</h3>
          <DiscoverRow title="Triple feature" movies={generated.tripleFeature} onSelect={setHero} />
        </section>
      ) : null}

      {tab === 'blindspots' ? (
        <section className="discoverRowsWrap">
          <h3 className="discoverRowTitle">Streaming Blind Spots</h3>
          <p className="discoverHint">Analyze a public Letterboxd profile or list to generate streamable blind spots.</p>
          <Link href="/blindspots" className="primaryButton" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            Open Blind Spots
          </Link>
        </section>
      ) : null}

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          <span className="check">✓</span> {toast}
        </div>
      ) : null}
    </main>
  );
}
