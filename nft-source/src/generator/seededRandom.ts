/**
 * Deterministic PRNG used for ALL artwork generation. Math.random() is never
 * used anywhere in the generation path.
 *
 * Design: every consumer opens its own named stream (`new Rng(seed, 'trait:pose')`).
 * Streams are independent hashes of (seed, name), so adding a new consumer never
 * shifts the values another consumer sees for the same seed.
 */

/** xmur3 string hash -> 32-bit uint. Stable across platforms. */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export class Rng {
  private state: number;

  constructor(seed: number | string, stream = '') {
    this.state = hashString(`${seed}::${stream}`);
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** mulberry32 step: uniform float in [0, 1). */
  float(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.float();
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.float() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.float() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.float() * arr.length)];
  }

  sign(): number {
    return this.float() < 0.5 ? -1 : 1;
  }

  /** Cheap bell-ish distribution centered on 0, range roughly [-1, 1]. */
  bell(): number {
    return (this.float() + this.float() + this.float()) / 1.5 - 1;
  }

  /** Random unit vector in 2D. */
  unit2(): [number, number] {
    const a = this.float() * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)];
  }
}
