import ServiceBadge from '@/app/components/ServiceBadge';
import type { Movie } from '@/types/movie';

interface MovieCardProps {
  movie: Movie;
  unavailable: boolean;
}

export default function MovieCard({ movie, unavailable }: MovieCardProps): JSX.Element {
  return (
    <article className={`movieCard ${unavailable ? 'unavailable' : ''}`}>
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
            {movie.genres.slice(0, 3).map((genre) => (
              <span key={genre} className="genreTag">
                {genre}
              </span>
            ))}
          </div>
          <p className="overview">{movie.overview}</p>
          <div className="serviceRow">
            {movie.streamingSources.map((source) => (
              <ServiceBadge key={`${movie.id}-${source.name}`} source={source} disabled={unavailable} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
