import { GuaranteeVerdict, VerdictKind } from './classify';

// An exception authorizes one exact change: this identity, going from this
// baseline seal to this candidate seal. A null candidate seal authorizes
// removal.
export interface Exception {
  identity: string;
  baselineSeal: string | null;
  candidateSeal: string | null;
  expiresAt?: Date;
}

export interface RatchetedVerdict extends GuaranteeVerdict {
  blocking: boolean;
}

const DRIFT_POSITIVE: readonly VerdictKind[] = ['ChangedUnderGovernance', 'Removed'];

export function isDriftPositive(verdict: VerdictKind): boolean {
  return DRIFT_POSITIVE.includes(verdict);
}

function covers(e: Exception, v: GuaranteeVerdict, now: Date): boolean {
  if (e.identity !== v.identity) return false;
  if (e.baselineSeal !== v.baselineSeal || e.candidateSeal !== v.candidateSeal) {
    return false;
  }
  return e.expiresAt === undefined || e.expiresAt.getTime() > now.getTime();
}

export function applyRatchet(
  verdicts: readonly GuaranteeVerdict[],
  exceptions: readonly Exception[],
  now: Date,
): RatchetedVerdict[] {
  return verdicts.map(v => ({
    ...v,
    blocking:
      isDriftPositive(v.verdict) &&
      !exceptions.some(e => covers(e, v, now)),
  }));
}
