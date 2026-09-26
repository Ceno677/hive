import type { Rng } from './seededRandom';
import type { TraitChoice, TraitTier } from './types';

/**
 * Central rarity configuration. A choice without an explicit `weight` uses its
 * tier's default. Tweak these to rebalance the whole collection at once.
 */
export const TIER_WEIGHTS: Record<TraitTier, number> = {
  common: 100,
  uncommon: 38,
  rare: 11,
  legendary: 2.5,
};

export function choiceWeight(choice: TraitChoice): number {
  return choice.weight ?? TIER_WEIGHTS[choice.tier];
}

export function totalWeight(choices: readonly TraitChoice[]): number {
  return choices.reduce((sum, c) => sum + choiceWeight(c), 0);
}

/** Exact probability of a choice being selected — used by tests and the UI. */
export function expectedProbability(choices: readonly TraitChoice[], id: string): number {
  const target = choices.find((c) => c.id === id);
  if (!target) return 0;
  return choiceWeight(target) / totalWeight(choices);
}

export function weightedPick(rng: Rng, choices: readonly TraitChoice[]): TraitChoice {
  const total = totalWeight(choices);
  let r = rng.float() * total;
  for (const choice of choices) {
    r -= choiceWeight(choice);
    if (r < 0) return choice;
  }
  return choices[choices.length - 1];
}

const TIER_RANK: Record<TraitTier, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

export function tierRank(tier: TraitTier): number {
  return TIER_RANK[tier];
}
