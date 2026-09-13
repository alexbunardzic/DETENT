import { GuaranteeVerdict, VerdictKind } from './classify';

export interface Exception {
  identity: string;
  expiresAt?: Date;
}

export interface RatchetedVerdict extends GuaranteeVerdict {
  blocking: boolean;
}

const DRIFT_POSITIVE: readonly VerdictKind[] = ['ChangedUnderGovernance', 'Removed'];

function isDriftPositive(verdict: VerdictKind): boolean {
  return DRIFT_POSITIVE.includes(verdict);
}

function covers(e: Exception, identity: string, now: Date): boolean {
  if (e.identity !== identity) return false;
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
      !exceptions.some(e => covers(e, v.identity, now)),
  }));
}
