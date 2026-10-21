import { isGoverned } from './Guarantee';
import { GuaranteeSurface, findInSurface } from './GuaranteeSurface';

export type VerdictKind =
  | 'Preserved'
  | 'ChangedUnderGovernance'
  | 'Removed'
  | 'Incomparable'
  | 'Added';

// A seal of null means the guarantee is absent on that side.
export interface GuaranteeVerdict {
  identity: string;
  verdict: VerdictKind;
  baselineSeal?: string | null;
  candidateSeal?: string | null;
}

export function classify(
  baseline: GuaranteeSurface,
  candidate: GuaranteeSurface,
): GuaranteeVerdict[] {
  const againstBaseline = baseline.map((g): GuaranteeVerdict => {
    const proposed = findInSurface(candidate, g.identity);
    const baselineSeal = g.seal ?? null;
    if (proposed === undefined) {
      return { identity: g.identity, verdict: 'Removed', baselineSeal, candidateSeal: null };
    }
    const candidateSeal = proposed.seal ?? null;
    if (proposed.seal === g.seal) {
      return { identity: g.identity, verdict: 'Preserved', baselineSeal, candidateSeal };
    }
    return {
      identity: g.identity,
      verdict:
        isGoverned(g) || g.classificationPower === undefined
          ? 'ChangedUnderGovernance'
          : 'Incomparable',
      baselineSeal,
      candidateSeal,
    };
  });

  const additions = candidate
    .filter(g => findInSurface(baseline, g.identity) === undefined)
    .map((g): GuaranteeVerdict => ({
      identity: g.identity,
      verdict: 'Added',
      baselineSeal: null,
      candidateSeal: g.seal ?? null,
    }));

  return [...againstBaseline, ...additions];
}
