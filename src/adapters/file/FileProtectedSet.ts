import { readFileSync } from 'fs';
import { ProtectedSetPort } from '../../application/ports';
import { parseProtectedManifest } from '../config/detentFiles';

function readIfPresent(file: string): string | undefined {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
}

export function fileProtectedSet(manifestPath: string): ProtectedSetPort {
  return {
    loadProtectedPaths: () => parseProtectedManifest(readIfPresent(manifestPath), manifestPath),
  };
}
