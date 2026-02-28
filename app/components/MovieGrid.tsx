import { normalizeServiceName } from '@/lib/services';
import type { Movie } from '@/types/movie';

import MovieCard from './MovieCard';

interface MovieGridProps {
  movies: Movie[];
  activeServices: string[];
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

export default function MovieGrid({ movies, activeServices }: MovieGridProps): JSX.Element {
  return (
    <section className="movieGridWrap" id="movie-grid">
      <div className="movieGrid">
        {movies.map((movie) => (
          <MovieCard key={`${movie.id}-${movie.title}`} movie={movie} unavailable={isUnavailable(movie, activeServices)} />
        ))}
      </div>
    </section>
  );
}
