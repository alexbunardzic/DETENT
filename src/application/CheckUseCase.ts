import { classify } from '../domain/classify';
import { findInSurface } from '../domain/GuaranteeSurface';
import { applyRatchet } from '../domain/RatchetPolicy';
import { buildReport, VerdictReport } from '../domain/VerdictReport';
import { CheckPorts } from './ports';

export interface CheckRequest {
  baselineRef: string;
  candidateRef: string;
  now: Date;
}

export function check(ports: CheckPorts, request: CheckRequest): VerdictReport {
  const paths = ports.protectedSet.loadProtectedPaths();

  const baseline = ports.extractor.extract(
    ports.artifacts.read(request.baselineRef, paths),
  );
  const candidate = ports.extractor.extract(
    ports.artifacts.read(request.candidateRef, paths),
  );

  const unresolved = paths.filter(
    path =>
      findInSurface(baseline, path) === undefined &&
      findInSurface(candidate, path) === undefined,
  );

  return buildReport(
    applyRatchet(
      classify(baseline, candidate),
      ports.exceptions.loadExceptions(),
      request.now,
    ),
    unresolved,
  );
}
