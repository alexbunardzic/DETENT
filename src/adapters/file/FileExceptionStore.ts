import { readFileSync } from 'fs';
import { ExceptionStorePort } from '../../application/ports';
import { Exception } from '../../domain/RatchetPolicy';

function isSeal(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length > 0);
}

function toException(entry: unknown): Exception | undefined {
  if (typeof entry !== 'object' || entry === null) return undefined;
  const { identity, baselineSeal, candidateSeal, expiresAt } = entry as Record<string, unknown>;

  if (typeof identity !== 'string' || identity.length === 0) return undefined;
  if (!isSeal(baselineSeal) || !isSeal(candidateSeal)) return undefined;
  if (baselineSeal === null && candidateSeal === null) return undefined;

  const exception: Exception = { identity, baselineSeal, candidateSeal };
  if (expiresAt === undefined) return exception;
  if (typeof expiresAt !== 'string') return undefined;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return { ...exception, expiresAt: date };
}

// Fails closed: a store that is missing, unreadable or malformed yields no
// exceptions, and one invalid entry voids the whole store. A damaged store
// can only make the check stricter, never more permissive.
export function fileExceptionStore(storePath: string): ExceptionStorePort {
  return {
    loadExceptions: () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(storePath, 'utf8'));
      } catch {
        return [];
      }
      const entries = (parsed as { exceptions?: unknown } | null)?.exceptions;
      if (!Array.isArray(entries)) return [];

      const exceptions = entries.map(toException);
      return exceptions.every((e): e is Exception => e !== undefined) ? exceptions : [];
    },
  };
}
