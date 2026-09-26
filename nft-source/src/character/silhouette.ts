import { Rng } from '../generator/seededRandom';
import { GENERATOR_MAJOR } from '../generator/version';
import {
  getParams,
  type BodyParams,
  type HeadParams,
  type PoseParams,
} from '../presets/traitDefinitions';
import type { BodyAnchors, EntityTraits } from '../generator/types';

/**
 * The character is a 2D signed-distance silhouette: head, neck, torso, arms and
 * upper legs assembled from capsules/ellipses and blended with a smooth union.
 * The particle sampler rasterizes this field into pixel fragments. A future
 * GLB pipeline can replace this module by producing the same interface
 * (sdf/regionAt/anchors) from a rendered depth/ID pass.
 */

export const REGION = {
  TORSO: 0,
  HEAD: 1,
  FACE: 2,
  EYE: 3,
  ARM_L: 4,
  ARM_R: 5,
  LEG: 6,
  NECK: 7,
  EXTRA: 8,
} as const;

export interface HeadInfo {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  faceX: number;
  eyeY: number;
  eyeR: number;
  eyeLX: number;
  eyeRX: number;
  mouthY: number;
  visor: boolean;
  turn: number;
}

export interface Silhouette {
  sdf(x: number, y: number): number;
  regionAt(x: number, y: number): number;
  anchors: BodyAnchors;
  head: HeadInfo;
}

interface Part {
  region: number;
  sdf(x: number, y: number): number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function sdCircle(x: number, y: number, cx: number, cy: number, r: number): number {
  return Math.hypot(x - cx, y - cy) - r;
}

function sdEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
  const q = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return (q - 1) * Math.min(rx, ry);
}

/** Capsule between two points. */
function sdSeg(x: number, y: number, ax: number, ay: number, bx: number, by: number, r: number): number {
  const dx = x - ax;
  const dy = y - ay;
  const ex = bx - ax;
  const ey = by - ay;
  const h = clamp01((dx * ex + dy * ey) / (ex * ex + ey * ey));
  return Math.hypot(dx - ex * h, dy - ey * h) - r;
}

/** Vertical capsule whose radius tapers from r1 (at y1) to r2 (at y2). */
function sdTaper(x: number, y: number, cx: number, y1: number, y2: number, r1: number, r2: number): number {
  const lo = Math.min(y1, y2);
  const hi = Math.max(y1, y2);
  const t = clamp01((y - y1) / (y2 - y1));
  const r = r1 + (r2 - r1) * t;
  const yy = y < lo ? lo : y > hi ? hi : y;
  return Math.hypot(x - cx, y - yy) - r;
}

/** Polynomial smooth minimum (union). */
function smin(a: number, b: number, k: number): number {
  const h = clamp01(0.5 + (0.5 * (b - a)) / k);
  return b + (a - b) * h - k * h * (1 - h);
}

interface ArmJoints {
  elbow: [number, number];
  wrist: [number, number];
  hand: [number, number];
  /** Hand radius multiplier (fists, pointing hands). */
  handScale?: number;
}

const REST_ARM = (sw: number, s: number): ArmJoints => ({
  elbow: [s * (sw + 0.045), 0.07],
  wrist: [s * (sw + 0.06), -0.24],
  hand: [s * (sw + 0.055), -0.3],
});

