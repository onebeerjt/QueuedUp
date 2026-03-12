'use client';

import Link from 'next/link';

interface HomepageStarterRowProps {
  title: string;
  subtitle?: string;
  seeds: string[];
}

export default function HomepageStarterRow({ title, subtitle, seeds }: HomepageStarterRowProps): JSX.Element {
  return (
    <section className="homeStarterRow">
      <h3>{title}</h3>
      {subtitle ? <p className="discoverHint">{subtitle}</p> : null}
      <div className="homeSeedRail">
        {seeds.map((seed) => (
          <Link key={`${title}-${seed}`} href={`/discover?seed=${encodeURIComponent(seed)}`} className="homeSeedChip">
            {seed}
          </Link>
        ))}
      </div>
    </section>
  );
}
