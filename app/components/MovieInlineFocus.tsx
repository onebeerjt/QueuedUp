import ServiceBadge from '@/app/components/ServiceBadge';
import type { Movie } from '@/types/movie';

interface MovieInlineFocusProps {
  movie: Movie | null;
  unavailable: boolean;
}

export default function MovieInlineFocus({ movie, unavailable }: MovieInlineFocusProps): JSX.Element | null {
  if (!movie) {
    return null;
  }

  return (
    <section className="inlineFocus" aria-live="polite">
      <div className="inlineFocusPosterWrap">
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} className="inlineFocusPoster" />
        ) : (
          <div className="inlineFocusPosterFallback">{movie.title}</div>
        )}
      </div>

      <div className="inlineFocusInfo">
        <p className="spotlightEyebrow">Expanded preview</p>
        <h2>{movie.title}</h2>
        <p className="spotlightMeta">
          {movie.year || 'Unknown'} · {movie.runtime ? `${movie.runtime}m` : 'N/A'} · IMDb {movie.imdbRating || 'N/A'}
        </p>

        <div className="genreRow spotlightGenres">
          {movie.genres.slice(0, 4).map((genre) => (
            <span key={genre} className="genreTag">
              {genre}
            </span>
          ))}
        </div>

        <p className="inlineFocusOverview">{movie.overview}</p>

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
    </section>
  );
}
