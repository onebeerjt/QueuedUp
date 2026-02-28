import type { Movie } from '@/types/movie';

interface MovieCardProps {
  movie: Movie;
  unavailable: boolean;
  selected: boolean;
  condensed: boolean;
  onSelect: (movieId: string) => void;
}

export default function MovieCard({ movie, unavailable, selected, condensed, onSelect }: MovieCardProps): JSX.Element {
  return (
    <article className={`movieCard ${unavailable ? 'unavailable' : ''} ${selected ? 'selected' : ''} ${condensed ? 'condensed' : ''}`}>
      <button type="button" className="movieCardButton" onClick={() => onSelect(movie.id)} aria-pressed={selected}>
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} className="poster" loading="lazy" />
        ) : (
          <div className="posterFallback">
            <span>{movie.title}</span>
          </div>
        )}

        <div className="overlay">
          <div className="overlayContent">
            <h3>{movie.title}</h3>
            <p className="movieMeta">
              {movie.year || 'Unknown'} · {movie.runtime ? `${movie.runtime}m` : 'N/A'} · IMDb {movie.imdbRating || 'N/A'}
            </p>
            <div className="genreRow">
              {movie.genres.slice(0, 2).map((genre) => (
                <span key={genre} className="genreTag">
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}
