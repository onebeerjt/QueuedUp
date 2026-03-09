'use client';

import type { Movie } from '@/types/movie';

interface BlindSpotRowProps {
  movie: Movie;
  reason: string;
  onSelect: (movie: Movie) => void;
}

export default function BlindSpotRow({ movie, reason, onSelect }: BlindSpotRowProps): JSX.Element {
  return (
    <button type="button" className="blindSpotItem" onClick={() => onSelect(movie)}>
      {movie.poster ? <img src={movie.poster} alt={movie.title} className="blindSpotPoster" /> : <div className="blindSpotFallback">{movie.title}</div>}
      <div className="blindSpotMeta">
        <h4>{movie.title}</h4>
        <p>{movie.year || 'Unknown'} · IMDb {movie.imdbRating || 'N/A'}</p>
        <span>{reason}</span>
      </div>
    </button>
  );
}
