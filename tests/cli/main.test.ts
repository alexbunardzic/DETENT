import { proseExtractor } from '../../src/adapters/prose/ProseExtractor';
import { run } from '../../src/cli/main';
import { FixtureRepo, fixtureRepo } from '../fixtures/gitRepo';

const SPEC = 'md2html-SPEC.md';
const MANIFEST = '.detent/protected.json';
const STORE = '.detent/exceptions.json';

const SPEC_V1 = '| E-17 | Heading text that is a single character |\n| E-18 | Heading text with only digits |\n';
const SPEC_V2 = '| E-18 | Heading text with only digits |\n';
const PROTECTING_ALL = JSON.stringify({ protected: [SPEC, MANIFEST] });

const BASELINE = { [SPEC]: SPEC_V1, [MANIFEST]: PROTECTING_ALL };

const repos: FixtureRepo[] = [];
afterAll(() => repos.forEach(r => r.remove()));

function repoWith(
  candidate: Record<string, string>,
  baseline: Record<string, string> = BASELINE,
): FixtureRepo {
  const repo = fixtureRepo({ base: baseline, cand: candidate });
  repos.push(repo);
  return repo;
}

function sealOf(content: string): string {
  const [g] = proseExtractor().extract([{ path: 'x', content }]);
  return g.seal as string;
}

function detent(argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = run(argv, { stdout: t => out.push(t), stderr: t => err.push(t) });
  return { code, stdout: out.join('\n'), stderr: err.join('\n') };
}

function checkRepo(repo: FixtureRepo, baseline = repo.shas.base, candidate = repo.shas.cand) {
  return detent(['check', '--repo', repo.dir, '--baseline', baseline, '--candidate', candidate]);
}

test('exits 0 when no protected file changed', () => {
  const result = checkRepo(repoWith({ ...BASELINE, 'README.md': 'unrelated\n' }));

  expect(result.code).toBe(0);
  expect(result.stdout).toBe('Detent: no drift detected');
});

test('exits 1 and names the file when a protected spec changed without an exception', () => {
  const result = checkRepo(repoWith({ ...BASELINE, [SPEC]: SPEC_V2 }));

  expect(result.code).toBe(1);
  expect(result.stdout).toContain('Detent: blocked');
  expect(result.stdout).toContain(`${SPEC} changed without an authorized exception`);
});

test('the blocking report shows the seals an exception for the change must name', () => {
  const result = checkRepo(repoWith({ ...BASELINE, [SPEC]: SPEC_V2 }));

  expect(result.stdout).toContain(`baselineSeal:  ${sealOf(SPEC_V1)}`);
  expect(result.stdout).toContain(`candidateSeal: ${sealOf(SPEC_V2)}`);
});

test('exits 0 when the candidate carries an exception for that exact change', () => {
  const exception = { identity: SPEC, baselineSeal: sealOf(SPEC_V1), candidateSeal: sealOf(SPEC_V2) };
  const result = checkRepo(
    repoWith({ ...BASELINE, [SPEC]: SPEC_V2, [STORE]: JSON.stringify({ exceptions: [exception] }) }),
  );

  expect(result.code).toBe(0);
  expect(result.stdout).toContain(`${SPEC} changed under an authorized exception`);
});

test('an exception for a different edit leaves the change blocked', () => {
  const exception = { identity: SPEC, baselineSeal: sealOf(SPEC_V1), candidateSeal: sealOf('other\n') };
  const result = checkRepo(
    repoWith({ ...BASELINE, [SPEC]: SPEC_V2, [STORE]: JSON.stringify({ exceptions: [exception] }) }),
  );

  expect(result.code).toBe(1);
});

test('unprotecting the spec in the same commit does not unprotect it', () => {
  const result = checkRepo(
    repoWith({ [SPEC]: SPEC_V2, [MANIFEST]: JSON.stringify({ protected: [] }) }),
  );

  expect(result.code).toBe(1);
  expect(result.stdout).toContain(`${SPEC} changed without an authorized exception`);
  expect(result.stdout).toContain(`${MANIFEST} changed without an authorized exception`);
});

test('exits 2 when a ref does not exist', () => {
  const repo = repoWith(BASELINE);
  const result = checkRepo(repo, repo.shas.base, 'no-such-ref');

  expect(result.code).toBe(2);
  expect(result.stderr).toContain('Unknown ref: no-such-ref');
});

test('exits 2 when the baseline has no protected-set manifest', () => {
  const result = checkRepo(repoWith({ [SPEC]: SPEC_V2 }, { [SPEC]: SPEC_V1 }));

  expect(result.code).toBe(2);
  expect(result.stderr).toContain(`Protected-set manifest ${MANIFEST}`);
});

test('exits 2 with usage when a ref argument is missing', () => {
  const result = detent(['check', '--baseline', 'HEAD']);

  expect(result.code).toBe(2);
  expect(result.stderr).toContain('Usage: detent check');
});

test('exits 2 with usage for an unknown command', () => {
  const result = detent(['verify']);

  expect(result.code).toBe(2);
  expect(result.stderr).toContain('Usage: detent check');
});
