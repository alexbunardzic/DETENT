#!/usr/bin/env node
import { parseArgs } from 'util';
import { gitArtifactSource } from '../adapters/git/GitArtifactSource';
import { proseExtractor } from '../adapters/prose/ProseExtractor';
import { refExceptionStore, refProtectedSet } from '../adapters/ref/RefDetentFiles';
import { CheckPorts } from '../application/ports';
import { check } from '../application/CheckUseCase';
import { renderHuman, renderJson } from '../domain/VerdictReport';

// Composition root: the only module that wires concrete adapters to ports.

const MANIFEST_PATH = '.detent/protected.json';
const EXCEPTIONS_PATH = '.detent/exceptions.json';

const USAGE =
  'Usage: detent check --baseline <ref> --candidate <ref> [--repo <dir>] [--format human|json]';

export const EXIT_ALLOWED = 0;
export const EXIT_BLOCKED = 1;
export const EXIT_ERROR = 2;

export interface CliOutput {
  stdout(text: string): void;
  stderr(text: string): void;
}

interface CheckArgs {
  repo: string;
  baseline: string;
  candidate: string;
  format: 'human' | 'json';
}

function parseCheckArgs(argv: readonly string[]): CheckArgs | undefined {
  const [command, ...rest] = argv;
  if (command !== 'check') return undefined;
  try {
    const { values } = parseArgs({
      args: [...rest],
      options: {
        repo: { type: 'string', default: '.' },
        baseline: { type: 'string' },
        candidate: { type: 'string' },
        format: { type: 'string', default: 'human' },
      },
      strict: true,
      allowPositionals: false,
    });
    if (!values.baseline || !values.candidate) return undefined;
    if (values.format !== 'human' && values.format !== 'json') return undefined;
    return {
      repo: values.repo as string,
      baseline: values.baseline,
      candidate: values.candidate,
      format: values.format,
    };
  } catch {
    return undefined;
  }
}

// The protected set is read from the baseline, the trusted side, so a
// candidate cannot unprotect a file by editing the manifest in the same
// change. The candidate manifest only adds paths to read from the candidate,
// so that a protected file moved to one of them is reported as Moved.
// Exceptions are read from the candidate, which is where a pull request adds
// one for owner review.
function portsFor(args: CheckArgs): CheckPorts {
  const artifacts = gitArtifactSource(args.repo);
  return {
    protectedSet: refProtectedSet(artifacts, args.baseline, MANIFEST_PATH),
    candidateProtectedSet: refProtectedSet(artifacts, args.candidate, MANIFEST_PATH),
    artifacts,
    extractor: proseExtractor(),
    exceptions: refExceptionStore(artifacts, args.candidate, EXCEPTIONS_PATH),
  };
}

export function run(argv: readonly string[], output: CliOutput, now: Date = new Date()): number {
  const args = parseCheckArgs(argv);
  if (args === undefined) {
    output.stderr(USAGE);
    return EXIT_ERROR;
  }

  try {
    const report = check(portsFor(args), {
      baselineRef: args.baseline,
      candidateRef: args.candidate,
      now,
    });
    output.stdout(
      args.format === 'json'
        ? renderJson(report, { baseline: args.baseline, candidate: args.candidate })
        : renderHuman(report),
    );
    return report.blocked ? EXIT_BLOCKED : EXIT_ALLOWED;
  } catch (e) {
    output.stderr(`Detent: error: ${(e as Error).message}`);
    return EXIT_ERROR;
  }
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2), {
    stdout: text => process.stdout.write(`${text}\n`),
    stderr: text => process.stderr.write(`${text}\n`),
  });
}
