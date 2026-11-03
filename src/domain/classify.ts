import { isGoverned } from './Guarantee';
import { GuaranteeSurface, findInSurface } from './GuaranteeSurface';

export type VerdictKind =
  | 'Preserved'
  | 'ChangedUnderGovernance'
  | 'Removed'
  | 'Incomparable'
  | 'Added'
  | 'Moved';

// A seal of null means the guarantee is absent on that side.
export interface GuaranteeVerdict {
  identity: string;
  verdict: VerdictKind;
  movedTo?: string;
  baselineSeal?: string | null;
  candidateSeal?: string | null;
}

// A baseline guarantee missing from the candidate whose seal reappears at a
// new identity was moved, not removed. More than one such identity is
// ambiguous, so none of them counts as the move.
function moveTarget(
  g: { seal?: string },
  baseline: GuaranteeSurface,
  candidate: GuaranteeSurface,
): string | undefined {
  const matches = candidate.filter(
    c => c.seal === g.seal && findInSurface(baseline, c.identity) === undefined,
  );
  return matches.length === 1 ? matches[0].identity : undefined;
}

export function classify(
  baseline: GuaranteeSurface,
  candidate: GuaranteeSurface,
): GuaranteeVerdict[] {
  const movedTo = new Map<string, string>();
  for (const g of baseline) {
    if (findInSurface(candidate, g.identity) !== undefined) continue;
    const target = moveTarget(g, baseline, candidate);
    if (target !== undefined) movedTo.set(g.identity, target);
  }
  const moveTargets = new Set(movedTo.values());

  const againstBaseline = baseline.map((g): GuaranteeVerdict => {
    const proposed = findInSurface(candidate, g.identity);
    const baselineSeal = g.seal ?? null;
    if (proposed === undefined) {
      const target = movedTo.get(g.identity);
      if (target !== undefined) {
        return { identity: g.identity, verdict: 'Moved', movedTo: target, baselineSeal, candidateSeal: g.seal ?? null };
      }
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
    .filter(g => findInSurface(baseline, g.identity) === undefined && !moveTargets.has(g.identity))
    .map((g): GuaranteeVerdict => ({
      identity: g.identity,
      verdict: 'Added',
      baselineSeal: null,
      candidateSeal: g.seal ?? null,
    }));

  return [...againstBaseline, ...additions];
}
