import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FixtureHistory } from '../contracts/artifactSourceContract';

export interface FixtureRepo {
  dir: string;
  shas: Record<string, string>;
  remove(): void;
}

function git(dir: string, args: string[]): string {
  return execFileSync(
    'git',
    ['-c', 'user.name=Detent Fixture', '-c', 'user.email=fixture@detent.invalid',
      '-c', 'commit.gpgsign=false', ...args],
    { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

// Builds a throwaway repository with one commit per snapshot in the history.
export function fixtureRepo(history: FixtureHistory): FixtureRepo {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detent-git-'));
  git(dir, ['init', '--quiet']);

  const shas: Record<string, string> = {};
  for (const [label, files] of Object.entries(history)) {
    git(dir, ['rm', '-r', '--quiet', '--cached', '--ignore-unmatch', '.']);
    for (const entry of fs.readdirSync(dir)) {
      if (entry !== '.git') fs.rmSync(path.join(dir, entry), { recursive: true });
    }
    for (const [file, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), content);
    }
    git(dir, ['add', '--all']);
    git(dir, ['commit', '--quiet', '--allow-empty', '-m', label]);
    shas[label] = git(dir, ['rev-parse', 'HEAD']).trim();
  }

  return {
    dir,
    shas,
    remove: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}
