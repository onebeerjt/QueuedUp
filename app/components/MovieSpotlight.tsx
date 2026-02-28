import ServiceBadge from '@/app/components/ServiceBadge';
import type { Movie } from '@/types/movie';

interface MovieSpotlightProps {
  movie: Movie | null;
  unavailable: boolean;
}

export default function MovieSpotlight({ movie, unavailable }: MovieSpotlightProps): JSX.Element | null {
  if (!movie) {
    return null;
  }

  return (
    <section className="spotlight" aria-live="polite">
      <div className="spotlightBackdrop">
        {movie.poster ? <img src={movie.poster} alt="" aria-hidden="true" className="spotlightBackdropImage" /> : null}
      </div>

      <div className="spotlightContent">
        <div className="spotlightPosterWrap">
          {movie.poster ? (
            <img src={movie.poster} alt={movie.title} className="spotlightPoster" />
          ) : (
            <div className="spotlightPosterFallback">{movie.title}</div>
          )}
        </div>

        <div className="spotlightInfo">
          <p className="spotlightEyebrow">Now focused</p>
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

          <p className="spotlightOverview">{movie.overview}</p>

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
      </div>
    </section>
  );
}
