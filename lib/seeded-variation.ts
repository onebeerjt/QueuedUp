export interface SeededRng {
  next: () => number;
}

// Mulberry32: tiny deterministic RNG for stable seeded UI variation.
export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;
  return {
    next: () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  const rng = createSeededRng(seed);

  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

export function seededPickMany<T>(items: T[], count: number, seed: number): T[] {
  if (count <= 0) {
    return [];
  }
  return seededShuffle(items, seed).slice(0, count);
}

export function nextSeed(seed: number): number {
  return (seed + 1) % 1000000;
}
