/**
 * Deterministic lattice value noise, used at build time to give particle
 * attributes (erosion clusters, detach susceptibility, surface patterning)
 * spatial coherence. Pure integer hashing — identical on every platform.
 */

function hashLattice(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoother(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Smooth value noise in [0, 1]. */
export function valueNoise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hashLattice(ix, iy, seed);
  const b = hashLattice(ix + 1, iy, seed);
  const c = hashLattice(ix, iy + 1, seed);
  const d = hashLattice(ix + 1, iy + 1, seed);
  const ux = smoother(fx);
  const uy = smoother(fy);
  const top = a + (b - a) * ux;
  const bot = c + (d - c) * ux;
  return top + (bot - top) * uy;
}

/** Fractal sum of value noise, still in [0, 1]. */
export function fbm2(x: number, y: number, seed: number, octaves = 3): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise2(x * freq + o * 17.13, y * freq - o * 9.7, seed + o * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}
