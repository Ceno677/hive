import { BASE_CELL, QUALITY_PRESETS, SAMPLE_BOUNDS } from '../generator/config';
import { fbm2 } from '../generator/noise';
import { hashString, Rng } from '../generator/seededRandom';
import { GENERATOR_MAJOR } from '../generator/version';
import { buildSilhouette, REGION } from '../character/silhouette';
import { PALETTES } from '../presets/palettes';
import {
  getParams,
  type AmbientParams,
  type MutationParams,
  type PaletteParams,
  type PixelMaterialParams,
  type SurfaceParams,
} from '../presets/traitDefinitions';
import type {
  AmbientBuffers,
  BuildOptions,
  BuiltEntity,
  EntityTraits,
  ParticleBuffers,
} from '../generator/types';

/**
 * Rasterizes the silhouette into instanced pixel fragments. Everything here is
 * deterministic in (seed, traits, options): the same inputs always produce
 * byte-identical buffers. No three.js imports — this module also feeds tests
 * and future batch renderers.
 */

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

interface Acc {
  home: number[];
  size: number[];
  bright: number[];
  phase: number[];
  suscept: number[];
  region: number[];
  detach: number[];
  erode: number[];
  edge: number[];
  accent: number[];
  count: number;
}

function pushParticle(
  acc: Acc,
  x: number,
  y: number,
  z: number,
  size: number,
  bright: number,
  phase: number,
  suscept: number,
  region: number,
  dx: number,
  dy: number,
  erode: number,
  edge: number,
  accent: number,
): void {
  acc.home.push(x, y, z);
  acc.size.push(size);
  acc.bright.push(bright);
  acc.phase.push(phase);
  acc.suscept.push(suscept);
  acc.region.push(region);
  acc.detach.push(dx, dy);
  acc.erode.push(erode);
  acc.edge.push(edge);
  acc.accent.push(accent);
  acc.count++;
}

