import { dedupeMovies } from '@/lib/discovery';
import { buildDoubleFeature, buildTripleFeature, pickSomethingTonight } from '@/lib/recommendation-rules';
import { seededPickMany, seededShuffle } from '@/lib/seeded-variation';
import type { Movie } from '@/types/movie';

export interface LoadedRowLike {
  key: string;
  label: string;
  movies: Movie[];
}

export interface DynamicSection {
  key: string;
  title: string;
  subtitle: string;
  movies: Movie[];
}

export interface PathSet {
  title: string;
  routeLabel: string;
  movies: Movie[];
}

export interface GeneratedDiscovery {
  featuredPick: Movie | null;
  doubleFeature: Movie[];
  tripleFeature: Movie[];
  dynamicSections: DynamicSection[];
  paths: PathSet[];
}

function bucketRows(rows: LoadedRowLike[]): Record<string, LoadedRowLike[]> {
  return {
    director: rows.filter((row) => row.key.startsWith('director-') && !row.key.includes('deepcuts')),
    actor: rows.filter((row) => row.key.startsWith('actor-')),
    similar: rows.filter((row) => row.key.startsWith('similar-')),
    era: rows.filter((row) => row.key.startsWith('decade-genre-')),
    hidden: rows.filter((row) => row.key.startsWith('hidden-gems-')),
    deepcuts: rows.filter((row) => row.key.includes('deepcuts'))
  };
}

function pickRowMovieList(rows: LoadedRowLike[], seed: number, max = 12): Movie[] {
  if (!rows.length) {
    return [];
  }

  const row = seededPickMany(rows, 1, seed)[0];
  return seededShuffle(row.movies, seed + 7).slice(0, max);
}

function buildPath(title: string, label: string, source: Movie[], seed: number): PathSet | null {
  const picked = seededShuffle(dedupeMovies(source), seed).slice(0, 5);
  if (picked.length < 3) {
    return null;
  }

  return {
    title,
    routeLabel: label,
    movies: picked
  };
}

export function generateDiscoverySections(hero: Movie | null, rows: LoadedRowLike[], seed: number): GeneratedDiscovery {
  const buckets = bucketRows(rows);

  const allCandidates = dedupeMovies(rows.flatMap((row) => row.movies));
  const featuredPick = pickSomethingTonight(hero, allCandidates);
  const doubleFeature = buildDoubleFeature(hero, allCandidates);
  const tripleFeature = buildTripleFeature(hero, allCandidates);

  const sectionPool: DynamicSection[] = [];

  const directorMovies = pickRowMovieList(buckets.director, seed + 11);
  if (directorMovies.length) {
    sectionPool.push({
      key: 'director-path',
      title: 'Director Path',
      subtitle: 'Go deeper into the same filmmaker lens',
      movies: directorMovies
    });
  }

  const actorMovies = pickRowMovieList(buckets.actor, seed + 13);
  if (actorMovies.length) {
    sectionPool.push({
      key: 'actor-path',
      title: 'Actor Path',
      subtitle: 'Follow a cast thread into new territory',
      movies: actorMovies
    });
  }

  const vibeMovies = pickRowMovieList(buckets.similar, seed + 17);
  if (vibeMovies.length) {
    sectionPool.push({
      key: 'vibe-route',
      title: 'Same Vibe, Different Route',
      subtitle: 'Keep the tone, change the lane',
      movies: vibeMovies
    });
  }

  const eraMovies = pickRowMovieList(buckets.era, seed + 19);
  if (eraMovies.length) {
    sectionPool.push({
      key: 'era-route',
      title: 'Same Era Route',
      subtitle: 'Period and genre aligned picks',
      movies: eraMovies
    });
  }

  const hiddenMovies = pickRowMovieList(buckets.hidden, seed + 23);
  if (hiddenMovies.length) {
    sectionPool.push({
      key: 'hidden-route',
      title: 'Hidden Gem Path',
      subtitle: 'Underseen but strong follow-ups',
      movies: hiddenMovies
    });
  }

  const deepMovies = pickRowMovieList(buckets.deepcuts, seed + 29);
  if (deepMovies.length) {
    sectionPool.push({
      key: 'unexpected-route',
      title: 'Unexpected Connection',
      subtitle: 'A less obvious but valid branch',
      movies: deepMovies
    });
  }

  const dynamicSections = seededShuffle(sectionPool, seed + 31).slice(0, 4);

  const paths = dedupePathSets(
    [
      buildPath('Director Path', 'Go deeper', directorMovies, seed + 37),
      buildPath('Actor Path', 'Follow cast overlap', actorMovies, seed + 41),
      buildPath('Vibe Path', 'Same tension, new shape', vibeMovies, seed + 43),
      buildPath('Hidden Gem Path', 'Start classic, end somewhere weird', hiddenMovies, seed + 47)
    ].filter((item): item is PathSet => Boolean(item))
  );

  return {
    featuredPick,
    doubleFeature,
    tripleFeature,
    dynamicSections,
    paths: seededShuffle(paths, seed + 53).slice(0, 3)
  };
}

function dedupePathSets(paths: PathSet[]): PathSet[] {
  const used = new Set<string>();
  return paths
    .map((path) => {
      const movies = path.movies.filter((movie) => {
        if (used.has(movie.id)) {
          return false;
        }
        used.add(movie.id);
        return true;
      });

      return {
        ...path,
        movies
      };
    })
    .filter((path) => path.movies.length >= 3);
}
