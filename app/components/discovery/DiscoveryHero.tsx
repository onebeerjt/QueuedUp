'use client';

import MovieSpotlight from '@/app/components/MovieSpotlight';
import RegenerateButton from '@/app/components/discovery/RegenerateButton';
import type { Movie } from '@/types/movie';

interface DiscoveryHeroProps {
  movie: Movie | null;
  unavailable: boolean;
  onShowTonight: () => void;
  onShowDouble: () => void;
  onShowTriple: () => void;
  onRegenerate: () => void;
}

export default function DiscoveryHero({
  movie,
  unavailable,
  onShowTonight,
  onShowDouble,
  onShowTriple,
  onRegenerate
}: DiscoveryHeroProps): JSX.Element | null {
  if (!movie) {
    return null;
  }

  return (
    <section>
      <MovieSpotlight movie={movie} unavailable={unavailable} />
      <div className="discoverActions">
        <button type="button" className="primaryButton" onClick={onShowTonight}>
          Pick Something Tonight
        </button>
        <button type="button" className="panelTab active" onClick={onShowDouble}>
          Build Double Feature
        </button>
        <button type="button" className="panelTab active" onClick={onShowTriple}>
          Build Triple Feature
        </button>
        <RegenerateButton onRegenerate={onRegenerate} />
      </div>
    </section>
  );
}
