'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import FilterBar from '@/app/components/FilterBar';
import DiscoverRow from '@/app/components/discover/DiscoverRow';
import MovieSpotlight from '@/app/components/MovieSpotlight';
import { getCourseBySlug } from '@/lib/course-data';
import { movieIsAvailable, sortMovies } from '@/lib/discovery';
import type { Movie } from '@/types/movie';

export default function CourseDetailPage(): JSX.Element {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const course = getCourseBySlug(slug);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [rememberedServices, setRememberedServices] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('rating-desc');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    if (!course) {
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        const response = await fetch('/api/fetch-movies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titles: course.movies.map((movie) => movie.title) })
        });
        if (!response.ok) {
          throw new Error('Failed to load course movies');
        }
        const data = (await response.json()) as Movie[];
        setMovies(data);
        setSelectedMovie(data[0] || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [course]);

  const sorted = useMemo(() => sortMovies(movies, sortBy), [movies, sortBy]);
  const streamable = useMemo(
    () => sorted.filter((movie) => movieIsAvailable(movie, activeServices)),
    [sorted, activeServices]
  );
  const unavailable = useMemo(
    () => sorted.filter((movie) => !movieIsAvailable(movie, activeServices)),
    [sorted, activeServices]
  );

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
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Clipboard can fail in some browsers; safe to ignore for now.
    }
  }

  if (!course) {
    return (
      <main className="page">
        <section className="homeNavCard" style={{ maxWidth: 'none' }}>
          <div>
            <p className="homeNavEyebrow">Not Found</p>
            <h2>Course not found</h2>
            <p>Try another journey from the course library.</p>
          </div>
          <Link href="/courses" className="primaryButton" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            All Courses
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="homeNavCard" style={{ maxWidth: 'none' }}>
        <div>
          <p className="homeNavEyebrow">{course.theme}</p>
          <h2>{course.title}</h2>
          <p>{course.description}</p>
        </div>
        <Link href="/courses" className="primaryButton" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          All Courses
        </Link>
      </section>

      <FilterBar
        totalCount={movies.length}
        visibleCount={streamable.length}
        activeServices={activeServices}
        onToggleService={toggleService}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onTonight={handleTonight}
        onShare={handleShare}
      />

      <MovieSpotlight
        movie={selectedMovie || streamable[0] || sorted[0] || null}
        unavailable={Boolean((selectedMovie || streamable[0] || sorted[0]) && !movieIsAvailable(selectedMovie || streamable[0] || sorted[0], activeServices))}
      />

      {loading ? <p className="discoverHint">Loading course...</p> : null}

      <section className="discoverRowsWrap">
        <h3 className="discoverRowTitle">Available on your selected services</h3>
        <DiscoverRow title="Streamable now" movies={streamable} onSelect={setSelectedMovie} />
      </section>

      <section className="discoverRowsWrap">
        <h3 className="discoverRowTitle">Unavailable right now</h3>
        <p className="discoverHint">Still part of the journey; switch services to unlock more.</p>
        <DiscoverRow title="Course catalog" movies={unavailable} onSelect={setSelectedMovie} />
      </section>
    </main>
  );
}
