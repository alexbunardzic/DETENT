import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FixtureRepo, fixtureRepo } from '../fixtures/gitRepo';

const ROOT = path.resolve(__dirname, '../..');
const HOOKS_DIR = path.join(ROOT, 'hooks');

const SPEC = 'CLAUDE.md';
const MANIFEST = '.detent/protected.json';
const BASELINE = {
  [SPEC]: 'rules\n',
  [MANIFEST]: JSON.stringify({ protected: [SPEC, MANIFEST] }),
};

// The hook calls `detent` from PATH. The suite builds Detent into a temp
// directory and puts a `detent` shim for that build first on PATH.
let buildDir: string;
let binDir: string;
const repos: FixtureRepo[] = [];

beforeAll(() => {
  buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'detent-build-'));
  execFileSync('npx', ['tsc', '-p', ROOT, '--outDir', buildDir], { cwd: ROOT });
  binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'detent-bin-'));
  const shim = path.join(binDir, 'detent');
  fs.writeFileSync(shim, `#!/bin/sh\nexec node "${buildDir}/src/cli/main.js" "$@"\n`);
  fs.chmodSync(shim, 0o755);
}, 120000);

afterAll(() => {
  repos.forEach(r => r.remove());
  fs.rmSync(buildDir, { recursive: true, force: true });
  fs.rmSync(binDir, { recursive: true, force: true });
});

function guardedRepo(): FixtureRepo {
  const repo = fixtureRepo({ base: BASELINE });
  repos.push(repo);
  git(repo, ['config', 'core.hooksPath', HOOKS_DIR]);
  return repo;
}

function git(repo: FixtureRepo, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repo.dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      GIT_AUTHOR_NAME: 'Detent Fixture',
      GIT_AUTHOR_EMAIL: 'fixture@detent.invalid',
      GIT_COMMITTER_NAME: 'Detent Fixture',
      GIT_COMMITTER_EMAIL: 'fixture@detent.invalid',
    },
  });
}

function commitChange(repo: FixtureRepo, file: string, content: string): void {
  fs.writeFileSync(path.join(repo.dir, file), content);
  git(repo, ['add', file]);
  git(repo, ['-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', `change ${file}`]);
}

function head(repo: FixtureRepo): string {
  return git(repo, ['rev-parse', 'HEAD']).trim();
}

test('the pre-commit hook blocks a commit that changes a protected file', () => {
  const repo = guardedRepo();

  expect(() => commitChange(repo, SPEC, 'relaxed rules\n')).toThrow(
    /CLAUDE\.md changed without an authorized exception/,
  );
  expect(head(repo)).toBe(repo.shas.base);
});

test('the pre-commit hook lets a commit through that touches no protected file', () => {
  const repo = guardedRepo();

  commitChange(repo, 'README.md', 'notes\n');

  expect(head(repo)).not.toBe(repo.shas.base);
});
