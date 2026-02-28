import { Fragment } from 'react';

import { normalizeServiceName } from '@/lib/services';
import type { Movie } from '@/types/movie';

import MovieCard from './MovieCard';
import MovieRowExpand from './MovieRowExpand';

interface MovieGridProps {
  movies: Movie[];
  activeServices: string[];
  selectedMovieId: string | null;
  onSelectMovie: (movieId: string) => void;
  detailMode: 'spotlight' | 'inline';
}

function isUnavailable(movie: Movie, activeServices: string[]): boolean {
  if (!activeServices.length) {
    return false;
  }
  const serviceIds = movie.streamingSources
    .map((source) => normalizeServiceName(source.name))
    .filter(Boolean) as string[];

  return !serviceIds.some((id) => activeServices.includes(id));
}

export default function MovieGrid({
  movies,
  activeServices,
  selectedMovieId,
  onSelectMovie,
  detailMode
}: MovieGridProps): JSX.Element {
  const focusMode = detailMode === 'inline' && Boolean(selectedMovieId);

  return (
    <section className="movieGridWrap" id="movie-grid">
      <div className={`movieGrid ${focusMode ? 'focusMode' : ''}`}>
        {movies.map((movie) => {
          const unavailable = isUnavailable(movie, activeServices);
          const selected = selectedMovieId === movie.id;

          return (
            <Fragment key={`${movie.id}-${movie.title}`}>
              <MovieCard
                movie={movie}
                unavailable={unavailable}
                selected={selected}
                condensed={focusMode && !selected}
                onSelect={onSelectMovie}
              />
              {detailMode === 'inline' && selected ? (
                <MovieRowExpand movie={movie} unavailable={unavailable} />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
