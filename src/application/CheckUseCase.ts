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
  // The baseline manifest decides what is protected. Paths that only the
  // candidate manifest lists are read from the candidate so that a protected
  // file moved to one of them can be recognized as Moved.
  const candidatePaths = [
    ...new Set([...paths, ...(ports.candidateProtectedSet?.loadProtectedPaths() ?? [])]),
  ];

  const baseline = ports.extractor.extract(
    ports.artifacts.read(request.baselineRef, paths),
  );
  const candidate = ports.extractor.extract(
    ports.artifacts.read(request.candidateRef, candidatePaths),
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
