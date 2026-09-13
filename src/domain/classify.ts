import { GuaranteeSurface, findInSurface } from './GuaranteeSurface';

export type VerdictKind = 'Preserved' | 'ChangedUnderGovernance';

export interface GuaranteeVerdict {
  identity: string;
  verdict: VerdictKind;
}

export function classify(
  baseline: GuaranteeSurface,
  candidate: GuaranteeSurface,
): GuaranteeVerdict[] {
  return baseline.map((g): GuaranteeVerdict => ({
    identity: g.identity,
    verdict:
      findInSurface(candidate, g.identity)?.seal === g.seal
        ? 'Preserved'
        : 'ChangedUnderGovernance',
  }));
}
