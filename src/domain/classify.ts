import { isGoverned } from './Guarantee';
import { GuaranteeSurface, findInSurface } from './GuaranteeSurface';

export type VerdictKind =
  | 'Preserved'
  | 'ChangedUnderGovernance'
  | 'Removed'
  | 'Incomparable'
  | 'Added';

export interface GuaranteeVerdict {
  identity: string;
  verdict: VerdictKind;
}

export function classify(
  baseline: GuaranteeSurface,
  candidate: GuaranteeSurface,
): GuaranteeVerdict[] {
  const againstBaseline = baseline.map((g): GuaranteeVerdict => {
    const proposed = findInSurface(candidate, g.identity);
    if (proposed === undefined) {
      return { identity: g.identity, verdict: 'Removed' };
    }
    if (proposed.seal === g.seal) {
      return { identity: g.identity, verdict: 'Preserved' };
    }
    return {
      identity: g.identity,
      verdict:
        isGoverned(g) || g.classificationPower === undefined
          ? 'ChangedUnderGovernance'
          : 'Incomparable',
    };
  });

  const additions = candidate
    .filter(g => findInSurface(baseline, g.identity) === undefined)
    .map((g): GuaranteeVerdict => ({ identity: g.identity, verdict: 'Added' }));

  return [...againstBaseline, ...additions];
}
