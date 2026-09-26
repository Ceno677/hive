import { TRAIT_DEFINITIONS } from '../presets/traitDefinitions';
import { weightedPick } from './rarity';
import { Rng } from './seededRandom';
import { GENERATOR_MAJOR, GENERATOR_VERSION } from './version';
import type { EntityTraits, SelectedTrait, TraitKey } from './types';

/**
 * Deterministically derives the full trait set for a seed.
 *
 * Each trait draws from its own named RNG stream, so adding a new trait (or
 * reordering the table) never changes what existing traits roll for a seed.
 */
export function generateTraits(seed: number): EntityTraits {
  const selections = {} as Record<TraitKey, SelectedTrait>;
  for (const def of TRAIT_DEFINITIONS) {
    const rng = new Rng(seed, `v${GENERATOR_MAJOR}:trait:${def.key}`);
    const choice = weightedPick(rng, def.choices);
    selections[def.key] = {
      key: def.key,
      traitLabel: def.label,
      choiceId: choice.id,
      choiceLabel: choice.label,
      tier: choice.tier,
      params: choice.params,
    };
  }
  return { seed, generatorVersion: GENERATOR_VERSION, selections };
}
