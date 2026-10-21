import { readFileSync } from 'fs';
import { ExceptionStorePort } from '../../application/ports';
import { parseExceptionStore } from '../config/detentFiles';

function readIfPresent(file: string): string | undefined {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
}

export function fileExceptionStore(storePath: string): ExceptionStorePort {
  return { loadExceptions: () => parseExceptionStore(readIfPresent(storePath)) };
}
