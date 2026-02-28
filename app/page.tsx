'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import FilterBar from '@/app/components/FilterBar';
import MovieGrid from '@/app/components/MovieGrid';
import MovieInlineFocus from '@/app/components/MovieInlineFocus';
import MovieSpotlight from '@/app/components/MovieSpotlight';
import PastePanel from '@/app/components/PastePanel';
import ProgressBar from '@/app/components/ProgressBar';
import { normalizeServiceName } from '@/lib/services';
import { decodeShareState, encodeShareState } from '@/lib/utils';
import type { Movie } from '@/types/movie';

type InputMode = 'paste' | 'letterboxd';
type ViewMode = 'spotlight' | 'inline';

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

export default function HomePage(): JSX.Element {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [rememberedServices, setRememberedServices] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('best-match');
  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [panelHidden, setPanelHidden] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('spotlight');

  const shareLoadedRef = useRef(false);
  const progressTimerRef = useRef<number | null>(null);

  const filteredMovies = useMemo(() => {
    const sorted = sortMovies(movies, sortBy);
    if (!activeServices.length) {
      return sorted;
    }

    const available = sorted.filter((movie) => movieIsAvailable(movie, activeServices));
    const unavailable = sorted.filter((movie) => !movieIsAvailable(movie, activeServices));
    return [...available, ...unavailable];
  }, [movies, sortBy, activeServices]);

  useEffect(() => {
    if (!loading && progress.current >= progress.total && progress.total > 0) {
      const timer = window.setTimeout(() => setProgressVisible(false), 600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [loading, progress.current, progress.total]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const share = new URLSearchParams(window.location.search).get('share');
    if (!share || shareLoadedRef.current) {
      return;
    }

    shareLoadedRef.current = true;
    try {
      const decoded = decodeShareState(share);
      const normalizedServices = decoded.services
        .map((service) => service.trim().toLowerCase())
        .filter((service) => service.length > 0);

      setActiveServices(normalizedServices);
      setRememberedServices(normalizedServices);
      if (decoded.titles.length) {
        void handleLoadTitles(decoded.titles, normalizedServices);
      }
    } catch {
      // Ignore malformed share params.
    }
  }, []);

  async function runFetch(titles: string[]): Promise<Movie[]> {
    const response = await fetch('/api/fetch-movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titles })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || 'Unable to fetch movies');
    }

    return (await response.json()) as Movie[];
  }

  async function handleLoadTitles(titles: string[], servicesOverride?: string[]): Promise<void> {
    if (!titles.length) {
      return;
    }

    setPanelHidden(true);
    setLoading(true);
    setProgressVisible(true);
    setProgress({ current: 0, total: titles.length });

    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
    }

    progressTimerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev.current >= prev.total - 1) {
          return prev;
        }
        return { ...prev, current: prev.current + 1 };
      });
    }, 180);

    try {
      const fetchedMovies = await runFetch(titles);
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
      setMovies(fetchedMovies);
      setSelectedMovieId(fetchedMovies[0]?.id ?? null);
      setProgress({ current: titles.length, total: titles.length });

      if (servicesOverride) {
        setActiveServices(servicesOverride);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load movies';
      setToast(message);
      window.setTimeout(() => setToast(''), 2200);
    } finally {
      setLoading(false);
    }
  }

  async function handleLetterboxdImport(url: string): Promise<void> {
    try {
      const response = await fetch(`/api/scrape-letterboxd?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to import Letterboxd list');
      }

      const data = (await response.json()) as { titles: string[] };
      await handleLoadTitles(data.titles);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import Letterboxd list';
      setToast(message);
      window.setTimeout(() => setToast(''), 2200);
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
    document.getElementById('movie-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleShare(): Promise<void> {
    if (!movies.length) {
      return;
    }

    const shareParam = encodeShareState(movies, activeServices);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('share', shareParam);

    try {
      await navigator.clipboard.writeText(currentUrl.toString());
      setToast('Link copied!');
      window.setTimeout(() => setToast(''), 2000);
    } catch {
      setToast('Clipboard unavailable');
      window.setTimeout(() => setToast(''), 2000);
    }
  }

  const visibleCount = useMemo(
    () => filteredMovies.filter((movie) => movieIsAvailable(movie, activeServices)).length,
    [filteredMovies, activeServices]
  );

  useEffect(() => {
    if (!filteredMovies.length) {
      setSelectedMovieId(null);
      return;
    }
    if (!selectedMovieId || !filteredMovies.some((movie) => movie.id === selectedMovieId)) {
      setSelectedMovieId(filteredMovies[0].id);
    }
  }, [filteredMovies, selectedMovieId]);

  const selectedMovie = useMemo(
    () => filteredMovies.find((movie) => movie.id === selectedMovieId) ?? filteredMovies[0] ?? null,
    [filteredMovies, selectedMovieId]
  );
  const selectedUnavailable = selectedMovie ? !movieIsAvailable(selectedMovie, activeServices) : false;

  return (
    <main className="page">
      <PastePanel
        hidden={panelHidden}
        loading={loading}
        inputMode={inputMode}
        onModeChange={setInputMode}
        onSubmitTitles={handleLoadTitles}
        onSubmitLetterboxd={handleLetterboxdImport}
      />

      {(movies.length > 0 || loading) && (
        <FilterBar
          totalCount={movies.length}
          visibleCount={visibleCount}
          activeServices={activeServices}
          onToggleService={toggleService}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onTonight={handleTonight}
          onShare={handleShare}
        />
      )}

      <ProgressBar current={progress.current} total={progress.total} visible={progressVisible} />

      {movies.length > 0 ? (
        <div className="viewSwitch" role="tablist" aria-label="Layout mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'spotlight'}
            className={`viewSwitchButton ${viewMode === 'spotlight' ? 'active' : ''}`}
            onClick={() => setViewMode('spotlight')}
          >
            Spotlight
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'inline'}
            className={`viewSwitchButton ${viewMode === 'inline' ? 'active' : ''}`}
            onClick={() => setViewMode('inline')}
          >
            Inline Expand
          </button>
        </div>
      ) : null}

      {movies.length > 0 && viewMode === 'spotlight' ? (
        <MovieSpotlight movie={selectedMovie} unavailable={selectedUnavailable} />
      ) : null}
      {movies.length > 0 && viewMode === 'inline' ? (
        <MovieInlineFocus movie={selectedMovie} unavailable={selectedUnavailable} />
      ) : null}

      {movies.length > 0 ? (
        <MovieGrid
          movies={filteredMovies}
          activeServices={activeServices}
          selectedMovieId={selectedMovieId}
          onSelectMovie={setSelectedMovieId}
        />
      ) : null}

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          <span className="check">✓</span> {toast}
        </div>
      ) : null}
    </main>
  );
}