export function buildEntity(seed: number, traits: EntityTraits, options: BuildOptions): BuiltEntity {
  const sil = buildSilhouette(traits);
  const preset = QUALITY_PRESETS[options.quality];
  const pm = getParams<PixelMaterialParams>(traits, 'pixelMaterial');
  const surface = getParams<SurfaceParams>(traits, 'surface');
  const paletteId = getParams<PaletteParams>(traits, 'palette').paletteId;
  const palette = PALETTES[paletteId];
  const mutation = getParams<MutationParams>(traits, 'mutation').mutationId;

  const cell = BASE_CELL * preset.cellScale * pm.cellMult * clamp(options.pixelScale, 0.4, 2.5);
  const rng = new Rng(seed, `v${GENERATOR_MAJOR}:particles`);
  const noiseSeed = hashString(`${seed}::v${GENERATOR_MAJOR}:field`) | 0;
  const lightDir = new Rng(seed, `v${GENERATOR_MAJOR}:shade`).sign();

  const mutRng = new Rng(seed, `v${GENERATOR_MAJOR}:mutation`);
  const ghostRegion = mutRng.sign() < 0 ? REGION.ARM_L : REGION.ARM_R;
  const exposureDir = mutRng.sign();

  const acc: Acc = {
    home: [],
    size: [],
    bright: [],
    phase: [],
    suscept: [],
    region: [],
    detach: [],
    erode: [],
    edge: [],
    accent: [],
    count: 0,
  };

  const { minX, maxX, minY, maxY } = SAMPLE_BOUNDS;
  const cols = Math.floor((maxX - minX) / cell);
  const rows = Math.floor((maxY - minY) / cell);
  const head = sil.head;

  for (let iy = 0; iy < rows; iy++) {
    const y = minY + (iy + 0.5) * cell;
    for (let ix = 0; ix < cols; ix++) {
      const x = minX + (ix + 0.5) * cell;
      const d = sil.sdf(x, y);
      if (d >= 0) continue;
      // Sparse dropout for texture; edge cells always kept so the outline reads.
      const edge = clamp(1 + d / (cell * 4), 0, 1);
      if (edge < 0.6 && rng.chance(0.04)) continue;

      let region: number = sil.regionAt(x, y);
      let isEye = false;
      if (region === REGION.HEAD) {
        if (head.visor) {
          if (Math.abs(y - head.eyeY) < 0.021 && Math.abs(x - head.cx) < head.rx * 0.78) isEye = true;
        } else if (
          Math.hypot(x - head.eyeLX, y - head.eyeY) < head.eyeR ||
          Math.hypot(x - head.eyeRX, y - head.eyeY) < head.eyeR
        ) {
          isEye = true;
        }
        const face=(traits as any).formFace||'classic';
        const ex=Math.min(Math.abs(x-head.eyeLX),Math.abs(x-head.eyeRX)),ey=Math.abs(y-head.eyeY);
        if(face==='cyclops')isEye=Math.hypot(x-head.faceX,y-head.eyeY)<head.rx*.24;
        if(face==='triple')isEye=ex*ex+(y-head.eyeY+.016)**2<head.eyeR**2 || Math.hypot(x-head.faceX,y-head.eyeY-.057)<head.eyeR;
        if(face==='slit')isEye=ex<head.rx*.23&&ey<.007;
        if(face==='square')isEye=ex<.024&&ey<.024;
        if(face==='cross')isEye=(ex<.009&&ey<.035)||(ex<.031&&ey<.009);
        if(face==='hollow')isEye=Math.abs(Math.hypot(ex,y-head.eyeY)-.027)<.005;
        if (isEye) {
          region = REGION.EYE;
        } else {
          const fx = (x - head.faceX) / (head.rx * 0.66);
          const fy = (y - (head.cy - 0.012)) / (head.ry * 0.8);
          if (fx * fx + fy * fy < 1) region = REGION.FACE;
        }
      }

      // --- Base shading -------------------------------------------------
      let bright = 0.52;
      bright += 0.1 * clamp((y + 1.1) / 2.0, 0, 1);
      bright -= 0.09 * clamp((x * lightDir) / 0.5, -1, 1);
      bright += edge * 0.22;

      switch (surface.surfaceId) {
        case 'etched':
          bright += Math.sin(y * 150 + fbm2(x * 2.2, y * 2.2, noiseSeed + 3) * 7) * 0.08;
          break;
        case 'plated': {
          const q = Math.floor(fbm2(x * 4.6, y * 4.6, noiseSeed + 11) * 4.999) / 4;
          bright += (q - 0.4) * 0.22;
          break;
        }
        case 'circuit': {
          // Organic trace filaments (ridged noise) — deliberately no
          // rectangular lattice anywhere in the system.
          const v = fbm2(x * 5.5, y * 5.5, noiseSeed + 21, 3);
          bright += Math.abs(v - 0.5) < 0.035 ? 0.14 : -0.04;
          break;
        }
        case 'molten':
          bright += (fbm2(x * 4, y * 4, noiseSeed + 7, 4) - 0.5) * 0.34;
          break;
        case 'matte':
        default:
          bright += (fbm2(x * 6, y * 6, noiseSeed) - 0.5) * 0.15;
          break;
      }

      if (region === REGION.FACE) {
        bright += 0.08;
        const dl = Math.hypot(x - head.eyeLX, y - head.eyeY);
        const dr = Math.hypot(x - head.eyeRX, y - head.eyeY);
        if ((dl > head.eyeR && dl < head.eyeR * 1.9) || (dr > head.eyeR && dr < head.eyeR * 1.9)) {
          bright -= 0.14; // eye sockets
        }
        if (y > head.eyeY + 0.024 && y < head.eyeY + 0.038 && Math.abs(x - head.faceX) < 0.08) {
          bright -= 0.1; // brow
        }
        if (Math.abs(y - head.mouthY) < 0.009 && Math.abs(x - head.faceX) < 0.033) {
          bright -= 0.3; // mouth
        }
      }
      const face=(traits as any).formFace||'classic';
      const mx=x-head.faceX,my=y-head.mouthY;
      if(face==='grin' && Math.abs(mx)<head.rx*.62 && Math.abs(my+(.023*(1-(mx/(head.rx*.62))**2)))<.014)bright=Math.floor(mx/.012)%2===0?.95:.08;
      if(face==='hollow'&&Math.abs(mx)<head.rx*.25&&Math.abs(my)<.027)bright=.04;
      if(face==='cyclops'&&Math.abs(mx)<.035&&Math.abs(my)<.006)bright=.08;
      bright += rng.range(-0.05, 0.05);
      bright = clamp(bright, 0.06, 1.25);

      // --- Size tiers ---------------------------------------------------
      const tierRoll = rng.float();
      let size = cell * 0.98;
      if (tierRoll < pm.bigChance) size = cell * 1.85;
      else if (tierRoll < pm.bigChance + pm.smallChance) size = cell * 0.62;

      let z = rng.range(-0.02, 0.02);
      if (region === REGION.EYE) {
        size = cell * 1.1;
        bright = 1.2;
        z = 0.05;
      } else if (region === REGION.EXTRA) {
        z = 0.01;
      }

      // --- Behavioral fields --------------------------------------------
      const protectFace = region === REGION.FACE || region === REGION.EYE;
      let suscept =
        0.55 * fbm2(x * 2.6 + 9.1, y * 2.6 - 4.3, noiseSeed ^ 0x51) + 0.3 * rng.float() + edge * 0.18;
      if (protectFace) suscept *= 0.35;
      suscept = clamp(suscept, 0, 1);

      let erode = 0.75 * fbm2(x * 3.1 - 7.7, y * 3.1 + 5.9, noiseSeed ^ 0x9e) + 0.25 * rng.float();
      if (protectFace) erode *= 0.25;
      else if (region === REGION.HEAD) erode *= 0.6;
      erode = clamp(erode, 0, 1);

      let ddx = x * 1.5 + rng.bell() * 0.7;
      let ddy = 0.3 + rng.bell() * 0.6;
      const dlen = Math.hypot(ddx, ddy) || 1;
      ddx /= dlen;
      ddy /= dlen;

      const phase = rng.float();
      let accent = 0;
      if (region !== REGION.EYE && palette.accentAmount > 0 && rng.chance(palette.accentAmount)) {
        accent = 1;
      }

      // --- Mutations ----------------------------------------------------
      if (mutation === 'ghostLimb' && region === ghostRegion) {
        bright *= 0.45;
        suscept = clamp(suscept + 0.35, 0, 1);
        erode = clamp(erode + 0.25, 0, 1);
      }

      pushParticle(acc, x, y, z, size, bright, phase, suscept, region, ddx, ddy, erode, edge, accent);

      if (mutation === 'doubleExposure' && acc.count % 7 === 0) {
        pushParticle(
          acc,
          x + exposureDir * 0.055,
          y,
          z - 0.03,
          size,
          bright * 0.35,
          phase,
          clamp(suscept + 0.35, 0, 1),
          region,
          ddx,
          ddy,
          erode,
          edge,
          0,
        );
      }
      if (mutation === 'chromaticRift' && acc.count % 9 === 0) {
        pushParticle(acc, x - 0.008, y, z - 0.03, size, bright * 0.55, phase, suscept, region, ddx, ddy, erode, edge, 2);
        pushParticle(acc, x + 0.008, y, z - 0.03, size, bright * 0.55, phase, suscept, region, ddx, ddy, erode, edge, 3);
      }
    }
  }

  const particles: ParticleBuffers = {
    count: acc.count,
    home: new Float32Array(acc.home),
    size: new Float32Array(acc.size),
    bright: new Float32Array(acc.bright),
    phase: new Float32Array(acc.phase),
    suscept: new Float32Array(acc.suscept),
    region: new Float32Array(acc.region),
    detach: new Float32Array(acc.detach),
    erode: new Float32Array(acc.erode),
    edge: new Float32Array(acc.edge),
    accent: new Float32Array(acc.accent),
  };

  return {
    seed,
    particles,
    ambient: buildAmbient(seed, traits, preset.ambientScale),
    anchors: sil.anchors,
  };
}

function buildAmbient(seed: number, traits: EntityTraits, ambientScale: number): AmbientBuffers {
  const ap = getParams<AmbientParams>(traits, 'ambient');
  const rng = new Rng(seed, `v${GENERATOR_MAJOR}:ambient`);
  const count = Math.max(24, Math.round(240 * ambientScale * ap.countMult));

  const center = new Float32Array(count * 2);
  const radius = new Float32Array(count);
  const speed = new Float32Array(count);
  const phase0 = new Float32Array(count);
  const size = new Float32Array(count);
  const bright = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const angle = rng.float() * Math.PI * 2;
    const rad = 0.35 + rng.float() * 0.75;
    center[i * 2] = Math.cos(angle) * rad * 0.95;
    center[i * 2 + 1] = clamp(0.1 + Math.sin(angle) * rad * 0.95, -1.05, 1.05);
    radius[i] = 0.02 + rng.float() * 0.09;
    speed[i] = rng.int(1, 3) * rng.sign();
    phase0[i] = rng.float();
    size[i] = 0.0045 + rng.float() * 0.008;
    bright[i] = 0.25 + rng.float() * 0.55;
  }

  return { count, center, radius, speed, phase0, size, bright };
}
