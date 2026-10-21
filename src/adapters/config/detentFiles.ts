import { Exception } from '../../domain/RatchetPolicy';

// Parsers for the two .detent files, shared by every adapter that reads them
// so that each source (filesystem, git ref) applies the same rules.

// Fails closed: a manifest that is missing or malformed raises an error. It
// never degrades to an empty set, which would unprotect everything.
export function parseProtectedManifest(text: string | undefined, source: string): string[] {
  const invalid = (why: string) => new Error(`Protected-set manifest ${source} ${why}`);

  if (text === undefined) throw invalid('was not found');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
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
}

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

// Fails closed: a store that is missing or malformed yields no exceptions,
// and one invalid entry voids the whole store. A damaged store can only make
// the check stricter, never more permissive.
export function parseExceptionStore(text: string | undefined): Exception[] {
  if (text === undefined) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const entries = (parsed as { exceptions?: unknown } | null)?.exceptions;
  if (!Array.isArray(entries)) return [];

  const exceptions = entries.map(toException);
  return exceptions.every((e): e is Exception => e !== undefined) ? exceptions : [];
}
