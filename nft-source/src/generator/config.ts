import type { QualityId, QualityPreset } from './types';

/** Base sampling cell size in world units (world is a ~2.2-unit square). */
export const BASE_CELL = 0.01;

/** Region of world space scanned for body fragments. */
export const SAMPLE_BOUNDS = { minX: -0.78, maxX: 0.78, minY: -1.14, maxY: 1.05 };

/** Half-extent of the square orthographic view. */
export const VIEW_EXTENT = 1.1;

export const QUALITY_PRESETS: Record<QualityId, QualityPreset> = {
  draft: { id: 'draft', label: 'Draft', cellScale: 1.7, ambientScale: 0.35 },
  preview: { id: 'preview', label: 'Preview', cellScale: 1.25, ambientScale: 0.7 },
  high: { id: 'high', label: 'High', cellScale: 1.0, ambientScale: 1.0 },
  export: { id: 'export', label: 'Export', cellScale: 0.8, ambientScale: 1.2 },
};
