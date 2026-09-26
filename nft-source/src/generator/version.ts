/**
 * Version discipline: until a collection is frozen/minted, MINOR bumps may
 * adjust trait tables (which can re-roll some traits for a seed). Once frozen,
 * any change that would alter an existing seed's artwork requires a MAJOR
 * bump — the major is mixed into every RNG stream name, so old seeds stay
 * reproducible forever against the old major.
 */
export const GENERATOR_VERSION = '1.5.0';
export const GENERATOR_MAJOR = GENERATOR_VERSION.split('.')[0];
