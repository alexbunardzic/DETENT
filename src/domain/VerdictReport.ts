import { VerdictKind } from './classify';
import { RatchetedVerdict, isDriftPositive } from './RatchetPolicy';

export interface ReportItem {
  identity: string;
  verdict?: VerdictKind;
  explanation: string;
  baselineSeal?: string | null;
  candidateSeal?: string | null;
}

export interface VerdictReport {
  blocked: boolean;
  blocking: ReportItem[];
  warnings: ReportItem[];
  authorized: ReportItem[];
}

function explain(
  identity: string,
  verdict: VerdictKind,
  authorized: boolean,
): string {
  if (verdict === 'Incomparable') {
    return `${identity} changed in a way that could not be compared`;
  }
  const what = verdict === 'Removed' ? 'was removed' : 'changed';
  const how = authorized
    ? 'under an authorized exception'
    : 'without an authorized exception';
  return `${identity} ${what} ${how}`;
}

function toItem(v: RatchetedVerdict): ReportItem {
  return {
    identity: v.identity,
    verdict: v.verdict,
    explanation: explain(v.identity, v.verdict, !v.blocking),
    baselineSeal: v.baselineSeal,
    candidateSeal: v.candidateSeal,
  };
}

function unresolvedItem(identity: string): ReportItem {
  return {
    identity,
    explanation: `${identity} is declared protected but was not found in either ref`,
  };
}

export function buildReport(
  verdicts: readonly RatchetedVerdict[],
  unresolved: readonly string[] = [],
): VerdictReport {
  const blocking = verdicts.filter(v => v.blocking).map(toItem);
  const warnings = [
    ...verdicts.filter(v => !v.blocking && v.verdict === 'Incomparable').map(toItem),
    ...unresolved.map(unresolvedItem),
  ];
  const authorized = verdicts
    .filter(v => !v.blocking && isDriftPositive(v.verdict))
    .map(toItem);

  return { blocked: blocking.length > 0, blocking, warnings, authorized };
}

// Under a blocking item, the seals are printed with the same names the
// exceptions file uses, so an owner can authorize that exact change.
function appendSection(
  lines: string[],
  heading: string,
  items: readonly ReportItem[],
  showSeals = false,
): void {
  if (items.length === 0) return;
  lines.push('', heading);
  for (const item of items) {
    lines.push(`  - ${item.explanation}`);
    if (showSeals && item.baselineSeal !== undefined && item.candidateSeal !== undefined) {
      lines.push(`      baselineSeal:  ${item.baselineSeal}`);
      lines.push(`      candidateSeal: ${item.candidateSeal}`);
    }
  }
}

function headline(report: VerdictReport): string {
  if (report.blocked) return 'Detent: blocked';
  if (report.warnings.length > 0 || report.authorized.length > 0) {
    return 'Detent: no blocking drift';
  }
  return 'Detent: no drift detected';
}

export function renderHuman(report: VerdictReport): string {
  const lines = [headline(report)];
  appendSection(lines, 'Blocking:', report.blocking, true);
  appendSection(lines, 'Warnings:', report.warnings);
  appendSection(lines, 'Authorized:', report.authorized);
  return lines.join('\n');
}