function armJoints(poseId: string, sw: number, s: number): ArmJoints {
  switch (poseId) {
    case 'offaxis':
      if (s < 0) {
        return {
          elbow: [-(sw + 0.1), 0.1],
          wrist: [-(sw + 0.155), -0.17],
          hand: [-(sw + 0.165), -0.225],
        };
      }
      return { elbow: [sw + 0.03, 0.06], wrist: [sw + 0.04, -0.25], hand: [sw + 0.038, -0.31] };
    case 'guarded':
      return {
        elbow: [s * (sw + 0.095), 0.11],
        wrist: [-s * 0.06, 0.1],
        hand: [-s * 0.1, 0.115],
      };
    case 'vigil':
      return {
        elbow: [s * (sw + 0.015), 0.05],
        wrist: [s * (sw + 0.005), -0.27],
        hand: [s * sw, -0.33],
      };
    case 'hail':
      if (s > 0) {
        return { elbow: [sw + 0.1, 0.55], wrist: [sw + 0.135, 0.82], hand: [sw + 0.14, 0.885] };
      }
      return REST_ARM(sw, s);
    case 'akimbo':
      // Hands on hips, elbows flared.
      return { elbow: [s * (sw + 0.125), 0.13], wrist: [s * 0.155, -0.085], hand: [s * 0.12, -0.105] };
    case 'salute':
      // Right hand raised to the brow.
      if (s > 0) {
        return { elbow: [sw + 0.115, 0.38], wrist: [0.115, 0.7], hand: [0.085, 0.73] };
      }
      return REST_ARM(sw, s);
    case 'stride':
      // Mid-step counter-swing: left arm forward, right arm trailing close.
      if (s < 0) {
        return { elbow: [-(sw + 0.075), 0.06], wrist: [-(sw + 0.1), -0.22], hand: [-(sw + 0.105), -0.28] };
      }
      return { elbow: [sw + 0.02, 0.05], wrist: [sw - 0.01, -0.26], hand: [sw - 0.02, -0.32] };
    case 'brawler':
      // Both fists raised in a fighting guard.
      return {
        elbow: [s * (sw + 0.075), 0.06],
        wrist: [s * 0.105, 0.4],
        hand: [s * 0.085, 0.49],
        handScale: 1.3,
      };
    case 'directive':
      // Right arm extended, pointing off-frame.
      if (s > 0) {
        return {
          elbow: [sw + 0.15, 0.36],
          wrist: [sw + 0.28, 0.355],
          hand: [sw + 0.315, 0.35],
          handScale: 1.1,
        };
      }
      return REST_ARM(sw, s);
    case 'ascendant':
      // Both arms raised in a wide V.
      return { elbow: [s * (sw + 0.09), 0.55], wrist: [s * (sw + 0.15), 0.83], hand: [s * (sw + 0.16), 0.89] };
    case 'rest':
    default:
      return REST_ARM(sw, s);
  }
}

interface LegJoints {
  knee: [number, number];
  ankle: [number, number];
}

function legJoints(poseId: string, hx: number, s: number): LegJoints {
  switch (poseId) {
    case 'stride':
      // Lead leg swung out and bent, trail leg stretched back — mid-step.
      if (s > 0) {
        return { knee: [hx + 0.06, -0.58], ankle: [hx + 0.15, -1.12] };
      }
      return { knee: [hx - 0.03, -0.64], ankle: [hx - 0.115, -1.2] };
    case 'brawler':
      // Wide fighting stance.
      return { knee: [hx + s * 0.045, -0.6], ankle: [hx + s * 0.105, -1.2] };
    case 'akimbo':
      // Slightly planted power stance.
      return { knee: [hx + s * 0.03, -0.62], ankle: [hx + s * 0.08, -1.22] };
    default:
      return { knee: [hx + s * 0.018, -0.62], ankle: [hx + s * 0.05, -1.22] };
  }
}

