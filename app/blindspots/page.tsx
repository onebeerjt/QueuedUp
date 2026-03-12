'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import FilterBar from '@/app/components/FilterBar';
import MovieSpotlight from '@/app/components/MovieSpotlight';
import BlindSpotRow from '@/app/components/blindspots/BlindSpotRow';
import { movieIsAvailable } from '@/lib/discovery';
import { blindSpotReason } from '@/lib/recommendation-rules';
import type { Movie } from '@/types/movie';

interface BlindSpotCandidate {
  title: string;
  reason: string;
}

const MAX_SOURCE_TITLES = 150;
const MAX_RECOMMENDATIONS = 100;

export default function BlindSpotsPage(): JSX.Element {
  const [username, setUsername] = useState('');
  const [listUrl, setListUrl] = useState('');
  const [movieSeed, setMovieSeed] = useState('');
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [rememberedServices, setRememberedServices] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('best-match');
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [hero, setHero] = useState<Movie | null>(null);
  const [toast, setToast] = useState('');
  const bootedFromQuery = useRef(false);

  async function runBlindSpots(titles: string[]): Promise<void> {
    if (!titles.length) {
      return;
    }

    setLoading(true);
    try {
      const ctxRes = await fetch('/api/blindspots-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles, maxCandidates: MAX_RECOMMENDATIONS })
      });
      const ctxPayload = (await ctxRes.json()) as { candidates?: BlindSpotCandidate[]; error?: string };
      if (!ctxRes.ok) {
        throw new Error(ctxPayload.error || 'Failed to build blind spots');
      }

      const candidates = (ctxPayload.candidates || []).slice(0, MAX_RECOMMENDATIONS);
      const titlesToFetch = candidates.map((candidate) => candidate.title);
      const movieRes = await fetch('/api/fetch-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles: titlesToFetch })
      });
      const moviePayload = (await movieRes.json()) as Movie[] | { error?: string };
      if (!movieRes.ok) {
        throw new Error((moviePayload as { error?: string }).error || 'Failed to fetch movies');
      }

      const fetched = moviePayload as Movie[];
      const reasonMap: Record<string, string> = {};
      for (const movie of fetched) {
        const matched = candidates.find((candidate) => candidate.title.toLowerCase() === movie.title.toLowerCase());
        reasonMap[movie.id] = matched?.reason || blindSpotReason(movie, []);
      }

      setMovies(fetched);
      setReasons(reasonMap);
      setHero(fetched[0] || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Blind spots failed';
      setToast(message);
      window.setTimeout(() => setToast(''), 2200);
    } finally {
      setLoading(false);
    }
  }

  async function analyzePublicInput(): Promise<void> {
    if (movieSeed.trim()) {
      await runBlindSpots([movieSeed.trim()]);
      return;
    }

    const query = listUrl.trim()
      ? `url=${encodeURIComponent(listUrl.trim())}`
      : `username=${encodeURIComponent(username.trim())}`;

    const res = await fetch(`/api/letterboxd-public?${query}`);
    const payload = (await res.json()) as { titles?: string[]; message?: string; error?: string };

    if (!res.ok) {
      throw new Error(payload.error || 'Failed to read public Letterboxd data');
    }

    const titles = (payload.titles || []).slice(0, MAX_SOURCE_TITLES);
    if (!titles.length) {
      throw new Error(
        payload.message ||
          'Couldn’t read enough public data from this profile. Try a public list URL or search a movie instead.'
      );
    }

    await runBlindSpots(titles);
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
  }

  async function handleShare(): Promise<void> {
    const url = new URL(window.location.href);
    if (movieSeed.trim()) {
      url.searchParams.set('seed', movieSeed.trim());
      url.searchParams.delete('username');
      url.searchParams.delete('url');
    } else if (username.trim()) {
      url.searchParams.set('username', username.trim());
      url.searchParams.delete('seed');
      url.searchParams.delete('url');
    } else if (listUrl.trim()) {
      url.searchParams.set('url', listUrl.trim());
      url.searchParams.delete('seed');
      url.searchParams.delete('username');
    }
    await navigator.clipboard.writeText(url.toString());
    setToast('Link copied!');
    window.setTimeout(() => setToast(''), 1800);
  }

  const filtered = useMemo(() => {
    const shown = movies.filter((movie) => movieIsAvailable(movie, activeServices));
    if (sortBy === 'rating-desc') {
      return [...shown].sort((a, b) => b.imdbRating - a.imdbRating);
    }
    if (sortBy === 'year-desc') {
      return [...shown].sort((a, b) => b.year - a.year);
    }
    if (sortBy === 'title-asc') {
      return [...shown].sort((a, b) => a.title.localeCompare(b.title));
    }
    return shown;
  }, [movies, activeServices, sortBy]);

  useEffect(() => {
    if (bootedFromQuery.current || typeof window === 'undefined') {
      return;
    }
    bootedFromQuery.current = true;

    const url = new URL(window.location.href);
    const seed = (url.searchParams.get('seed') || '').trim();
    const queryUsername = (url.searchParams.get('username') || '').trim();
    const queryListUrl = (url.searchParams.get('url') || '').trim();

    if (seed) {
      setMovieSeed(seed);
      void runBlindSpots([seed]);
      return;
    }

    if (queryUsername || queryListUrl) {
      setUsername(queryUsername);
      setListUrl(queryListUrl);
      void (async () => {
        try {
          const query = queryListUrl
            ? `url=${encodeURIComponent(queryListUrl)}`
            : `username=${encodeURIComponent(queryUsername)}`;
          const res = await fetch(`/api/letterboxd-public?${query}`);
          const payload = (await res.json()) as { titles?: string[]; message?: string; error?: string };
          if (!res.ok) {
            throw new Error(payload.error || 'Failed to read public Letterboxd data');
          }
          const titles = (payload.titles || []).slice(0, MAX_SOURCE_TITLES);
          if (titles.length) {
            await runBlindSpots(titles);
          }
        } catch {
          // Keep page usable even if bootstrapped query fails.
        }
      })();
    }
  }, []);

  return (
    <main className="page">
      <section className="discoverSearch">
        <h1>Streaming Blind Spots</h1>
        <p className="discoverHint">Analyze a public Letterboxd profile or list, or start from one movie title.</p>
        <input
          type="text"
          className="discoverInput"
          placeholder="Movie seed (optional)"
          value={movieSeed}
          onChange={(event) => setMovieSeed(event.target.value)}
        />
        <input
          type="text"
          className="discoverInput"
          placeholder="Public Letterboxd username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <input
          type="url"
          className="discoverInput"
          placeholder="Public Letterboxd list URL"
          value={listUrl}
          onChange={(event) => setListUrl(event.target.value)}
        />
        <button type="button" className="primaryButton" disabled={loading} onClick={() => void analyzePublicInput()}>
          {loading ? 'Analyzing…' : 'Find Blind Spots'}
        </button>
      </section>

      {(hero || loading) && (
        <FilterBar
          totalCount={movies.length}
          visibleCount={filtered.length}
          activeServices={activeServices}
          onToggleService={toggleService}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onTonight={handleTonight}
          onShare={handleShare}
        />
      )}

      {hero ? <MovieSpotlight movie={hero} unavailable={!movieIsAvailable(hero, activeServices)} /> : null}

      <section className="blindSpotList">
        {filtered.map((movie) => (
          <BlindSpotRow key={movie.id} movie={movie} reason={reasons[movie.id] || 'Connected blind spot'} onSelect={setHero} />
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
