import { normalizeServiceName } from '@/lib/services';
import type { Movie } from '@/types/movie';

import MovieCard from './MovieCard';

interface MovieGridProps {
  movies: Movie[];
  activeServices: string[];
  selectedMovieId: string | null;
  onSelectMovie: (movieId: string) => void;
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

export default function MovieGrid({ movies, activeServices, selectedMovieId, onSelectMovie }: MovieGridProps): JSX.Element {
  const focusMode = Boolean(selectedMovieId);

  return (
    <section className="movieGridWrap" id="movie-grid">
      <div className={`movieGrid ${focusMode ? 'focusMode' : ''}`}>
        {movies.map((movie) => (
          <MovieCard
            key={`${movie.id}-${movie.title}`}
            movie={movie}
            unavailable={isUnavailable(movie, activeServices)}
            selected={selectedMovieId === movie.id}
            condensed={focusMode && selectedMovieId !== movie.id}
            onSelect={onSelectMovie}
          />
        ))}
      </div>
    </section>
  );
}