function sdPolygon(x:number,y:number,points:number[][]):number {
 let dist=Infinity,inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
 const a=points[i],b=points[j],dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
 dist=Math.min(dist,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));
 if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside?-dist:dist;
}
export function buildSilhouette(traits: EntityTraits): Silhouette {
  const seed = traits.seed;
  const rng = new Rng(seed, `v${GENERATOR_MAJOR}:body`);
  const bp = getParams<BodyParams>(traits, 'body');
  const hp = getParams<HeadParams>(traits, 'head');
  const pp = getParams<PoseParams>(traits, 'pose');

  // Seeded micro-variation so two entities with identical traits still differ.
  const sw = bp.shoulder * (1 + rng.range(-0.04, 0.04));
  const hip = bp.hip * (1 + rng.range(-0.04, 0.04));
  const armR = bp.armR * (1 + rng.range(-0.05, 0.05));
  const legR = bp.legR * (1 + rng.range(-0.05, 0.05));
  const neckR = bp.neckR * (1 + rng.range(-0.05, 0.05));
  const turn = pp.turn * (1 + rng.range(-0.15, 0.15)) * rng.sign();
  const headDx = pp.lean * 0.7 + turn * 0.02;
  const shoulderTilt = pp.poseId === 'offaxis' ? 0.016 : rng.range(-0.006, 0.006);

  const parts: Part[] = [];

  // --- Head -------------------------------------------------------------
  const hcx = headDx;
  const hcy = 0.72;
  let hrx = 0.125;
  let hry = 0.163;
  let visor = false;

  const anatomy=hp as unknown as {rx:number;ry:number;forehead:number;cheek:number;jaw:number};
  hrx=anatomy.rx;hry=anatomy.ry;
  // Smooth cranium with localized anatomical fullness, no polygon primitives.
  const gaussian=(t:number,center:number,spread:number)=>Math.exp(-Math.pow((t-center)/spread,2));
  parts.push({region:REGION.HEAD,sdf:(x,y)=>{
    const t=(y-hcy)/hry;
    if(Math.abs(t)>=1)return Math.hypot(x-hcx,Math.max(0,Math.abs(y-hcy)-hry));
    const fullness=1+anatomy.forehead*gaussian(t,.52,.4)+anatomy.cheek*gaussian(t,-.03,.28)+anatomy.jaw*gaussian(t,-.56,.3);
    const width=hrx*Math.sqrt(1-t*t)*fullness;
    return Math.max(Math.abs(x-hcx)-width,Math.abs(y-hcy)-hry);
  }});

  // --- Neck / torso -----------------------------------------------------
  parts.push({ region: REGION.NECK, sdf: (x, y) => sdSeg(x, y, hcx * 0.5, 0.6, 0, 0.46, neckR) });

  const chestR = sw * 0.75;
  const waistR = Math.max(hip * 0.88, chestR * 0.55);
  parts.push({
    region: REGION.TORSO,
    sdf: (x, y) => sdSeg(x, y, -sw + 0.06, 0.385 + shoulderTilt, sw - 0.06, 0.385 - shoulderTilt, 0.07),
  });
  parts.push({ region: REGION.TORSO, sdf: (x, y) => sdTaper(x, y, 0, 0.36, 0.05, chestR, waistR) });
  parts.push({ region: REGION.TORSO, sdf: (x, y) => sdTaper(x, y, 0, 0.05, -0.14, waistR, hip) });

  // --- Arms -------------------------------------------------------------
  for (const s of [-1, 1] as const) {
    const region = s < 0 ? REGION.ARM_L : REGION.ARM_R;
    const shoulder: [number, number] = [s * (sw - 0.015), 0.375 + shoulderTilt * -s];
    const j = armJoints(pp.poseId, sw, s);
    const handR = armR * 0.85 * (j.handScale ?? 1);
    parts.push({ region, sdf: (x, y) => sdSeg(x, y, shoulder[0], shoulder[1], j.elbow[0], j.elbow[1], armR) });
    parts.push({ region, sdf: (x, y) => sdSeg(x, y, j.elbow[0], j.elbow[1], j.wrist[0], j.wrist[1], armR * 0.88) });
    parts.push({ region, sdf: (x, y) => sdCircle(x, y, j.hand[0], j.hand[1], handR) });
  }

  // --- Legs (cropped below the frame) ------------------------------------
  for (const s of [-1, 1] as const) {
    const hx = s * hip * 0.52;
    const lj = legJoints(pp.poseId, hx, s);
    parts.push({ region: REGION.LEG, sdf: (x, y) => sdSeg(x, y, hx, -0.13, lj.knee[0], lj.knee[1], legR) });
    parts.push({
      region: REGION.LEG,
      sdf: (x, y) => sdSeg(x, y, lj.knee[0], lj.knee[1], lj.ankle[0], lj.ankle[1], legR * 0.78),
    });
  }

  // This collection contains only heads; discard the inherited body geometry.
  for(let i=parts.length-1;i>=0;i--)if(parts[i].region!==REGION.HEAD&&parts[i].region!==REGION.EXTRA)parts.splice(i,1);
  // --- Face landmarks ----------------------------------------------------
  const faceX = hcx + turn * 0.05;
  const eyeY = hcy+hry*.12;
  const eyeGap = hrx * .42;
  const head: HeadInfo = {
    cx: hcx,
    cy: hcy,
    rx: hrx,
    ry: hry,
    faceX,
    eyeY,
    eyeR: hrx*.16,
    eyeLX: faceX - eyeGap * (1 + turn * 0.22),
    eyeRX: faceX + eyeGap * (1 - turn * 0.22),
    mouthY: hcy-hry*.42,
    visor,
    turn,
  };

  const anchors: BodyAnchors = {
    neckPivot: [hcx * 0.5, 0.5],
    hipPivot: [0, -0.14],
    headCenter: [hcx, hcy],
    eyeL: [head.eyeLX, eyeY],
    eyeR: [head.eyeRX, eyeY],
  };

  const K = 0.026;
  return {
    sdf(x: number, y: number): number {
      // Large finite start value: smin with Infinity would produce NaN.
      let d = 1e9;
      for (const part of parts) d = smin(d, part.sdf(x, y), K);
      return d;
    },
    regionAt(x: number, y: number): number {
      let best = Infinity;
      let region: number = REGION.TORSO;
      for (const part of parts) {
        const d = part.sdf(x, y);
        if (d < best) {
          best = d;
          region = part.region;
        }
      }
      return region;
    },
    anchors,
    head,
  };
}
