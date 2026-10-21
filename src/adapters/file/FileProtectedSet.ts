import { readFileSync } from 'fs';
import { ProtectedSetPort } from '../../application/ports';

// Fails closed: a manifest that is missing, unreadable or malformed raises an
// error. It never degrades to an empty set, which would unprotect everything.
export function fileProtectedSet(manifestPath: string): ProtectedSetPort {
  const invalid = (why: string) =>
    new Error(`Protected-set manifest ${manifestPath} ${why}`);

  return {
    loadProtectedPaths: () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch (e) {
        throw invalid(`could not be read as JSON: ${(e as Error).message}`);
      }
      const paths = (parsed as { protected?: unknown } | null)?.protected;
      if (!Array.isArray(paths)) {
        throw invalid('has no "protected" list');
      }
      if (!paths.every(p => typeof p === 'string' && p.length > 0)) {
        throw invalid('lists an entry that is not a non-empty string');
      }
      return paths as string[];
    },
  };
}
