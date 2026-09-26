export type TraitTier = 'common' | 'uncommon' | 'rare' | 'legendary';

export type TraitKey =
  | 'body'
  | 'head'
  | 'pose'
  | 'surface'
  | 'pixelMaterial'
  | 'fragmentation'
  | 'motion'
  | 'background'
  | 'palette'
  | 'eyes'
  | 'ambient'
  | 'mutation';

export type TraitParams = Record<string, number | string | boolean>;

export interface TraitChoice {
  id: string;
  label: string;
  tier: TraitTier;
  /** Explicit weight override; when absent, the tier's default weight applies. */
  weight?: number;
  params: TraitParams;
}

export interface TraitDefinition {
  key: TraitKey;
  label: string;
  choices: TraitChoice[];
}

export interface SelectedTrait {
  key: TraitKey;
  traitLabel: string;
  choiceId: string;
  choiceLabel: string;
  tier: TraitTier;
  params: TraitParams;
}

export interface EntityTraits {
  seed: number;
  generatorVersion: string;
  selections: Record<TraitKey, SelectedTrait>;
}

export type QualityId = 'draft' | 'preview' | 'high' | 'export';

export interface QualityPreset {
  id: QualityId;
  label: string;
  /** Multiplier on the base sampling cell size (smaller cell = more fragments). */
  cellScale: number;
  /** Multiplier on ambient particle count. */
  ambientScale: number;
}

export interface BuildOptions {
  quality: QualityId;
  /** UI pixel-size multiplier; 1 = seed default. */
  pixelScale: number;
}

/** Flat typed-array bundle for the instanced pixel body. */
export interface ParticleBuffers {
  count: number;
  home: Float32Array; // xyz
  size: Float32Array; // 1
  bright: Float32Array; // 1
  phase: Float32Array; // 1
  suscept: Float32Array; // 1
  region: Float32Array; // 1
  detach: Float32Array; // xy
  erode: Float32Array; // 1
  edge: Float32Array; // 1
  accent: Float32Array; // 1 (0 none, 1 accent, 2 rift-red, 3 rift-cyan)
}

export interface AmbientBuffers {
  count: number;
  center: Float32Array; // xy
  radius: Float32Array;
  speed: Float32Array; // signed integer cycles per loop
  phase0: Float32Array;
  size: Float32Array;
  bright: Float32Array;
}

export interface BodyAnchors {
  neckPivot: [number, number];
  hipPivot: [number, number];
  headCenter: [number, number];
  eyeL: [number, number];
  eyeR: [number, number];
}

export interface BuiltEntity {
  seed: number;
  particles: ParticleBuffers;
  ambient: AmbientBuffers;
  anchors: BodyAnchors;
}
