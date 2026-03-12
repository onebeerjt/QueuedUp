'use client';

import type { Movie } from '@/types/movie';

interface PathRowProps {
  title: string;
  routeLabel: string;
  movies: Movie[];
  onSelect: (movie: Movie) => void;
}

export default function PathRow({ title, routeLabel, movies, onSelect }: PathRowProps): JSX.Element | null {
  if (!movies.length) {
    return null;
  }

  return (
    <section className="pathRow">
      <h3 className="discoverRowTitle">{title}</h3>
      <p className="discoverHint">{routeLabel}</p>
      <div className="pathRail" role="list">
        {movies.map((movie, index) => (
          <button key={`${title}-${movie.id}`} type="button" className="pathCard" role="listitem" onClick={() => onSelect(movie)}>
            <span className="pathStep">{index + 1}</span>
            {movie.poster ? <img src={movie.poster} alt={movie.title} className="pathPoster" loading="lazy" /> : <div className="pathPosterFallback">{movie.title}</div>}
            <div className="pathMeta">
              <strong>{movie.title}</strong>
              <small>{movie.year || 'Unknown'} · IMDb {movie.imdbRating || 'N/A'}</small>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
