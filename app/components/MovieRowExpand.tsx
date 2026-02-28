import ServiceBadge from '@/app/components/ServiceBadge';
import type { Movie } from '@/types/movie';

interface MovieRowExpandProps {
  movie: Movie;
  unavailable: boolean;
}

export default function MovieRowExpand({ movie, unavailable }: MovieRowExpandProps): JSX.Element {
  return (
    <article className="movieRowExpand" aria-live="polite">
      <div className="movieRowExpandPosterWrap">
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} className="movieRowExpandPoster" />
        ) : (
          <div className="movieRowExpandPosterFallback">{movie.title}</div>
        )}
      </div>

      <div className="movieRowExpandInfo">
        <p className="spotlightEyebrow">Expanded in row</p>
        <h3>{movie.title}</h3>
        <p className="movieRowExpandMeta">
          {movie.year || 'Unknown'} · {movie.runtime ? `${movie.runtime}m` : 'N/A'} · IMDb {movie.imdbRating || 'N/A'}
        </p>

        <div className="genreRow">
          {movie.genres.slice(0, 4).map((genre) => (
            <span key={genre} className="genreTag">
              {genre}
            </span>
          ))}
        </div>

        <p className="movieRowExpandOverview">{movie.overview}</p>

        {movie.streamingSources.length ? (
          <div className="spotlightActions">
            {movie.streamingSources.map((source) => (
              <ServiceBadge
                key={`${movie.id}-${source.name}`}
                source={source}
                disabled={unavailable}
                className="spotlightBadge"
                showLabel
              />
            ))}
          </div>
        ) : (
          <p className="spotlightUnavailable">No streaming sources found yet for this title.</p>
        )}
      </div>
    </article>
  );
}
