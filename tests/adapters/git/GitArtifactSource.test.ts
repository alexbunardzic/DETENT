import * as fs from 'fs';
import * as path from 'path';
import { gitArtifactSource } from '../../../src/adapters/git/GitArtifactSource';
import { artifactSourceContract, CONTRACT_HISTORY } from '../../contracts/artifactSourceContract';
import { FixtureRepo, fixtureRepo } from '../../fixtures/gitRepo';

const repos: FixtureRepo[] = [];

function repoFor(history: Parameters<typeof fixtureRepo>[0]): FixtureRepo {
  const repo = fixtureRepo(history);
  repos.push(repo);
  return repo;
}

afterAll(() => repos.forEach(r => r.remove()));

artifactSourceContract('git', history => {
  const repo = repoFor(history);
  return {
    port: gitArtifactSource(repo.dir),
    ref: label => repo.shas[label],
    unknownRef: 'no-such-ref',
  };
});

describe('git artifact source', () => {
  test('reads committed content, not uncommitted edits in the working tree', () => {
    const repo = repoFor(CONTRACT_HISTORY);
    fs.writeFileSync(path.join(repo.dir, 'CLAUDE.md'), 'dirty edit\n');

    const [source] = gitArtifactSource(repo.dir).read('HEAD', ['CLAUDE.md']);

    expect(source.content).toBe('rules v2\n');
  });

  test('reports a directory at a protected path as undefined content', () => {
    const repo = repoFor(CONTRACT_HISTORY);

    const [source] = gitArtifactSource(repo.dir).read(repo.shas.baseline, ['docs']);

    expect(source.content).toBeUndefined();
  });
});
