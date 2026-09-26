import type { EntityTraits, TraitDefinition, TraitKey } from '../generator/types';

/**
 * The full trait table. Order matters: it is the attribute order in exported
 * metadata. Weights: tier defaults come from rarity.ts; an explicit `weight`
 * (e.g. mutation None) overrides the tier default.
 */

export interface BodyParams { shoulder: number; hip: number; armR: number; legR: number; neckR: number }
export interface HeadParams { headId: string }
export interface PoseParams { poseId: string; turn: number; lean: number }
export interface SurfaceParams { surfaceId: string; shimmer: number }
export interface PixelMaterialParams { mode: number; cellMult: number; bigChance: number; smallChance: number }
export interface FragmentationParams { frag: number; detachDist: number; erosionBase: number; cycles: number }
export interface MotionParams { motionScale: number; breath: number; sway: number; flicker: number; bandAmp: number; bandSpeed: number; glitch: number }
export interface BackgroundParams { bgMode: number }
export interface PaletteParams { paletteId: string }
export interface EyeParams { intensity: number; blink: number; stretch: number; colorId: string }
export interface AmbientParams { ambientMode: number; countMult: number }
export interface MutationParams { mutationId: string }

export function getParams<T>(traits: EntityTraits, key: TraitKey): T {
  return traits.selections[key].params as unknown as T;
}

