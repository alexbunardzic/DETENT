import { execFileSync } from 'child_process';
import { ArtifactSource, ArtifactSourcePort } from '../../application/ports';

// Reads artifacts from committed git objects only. The working tree and the
// index are never consulted, so a dirty checkout cannot leak into a read.
export function gitArtifactSource(repoDir: string): ArtifactSourcePort {
  const git = (args: string[]): string =>
    execFileSync('git', args, {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  const resolveCommit = (ref: string): string => {
    try {
      return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim();
    } catch {
      throw new Error(`Unknown ref: ${ref}`);
    }
  };

  const blobAt = (commit: string, path: string): string | undefined => {
    const object = `${commit}:${path}`;
    let type: string;
    try {
      type = git(['cat-file', '-t', object]).trim();
    } catch {
      return undefined;
    }
    return type === 'blob' ? git(['cat-file', 'blob', object]) : undefined;
  };

  return {
    read: (ref, paths): ArtifactSource[] => {
      const commit = resolveCommit(ref);
      return paths.map(path => ({ path, content: blobAt(commit, path) }));
    },
  };
}
