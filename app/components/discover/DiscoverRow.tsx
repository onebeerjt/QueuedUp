'use client';

import type { Movie } from '@/types/movie';

interface DiscoverRowProps {
  title: string;
  movies: Movie[];
  onSelect: (movie: Movie) => void;
}

export default function DiscoverRow({ title, movies, onSelect }: DiscoverRowProps): JSX.Element | null {
  if (!movies.length) {
    return null;
  }

  return (
    <section className="discoverRow">
      <h3 className="discoverRowTitle">{title}</h3>
      <div className="discoverRail" role="list">
        {movies.map((movie) => (
          <button
            key={`${title}-${movie.id}`}
            type="button"
            className="discoverTile"
            role="listitem"
            onClick={() => onSelect(movie)}
          >
            {movie.poster ? (
              <img src={movie.poster} alt={movie.title} className="discoverTilePoster" loading="lazy" />
            ) : (
              <div className="discoverTileFallback">{movie.title}</div>
            )}
            <div className="discoverTileMeta">
              <span className="discoverTileTitle">{movie.title}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