export const TRAIT_DEFINITIONS: TraitDefinition[] = [
  {
    key: 'body',
    label: 'Body',
    choices: [
      { id: 'slim', label: 'Slim', tier: 'common', params: { shoulder: 0.26, hip: 0.165, armR: 0.048, legR: 0.075, neckR: 0.05 } },
      { id: 'standard', label: 'Standard', tier: 'common', params: { shoulder: 0.3, hip: 0.185, armR: 0.054, legR: 0.085, neckR: 0.055 } },
      { id: 'broad', label: 'Broad', tier: 'common', params: { shoulder: 0.345, hip: 0.2, armR: 0.06, legR: 0.092, neckR: 0.06 } },
      { id: 'heavy', label: 'Heavy', tier: 'uncommon', params: { shoulder: 0.36, hip: 0.23, armR: 0.068, legR: 0.1, neckR: 0.065 } },
      { id: 'wraith', label: 'Wraith', tier: 'uncommon', params: { shoulder: 0.225, hip: 0.145, armR: 0.04, legR: 0.065, neckR: 0.045 } },
      { id: 'colossus', label: 'Colossus', tier: 'rare', params: { shoulder: 0.4, hip: 0.24, armR: 0.075, legR: 0.108, neckR: 0.07 } },
    ],
  },
  {
    key: 'head',
    label: 'Head',
    choices: [
      { id: 'rounded', label: 'Rounded', tier: 'common', params: { headId: 'rounded' } },
      { id: 'tapered', label: 'Tapered', tier: 'common', params: { headId: 'tapered' } },
      { id: 'domed', label: 'Domed', tier: 'uncommon', params: { headId: 'domed' } },
      { id: 'visor', label: 'Visor', tier: 'uncommon', params: { headId: 'visor' } },
      { id: 'antenna', label: 'Antenna', tier: 'rare', params: { headId: 'antenna' } },
      { id: 'crowned', label: 'Crowned', tier: 'legendary', params: { headId: 'crowned' } },
    ],
  },
  {
    key: 'pose',
    label: 'Pose',
    choices: [
      { id: 'rest', label: 'At Rest', tier: 'common', params: { poseId: 'rest', turn: 0.12, lean: 0 } },
      { id: 'offaxis', label: 'Off Axis', tier: 'common', params: { poseId: 'offaxis', turn: 0.35, lean: 0.045 } },
      { id: 'akimbo', label: 'Akimbo', tier: 'common', params: { poseId: 'akimbo', turn: 0.1, lean: 0 } },
      { id: 'guarded', label: 'Guarded', tier: 'uncommon', params: { poseId: 'guarded', turn: 0.18, lean: 0 } },
      { id: 'vigil', label: 'Vigil', tier: 'uncommon', params: { poseId: 'vigil', turn: 0, lean: 0 } },
      { id: 'salute', label: 'Salute', tier: 'uncommon', params: { poseId: 'salute', turn: 0.15, lean: 0 } },
      { id: 'stride', label: 'Stride', tier: 'uncommon', params: { poseId: 'stride', turn: 0.3, lean: 0.05 } },
      { id: 'hail', label: 'Hail', tier: 'rare', params: { poseId: 'hail', turn: 0.22, lean: 0.02 } },
      { id: 'brawler', label: 'Brawler', tier: 'rare', params: { poseId: 'brawler', turn: 0.2, lean: 0.015 } },
      { id: 'directive', label: 'Directive', tier: 'rare', params: { poseId: 'directive', turn: 0.25, lean: 0.01 } },
      { id: 'ascendant', label: 'Ascendant', tier: 'legendary', params: { poseId: 'ascendant', turn: 0, lean: 0 } },
    ],
  },
  {
    key: 'surface',
    label: 'Surface',
    choices: [
      { id: 'matte', label: 'Matte', tier: 'common', params: { surfaceId: 'matte', shimmer: 0 } },
      { id: 'etched', label: 'Etched', tier: 'common', params: { surfaceId: 'etched', shimmer: 0 } },
      { id: 'plated', label: 'Plated', tier: 'uncommon', params: { surfaceId: 'plated', shimmer: 0 } },
      { id: 'circuit', label: 'Circuit', tier: 'uncommon', params: { surfaceId: 'circuit', shimmer: 0.15 } },
      { id: 'molten', label: 'Molten', tier: 'rare', params: { surfaceId: 'molten', shimmer: 0.45 } },
    ],
  },
  {
    key: 'pixelMaterial',
    label: 'Pixel Material',
    choices: [
      { id: 'solid', label: 'Solid', tier: 'common', params: { mode: 0, cellMult: 1.0, bigChance: 0.08, smallChance: 0.12 } },
      { id: 'soft', label: 'Soft', tier: 'common', params: { mode: 1, cellMult: 1.08, bigChance: 0.06, smallChance: 0.1 } },
      { id: 'scanline', label: 'Scanline', tier: 'uncommon', params: { mode: 2, cellMult: 0.95, bigChance: 0.05, smallChance: 0.15 } },
      { id: 'mosaic', label: 'Mosaic', tier: 'uncommon', params: { mode: 3, cellMult: 1.05, bigChance: 0.2, smallChance: 0.08 } },
      { id: 'neon', label: 'Neon', tier: 'rare', params: { mode: 4, cellMult: 1.1, bigChance: 0.07, smallChance: 0.12 } },
    ],
  },
  {
    key: 'fragmentation',
    label: 'Fragmentation',
    choices: [
      { id: 'intact', label: 'Intact', tier: 'common', params: { frag: 0.15, detachDist: 0.06, erosionBase: 0.15, cycles: 2 } },
      { id: 'shedding', label: 'Shedding', tier: 'common', params: { frag: 0.4, detachDist: 0.12, erosionBase: 0.3, cycles: 2 } },
      { id: 'fractured', label: 'Fractured', tier: 'uncommon', params: { frag: 0.62, detachDist: 0.18, erosionBase: 0.45, cycles: 3 } },
      { id: 'splintered', label: 'Splintered', tier: 'rare', params: { frag: 0.85, detachDist: 0.26, erosionBase: 0.6, cycles: 3 } },
    ],
  },
  {
    key: 'motion',
    label: 'Motion',
    choices: [
      { id: 'still', label: 'Still', tier: 'common', params: { motionScale: 0.55, breath: 0.006, sway: 0.012, flicker: 0.1, bandAmp: 0.004, bandSpeed: 1, glitch: 0 } },
      { id: 'breathing', label: 'Breathing', tier: 'common', params: { motionScale: 1.0, breath: 0.011, sway: 0.022, flicker: 0.16, bandAmp: 0.007, bandSpeed: 2, glitch: 0 } },
      { id: 'restless', label: 'Restless', tier: 'uncommon', params: { motionScale: 1.35, breath: 0.014, sway: 0.03, flicker: 0.24, bandAmp: 0.011, bandSpeed: 2, glitch: 0.004 } },
      { id: 'surging', label: 'Surging', tier: 'rare', params: { motionScale: 1.7, breath: 0.017, sway: 0.036, flicker: 0.3, bandAmp: 0.016, bandSpeed: 3, glitch: 0.008 } },
    ],
  },
  {
    key: 'background',
    label: 'Background',
    choices: [
      { id: 'void', label: 'Void', tier: 'common', params: { bgMode: 0 } },
      { id: 'haze', label: 'Depth Haze', tier: 'common', params: { bgMode: 1 } },
      { id: 'static', label: 'Static Field', tier: 'uncommon', params: { bgMode: 3 } },
      { id: 'halo', label: 'Halo', tier: 'rare', params: { bgMode: 4 } },
    ],
  },
  {
    key: 'palette',
    label: 'Palette',
    choices: [
      { id: 'mono', label: 'Monochrome', tier: 'common', weight: 170, params: { paletteId: 'mono' } },
      { id: 'porcelain', label: 'Porcelain Inverse', tier: 'uncommon', params: { paletteId: 'porcelain' } },
      { id: 'ember', label: 'Ember Accent', tier: 'uncommon', params: { paletteId: 'ember' } },
      { id: 'ion', label: 'Ion Accent', tier: 'uncommon', params: { paletteId: 'ion' } },
      { id: 'verdigris', label: 'Verdigris Accent', tier: 'uncommon', params: { paletteId: 'verdigris' } },
      { id: 'ultraviolet', label: 'Ultraviolet Accent', tier: 'uncommon', params: { paletteId: 'ultraviolet' } },
      { id: 'cobalt', label: 'Cobalt Field', tier: 'uncommon', params: { paletteId: 'cobalt' } },
      { id: 'alabaster', label: 'Alabaster Cobalt', tier: 'uncommon', params: { paletteId: 'alabaster' } },
      { id: 'sepia', label: 'Archive Sepia', tier: 'uncommon', params: { paletteId: 'sepia' } },
      { id: 'hazard', label: 'Hazard', tier: 'uncommon', params: { paletteId: 'hazard' } },
      { id: 'blaze', label: 'Blaze', tier: 'uncommon', params: { paletteId: 'blaze' } },
      { id: 'orchid', label: 'Orchid Accent', tier: 'rare', params: { paletteId: 'orchid' } },
      { id: 'acid', label: 'Acid Accent', tier: 'rare', params: { paletteId: 'acid' } },
      { id: 'rose', label: 'Rose Accent', tier: 'rare', params: { paletteId: 'rose' } },
      { id: 'crimson', label: 'Crimson Field', tier: 'rare', params: { paletteId: 'crimson' } },
      { id: 'matrix', label: 'Signal Green', tier: 'rare', params: { paletteId: 'matrix' } },
      { id: 'amberfield', label: 'Amber Field', tier: 'rare', params: { paletteId: 'amberfield' } },
      { id: 'blueprint', label: 'Blueprint', tier: 'rare', params: { paletteId: 'blueprint' } },
      { id: 'wasp', label: 'Wasp Inverse', tier: 'rare', params: { paletteId: 'wasp' } },
      { id: 'alarm', label: 'Alarm', tier: 'rare', params: { paletteId: 'alarm' } },
      { id: 'royalvolt', label: 'Royal Volt', tier: 'rare', params: { paletteId: 'royalvolt' } },
      { id: 'gilded', label: 'Gilded', tier: 'legendary', params: { paletteId: 'gilded' } },
      { id: 'hologram', label: 'Hologram', tier: 'legendary', params: { paletteId: 'hologram' } },
    ],
  },
  {
    key: 'eyes',
    label: 'Eyes',
    choices: [
      { id: 'dim', label: 'Dim', tier: 'common', params: { intensity: 0.75, blink: 0, stretch: 0, colorId: 'palette' } },
      { id: 'glow', label: 'Glow', tier: 'common', params: { intensity: 1.5, blink: 0, stretch: 0, colorId: 'palette' } },
      { id: 'blink', label: 'Blink', tier: 'uncommon', params: { intensity: 1.4, blink: 1, stretch: 0, colorId: 'palette' } },
      { id: 'beam', label: 'Beam', tier: 'rare', params: { intensity: 1.8, blink: 0, stretch: 6, colorId: 'palette' } },
      { id: 'burning', label: 'Burning', tier: 'legendary', params: { intensity: 2.3, blink: 0, stretch: 0, colorId: 'burning' } },
    ],
  },
  {
    key: 'ambient',
    label: 'Ambient Field',
    choices: [
      { id: 'dust', label: 'Dust', tier: 'common', params: { ambientMode: 0, countMult: 1.0 } },
      { id: 'motes', label: 'Motes', tier: 'common', params: { ambientMode: 1, countMult: 0.8 } },
      { id: 'rain', label: 'Data Rain', tier: 'uncommon', params: { ambientMode: 2, countMult: 1.4 } },
      { id: 'ash', label: 'Ash Drift', tier: 'uncommon', params: { ambientMode: 3, countMult: 1.1 } },
      { id: 'swarm', label: 'Swarm', tier: 'rare', params: { ambientMode: 4, countMult: 1.6 } },
    ],
  },
  {
    key: 'mutation',
    label: 'Mutation',
    choices: [
      { id: 'none', label: 'None', tier: 'common', weight: 900, params: { mutationId: 'none' } },
      { id: 'ghostLimb', label: 'Ghost Limb', tier: 'rare', params: { mutationId: 'ghostLimb' } },
      { id: 'doubleExposure', label: 'Double Exposure', tier: 'rare', params: { mutationId: 'doubleExposure' } },
      { id: 'signalLoss', label: 'Signal Loss', tier: 'rare', params: { mutationId: 'signalLoss' } },
      { id: 'chromaticRift', label: 'Chromatic Rift', tier: 'legendary', params: { mutationId: 'chromaticRift' } },
    ],
  },
];

export const TRAIT_DEFINITION_MAP: Record<string, TraitDefinition> = Object.fromEntries(
  TRAIT_DEFINITIONS.map((d) => [d.key, d]),
);

/** Background choices, exposed for the studio's background override selector. */
export const BACKGROUND_CHOICES = TRAIT_DEFINITION_MAP['background'].choices;
